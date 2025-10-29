/**
 * useISSLocations Hook
 * 
 * Demonstrates the power of Somnia Data Streams reactivity:
 * 1. Initial fetch of historical ISS positions
 * 2. Real-time WebSocket subscription with ZERO-FETCH ethCalls pattern
 * 3. Automatic deduplication by nonce
 * 4. Reconnection handling
 * 
 * Key Learning: Separate HTTP (fetch) and WebSocket (subscribe) clients
 * to avoid SocketClosedError when tabs sleep
 */
'use client'

import { useEffect, useRef } from 'react'
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import { ISS_SCHEMA_ID, PUBLISHER_ADDRESS } from '@/lib/constants'
import { decodeISSLocation } from '@/lib/iss-encoding'
import { getClientSDK, getClientFetchSDK } from '@/lib/client-sdk'
import type { ISSLocation } from '@/types/iss'

interface UseISSLocationsProps {
  onNewLocation: (location: ISSLocation) => void
  onLocationsUpdate: (locations: ISSLocation[]) => void
}

/**
 * React hook for fetching and subscribing to ISS locations
 * 
 * Features:
 * - Initial fetch of all historical positions using HTTP client
 * - Real-time WebSocket subscriptions with zero-fetch ethCalls
 * - Automatic reconnection on errors
 * - Deduplication by nonce
 * - Tab visibility handling
 */
