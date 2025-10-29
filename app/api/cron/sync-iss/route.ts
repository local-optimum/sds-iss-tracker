/**
 * ISS Oracle API Route
 * 
 * This API endpoint acts as an oracle that:
 * 1. Fetches ISS position from Open Notify API
 * 2. Encodes data using GPS + ISS schema (inheritance)
 * 3. Publishes to Somnia blockchain
 * 4. Emits event for real-time subscribers
 * 
 * Called by Vercel Cron every 5 seconds (see vercel.json)
 * Can also be triggered manually for testing
 */
import { NextRequest, NextResponse } from 'next/server'
import { toHex } from 'viem'
import { getSDK } from '@/lib/sdk'
import { ISS_SCHEMA_ID, OPEN_NOTIFY_URL, PUBLISHER_ADDRESS } from '@/lib/constants'
import { encodeISSLocation } from '@/lib/iss-encoding'
import type { OpenNotifyResponse } from '@/types/iss'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Max 10 seconds for serverless function

/**
 * Vercel Cron Job Handler
 * Syncs ISS position every 5 seconds
 * 
 * Security: Requires CRON_SECRET bearer token
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Security: Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🛰️  ISS Oracle: Syncing position...')
  console.log('   Time:', new Date().toISOString())

  try {
    // ===== Step 0: Calculate Next Nonce from On-Chain Data =====
    console.log('🔢 Calculating next nonce from blockchain...')
    const sdk = getSDK()
    
    const totalPublished = await sdk.streams.totalPublisherDataForSchema(
      ISS_SCHEMA_ID,
      PUBLISHER_ADDRESS
    )
    
    const currentNonce = totalPublished || BigInt(0)
    console.log(`   Total published: ${totalPublished}`)
    console.log(`   Next nonce: ${currentNonce}`)
    console.log('')
    // ===== Step 1: Fetch ISS Position from Open Notify API =====
    console.log('📡 Fetching from Open Notify API...')
    
    const response = await fetch(OPEN_NOTIFY_URL, {
      headers: {
        'User-Agent': 'SomniaISSTracker/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Open Notify API returned ${response.status}`)
    }

    const issData: OpenNotifyResponse = await response.json()
    
    if (issData.message !== 'success') {
      throw new Error('Open Notify API returned error')
    }

    console.log(`✅ ISS Position: ${issData.iss_position.latitude}, ${issData.iss_position.longitude}`)
    console.log(`   Timestamp: ${new Date(issData.timestamp * 1000).toISOString()}`)

    // ===== Step 2: Encode Data for Blockchain =====
    console.log('🔐 Encoding data with GPS + ISS schema inheritance...')
    
    const encodedData = encodeISSLocation(issData, currentNonce)
    
    // Use timestamp as unique ID for this position (padded to bytes32)
    const locationId = toHex(issData.timestamp, { size: 32 })

    console.log(`   Location ID: ${locationId}`)
    console.log(`   Nonce: ${currentNonce}`)

    // ===== Step 3: Publish to Somnia Blockchain =====
    console.log('📤 Publishing to Somnia blockchain...')
    console.log('   Using setAndEmitEvents for atomic write + notification')

    const txHash = await sdk.streams.setAndEmitEvents(
      // Data Stream: Store ISS position on-chain
      [
        {
          id: locationId,
          schemaId: ISS_SCHEMA_ID, // Child schema (includes parent GPS fields)
          data: encodedData
        }
      ],
      // Event Stream: Notify subscribers
      [
        {
          id: 'ISSPositionUpdated',
          argumentTopics: [],
          data: '0x' // Event has no additional data
        }
      ]
    )

    if (!txHash) {
      throw new Error('Transaction failed: no hash returned')
    }

    console.log('✅ Published! TX:', txHash)
    console.log(`📈 Nonce used: ${currentNonce}`)

    const duration = Date.now() - startTime
    console.log(`⏱️  Sync completed in ${duration}ms`)

    // Return success response
    return NextResponse.json({
      success: true,
      txHash,
      nonce: (currentNonce + BigInt(1)).toString(), // Next nonce will be current + 1
      position: {
        lat: issData.iss_position.latitude,
        lon: issData.iss_position.longitude,
        timestamp: issData.timestamp
      },
      duration
    })

  } catch (error) {
    const err = error as Error
    console.error('❌ Sync failed:', err.message)
    console.error('   Stack:', err.stack)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: err.message,
        duration
      },
      { status: 500 }
    )
  }
}

/**
 * Optional: Allow manual trigger via POST (for testing)
 * Remove in production or secure with additional auth
 */
export async function POST(request: NextRequest) {
  console.log('🧪 Manual oracle trigger requested')
  return GET(request)
}

