/**
 * useISSLocations Hook
 * 
 * Demonstrates real-time Somnia Data Streams reactivity:
 * - WebSocket subscription with ZERO-FETCH ethCalls pattern
 * - Automatic deduplication by nonce
 * - Reconnection handling
 * 
 * Trail is built purely from subscription updates (last ~100 positions)
 */
'use client'

import { useEffect, useRef } from 'react'
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import { ISS_SCHEMA_ID, PUBLISHER_ADDRESS } from '@/lib/constants'
import { decodeISSLocation } from '@/lib/iss-encoding'
import { getClientSDK } from '@/lib/client-sdk'
import type { ISSLocation } from '@/types/iss'

interface UseISSLocationsProps {
  onNewLocation: (location: ISSLocation) => void
}

const MAX_TRAIL_LENGTH = 100 // Keep last 100 positions

/**
 * React hook for subscribing to real-time ISS positions
 */
export function useISSLocations({ onNewLocation }: UseISSLocationsProps) {
  const onNewLocationRef = useRef(onNewLocation)
  const locationsRef = useRef<ISSLocation[]>([])

  useEffect(() => {
    onNewLocationRef.current = onNewLocation
  }, [onNewLocation])

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined
    let isSubscribed = false

    async function setupSubscription() {
      try {
        console.log('🔌 Setting up WebSocket subscription...')
        
        const sdk = getClientSDK()
        const protocolInfoResult = await sdk.streams.getSomniaDataStreamsProtocolInfo()
        
        if (!protocolInfoResult || protocolInfoResult instanceof Error) {
          throw new Error('Failed to get protocol info')
        }
        
        const protocolInfo = protocolInfoResult
        
        console.log('✅ Subscribing to ISSPositionUpdated events')
        
        const sub = await sdk.streams.subscribe({
          somniaStreamsEventId: 'ISSPositionUpdated',
          
          // ZERO-FETCH PATTERN: Get latest position in the event
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
            try {
              const { result } = data as { result?: { simulationResults?: readonly `0x${string}`[] } }
              
              if (!result?.simulationResults?.[0]) {
                return
              }
              
              const lastPublishedData = decodeFunctionResult({
                abi: protocolInfo.abi,
                functionName: 'getLastPublishedDataForSchema',
                data: result.simulationResults[0]
              }) as `0x${string}`
              
              if (!lastPublishedData || lastPublishedData === '0x') {
                return
              }
              
              const location = decodeISSLocation(lastPublishedData)
              
              // Deduplicate by nonce
              if (locationsRef.current.some(l => l.nonce === location.nonce)) {
                return
              }
              
              // Add to trail, keeping last MAX_TRAIL_LENGTH positions
              locationsRef.current = [...locationsRef.current, location].slice(-MAX_TRAIL_LENGTH)
              
              console.log(`🛰️  ISS position #${location.nonce} | ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)} | Trail: ${locationsRef.current.length} positions`)
              
              onNewLocationRef.current(location)
              
            } catch (error) {
              console.error('❌ Failed to process position:', error)
            }
          },
          
          onError: (error: Error) => {
            console.error('❌ Subscription error:', error.message)
            isSubscribed = false
            
            // Auto-reconnect after 3 seconds
            setTimeout(() => {
              if (!isSubscribed) {
                setupSubscription()
              }
            }, 3000)
          }
        })
        
        subscription = sub
        isSubscribed = true
        console.log('✅ Subscribed! Waiting for ISS updates...')
        
      } catch (error) {
        console.error('❌ Failed to subscribe:', error)
        
        // Retry after 5 seconds
        setTimeout(() => {
          if (!isSubscribed) {
            setupSubscription()
          }
        }, 5000)
      }
    }

    // Start subscription
    setupSubscription()

    // Cleanup
    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe()
          console.log('✅ Subscription cleaned up')
        } catch (error) {
          console.error('⚠️  Error during cleanup:', error)
        }
      }
    }
  }, [])
}