export function useISSLocations({
  onNewLocation,
  onLocationsUpdate
}: UseISSLocationsProps) {
  const onNewLocationRef = useRef(onNewLocation)
  const onLocationsUpdateRef = useRef(onLocationsUpdate)

  // Keep refs updated
  useEffect(() => {
    onNewLocationRef.current = onNewLocation
  }, [onNewLocation])

  useEffect(() => {
    onLocationsUpdateRef.current = onLocationsUpdate
  }, [onLocationsUpdate])

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined
    let isSubscribed = false
    let currentLocations: ISSLocation[] = []

    /**
     * Fetch all historical ISS positions from blockchain
     * Uses HTTP client (not WebSocket) to avoid connection issues
     */
    async function fetchInitialLocations(): Promise<ISSLocation[]> {
      console.log('📥 Fetching ISS position history from blockchain...')
      
      let sdk
      try {
        sdk = getClientFetchSDK() // HTTP client for fetching
      } catch (error) {
        console.error('❌ Failed to create fetch SDK:', error)
        return []
      }
      
      try {
        // Get total count of positions published
        const total = await sdk.streams.totalPublisherDataForSchema(
          ISS_SCHEMA_ID,
          PUBLISHER_ADDRESS
        )
        
        if (!total || total === 0n) {
          console.log('ℹ️  No ISS positions on-chain yet')
          console.log('   Run the oracle to publish first position: npm run test-oracle')
          return []
        }
        
        console.log(`📊 Found ${total} positions on-chain`)
        
        // Only fetch the last 100 positions for better performance
        const fetchCount = total > 100n ? 100n : total
        const startIndex = total > 100n ? total - 100n : 0n
        
        console.log(`⏳ Fetching last ${fetchCount} positions (indices ${startIndex} to ${total - 1n})`)
        
        const locations: ISSLocation[] = []
        
        // NOTE: getBetweenRange has a bug with schema inheritance (mixes indices with field values)
        // Using getAtIndex instead - less efficient but actually works
        for (let i = startIndex; i < total; i++) {
          try {
            const data = await sdk.streams.getAtIndex(
              ISS_SCHEMA_ID,
              PUBLISHER_ADDRESS,
              i
            )
            
            // getAtIndex returns raw bytes when no schema lookup provided
            if (data && Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
              const location = decodeISSLocation(data[0] as `0x${string}`)
              locations.push(location)
              
              if (locations.length <= 3 || locations.length === Number(fetchCount)) {
                console.log(`   Position ${i}: nonce ${location.nonce}, lat ${location.latitude.toFixed(2)}, lon ${location.longitude.toFixed(2)}`)
              }
            }
          } catch (error) {
            console.error(`❌ Failed to fetch position ${i}:`, error)
          }
        }
        
        // Filter out invalid positions (0,0 coordinates or epoch 0)
        const validLocations = locations.filter(l => 
          l.latitude !== 0 && 
          l.longitude !== 0 && 
          l.timestamp > 0
        )
        
        console.log(`🔍 Filtered: ${locations.length} total → ${validLocations.length} valid positions`)
        
        // Sort by timestamp (oldest first)
        validLocations.sort((a, b) => a.timestamp - b.timestamp)
        
        console.log(`✅ Loaded ${validLocations.length} valid historical positions`)
        if (validLocations.length > 0) {
          const oldest = new Date(validLocations[0].timestamp).toISOString()
          const newest = new Date(validLocations[validLocations.length - 1].timestamp).toISOString()
          console.log(`   Oldest: ${oldest}`)
          console.log(`   Newest: ${newest}`)
          console.log(`   Nonce range: ${validLocations[0].nonce} - ${validLocations[validLocations.length - 1].nonce}`)
          console.log(`   Sample first position:`, validLocations[0])
          console.log(`   Sample last position:`, validLocations[validLocations.length - 1])
        } else {
          console.warn('⚠️  No valid locations loaded from blockchain!')
        }
        return validLocations
      } catch (error) {
        console.error('❌ Failed to fetch initial locations:', error)
        return []
      }
    }

    /**
     * Set up WebSocket subscription with ZERO-FETCH ethCalls pattern
     * 
     * Key Innovation: When ISSPositionUpdated event fires, we bundle
     * getLastPublishedDataForSchema in the ethCall, getting the latest
     * position without any additional RPC calls!
     */
    async function setupSubscription() {
      try {
        console.log('🔌 Setting up WebSocket subscription...')
        
        const sdk = getClientSDK() // WebSocket client for subscriptions
        
        // Get protocol info for constructing ethCalls
        const protocolInfoResult = await sdk.streams.getSomniaDataStreamsProtocolInfo()
        
        if (!protocolInfoResult || protocolInfoResult instanceof Error) {
          throw new Error('Failed to get protocol info')
        }
        
        const protocolInfo = protocolInfoResult
        
        console.log('📋 Protocol Address:', protocolInfo.address)
        console.log('🎯 Subscribing to: ISSPositionUpdated')
        console.log('⚡ Using zero-fetch ethCall pattern')
        
        // Subscribe with ethCall that bundles latest position
        const sub = await sdk.streams.subscribe({
          somniaStreamsEventId: 'ISSPositionUpdated',
          
          // ZERO-FETCH PATTERN: Bundle getLastPublishedDataForSchema in the event
          ethCalls: [{
            to: protocolInfo.address as `0x${string}`,
            data: encodeFunctionData({
              abi: protocolInfo.abi,
              functionName: 'getLastPublishedDataForSchema',
              args: [ISS_SCHEMA_ID, PUBLISHER_ADDRESS]
            })
          }],
          
          onlyPushChanges: false,
          
          onData: (data: unknown) => {
            console.log('🛰️  New ISS position received via WebSocket!')
            
            try {
              const { result } = data as { result?: { simulationResults?: readonly `0x${string}`[] } }
              
              if (!result?.simulationResults || result.simulationResults.length === 0) {
                console.warn('⚠️  No simulation results in event')
                return
              }
              
              // Decode the latest ISS location from ethCall result
              // CRITICAL: getLastPublishedDataForSchema returns bytes (not bytes[])
              const lastPublishedData = decodeFunctionResult({
                abi: protocolInfo.abi,
                functionName: 'getLastPublishedDataForSchema',
                data: result.simulationResults[0]
              }) as `0x${string}`
              
              if (!lastPublishedData || lastPublishedData === '0x') {
                console.warn('⚠️  No ISS data in ethCall result')
                return
              }
              
              console.log('✅ Received ISS position from ethCall (ZERO additional fetches!)')
              
              // Decode ISS location (includes GPS parent fields + ISS child fields)
              const location = decodeISSLocation(lastPublishedData)
              
              console.log(`📍 Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
              console.log(`   Nonce: ${location.nonce}`)
              console.log(`   Velocity: ${location.velocity} km/h`)
              
              if (!isSubscribed) {
                console.warn('⚠️  Received location but not subscribed, ignoring')
                return
              }
              
              // Deduplicate by nonce
              const isDuplicate = currentLocations.some(l => l.nonce === location.nonce)
              
              if (isDuplicate) {
                console.log(`ℹ️  Position nonce ${location.nonce} already exists (duplicate)`)
                return
              }
              
              // Add new location
              currentLocations = [...currentLocations, location]
              
              console.log(`🎉 New ISS position added! Total: ${currentLocations.length}`)
              
              // Notify parent components
              onLocationsUpdateRef.current(currentLocations)
              onNewLocationRef.current(location)
              
            } catch (error) {
              console.error('❌ Failed to process ISS position:', error)
            }
          },
          
          onError: (error: Error) => {
            console.error('❌ Subscription error:', error.message)
            isSubscribed = false
            
            // Fetch the last 100 positions before reconnecting
            console.log('📥 Fetching last 100 positions before reconnecting...')
            fetchInitialLocations()
              .then(locations => {
                if (locations.length > 0) {
                  console.log(`📥 Fetched ${locations.length} positions`)
                  // Always update with the latest data
                  currentLocations = locations
                  onLocationsUpdateRef.current(locations)
                }
              })
              .catch(err => {
                console.error('⚠️  Failed to fetch positions:', err)
              })
              .finally(() => {
                // Auto-reconnect after 3 seconds
                console.log('🔄 Reconnecting in 3 seconds...')
                setTimeout(() => {
                  if (!isSubscribed) {
                    setupSubscription()
                  }
                }, 3000)
              })
          }
        })
        
        subscription = sub
        isSubscribed = true
        console.log('✅ Subscribed to ISSPositionUpdated events')
        console.log('   Waiting for ISS position updates...')
        
      } catch (error) {
        console.error('❌ Failed to subscribe:', error)
        
        // Retry after 5 seconds
        console.log('🔄 Retrying subscription in 5 seconds...')
        setTimeout(() => {
          if (!isSubscribed) {
            setupSubscription()
          }
        }, 5000)
      }
    }

    // Initialize: Fetch history FIRST, then subscribe (non-blocking with setTimeout)
    console.log('🚀 Initializing ISS location tracking...')
    
    // Defer to avoid blocking render
    setTimeout(() => {
      console.log('⏰ Timeout elapsed, starting initial fetch...')
      fetchInitialLocations()
        .then(locations => {
          currentLocations = locations
          console.log(`📋 Initialized with ${locations.length} historical positions`)
          
          if (locations.length > 0) {
            console.log(`🔔 Calling parent onLocationsUpdate with ${locations.length} locations`)
          } else {
            console.warn('⚠️  No historical locations to pass to parent')
          }
          
          // Update parent with initial data
          onLocationsUpdateRef.current(locations)
          console.log('✅ Parent updated with initial data')
          
          console.log('🔌 Now setting up WebSocket subscription for real-time updates...')
          // Start real-time subscription
          setupSubscription()
        })
        .catch(error => {
          console.error('❌ Failed initial fetch:', error)
          // Update parent with empty array so UI can render
          onLocationsUpdateRef.current([])
          // Try subscription anyway (might work even without historical data)
          setupSubscription()
        })
    }, 100) // Small delay to ensure render completes first
    
    // Handle tab visibility changes (wake from sleep/hibernation)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️  Tab became visible, re-fetching last 100 positions...')
        
        // Always fetch the last 100 positions to ensure we have the latest data
        fetchInitialLocations()
          .then(locations => {
            if (locations.length > 0) {
              console.log(`📥 Fetched ${locations.length} positions`)
              // Always update, even if count is the same (might be different positions)
              currentLocations = locations
              onLocationsUpdateRef.current(locations)
            }
            
            // Re-establish WebSocket if needed
            if (!isSubscribed) {
              console.log('🔄 Re-establishing WebSocket connection...')
              setupSubscription()
            }
          })
          .catch(error => {
            console.error('❌ Failed to fetch positions:', error)
          })
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up ISS location subscription...')
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Unsubscribe from WebSocket
      if (subscription) {
        try {
          subscription.unsubscribe()
          isSubscribed = false
          console.log('✅ Subscription cleaned up')
        } catch (error) {
          console.error('⚠️  Error during cleanup:', error)
        }
      }
    }
  }, [])
}

