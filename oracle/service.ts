/**
 * ISS Oracle Service
 * 
 * Standalone Node.js service that:
 * 1. Fetches ISS position from Open Notify API
 * 2. Encodes data using GPS + ISS schema (inheritance)
 * 3. Publishes to Somnia blockchain
 * 4. Emits events for WebSocket subscribers
 * 
 * Runs on GCP VM with setInterval() instead of serverless cron
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get the project root directory (parent of oracle/)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

// IMPORTANT: Load environment variables BEFORE importing anything else
// ES modules hoist imports, so we need to load .env first
config({ path: resolve(projectRoot, '.env.local') })

// Now import modules that depend on process.env
import { toHex } from 'viem'
import { getSDK } from '../lib/sdk.js'
import { encodeISSLocation } from '../lib/iss-encoding.js'
import type { OpenNotifyResponse } from '../types/iss.js'

// Read constants at runtime (after env is loaded)
const ISS_SCHEMA_ID = process.env.NEXT_PUBLIC_ISS_SCHEMA_ID as `0x${string}`
const PUBLISHER_ADDRESS = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}`

// Configuration
const INTERVAL = 5000 // 5 seconds (adjust as needed)
const OPEN_NOTIFY_URL = 'http://api.open-notify.org/iss-now.json'

/**
 * Sync ISS position to blockchain
 */
async function syncISS() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🛰️  Syncing ISS position...`)
  
  try {
    // ===== Step 1: Calculate Next Nonce from Blockchain =====
    console.log('   🔢 Calculating nonce...')
    const sdk = getSDK()
    
    const totalPublished = await sdk.streams.totalPublisherDataForSchema(
      ISS_SCHEMA_ID,
      PUBLISHER_ADDRESS
    )
    
    const nonce = totalPublished || BigInt(0)
    console.log(`   📊 Total published: ${totalPublished}, Next nonce: ${nonce}`)
    
    // ===== Step 2: Fetch ISS Position from Open Notify API =====
    console.log('   📡 Fetching from Open Notify...')
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
    
    console.log(`   📍 Position: ${issData.iss_position.latitude}, ${issData.iss_position.longitude}`)
    
    // ===== Step 3: Encode Data =====
    console.log('   🔐 Encoding with GPS + ISS schema...')
    const encodedData = encodeISSLocation(issData, nonce)
    const locationId = toHex(issData.timestamp, { size: 32 })
    
    // ===== Step 4: Publish to Blockchain =====
    console.log('   📤 Publishing to Somnia...')
    const txHash = await sdk.streams.setAndEmitEvents(
      // Data Stream
      [
        {
          id: locationId,
          schemaId: ISS_SCHEMA_ID,
          data: encodedData
        }
      ],
      // Event Stream
      [
        {
          id: 'ISSPositionUpdated',
          argumentTopics: [],
          data: '0x'
        }
      ]
    )
    
    if (!txHash) {
      throw new Error('Transaction failed: no hash returned')
    }
    
    console.log(`   ✅ Published! TX: ${txHash}`)
    console.log(`   📈 Nonce: ${nonce}`)
    console.log('')
    
  } catch (error) {
    const err = error as Error
    console.error(`   ❌ Sync failed: ${err.message}`)
    console.error('')
    // Don't crash - continue running for next interval
  }
}

/**
 * Main service loop
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 ISS Oracle Service Starting...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`)
  console.log(`📍 Publisher: ${PUBLISHER_ADDRESS}`)
  console.log(`🔗 RPC: ${process.env.RPC_URL || 'https://dream-rpc.somnia.network'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  
  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is required')
    console.error('   Create a .env file in the oracle/ directory with:')
    console.error('   PRIVATE_KEY=0xYOUR_PRIVATE_KEY')
    process.exit(1)
  }
  
  if (!ISS_SCHEMA_ID || !PUBLISHER_ADDRESS) {
    console.error('❌ Schema IDs and publisher address are required')
    console.error('   Run: npm run register-schemas')
    process.exit(1)
  }
  
  // Run immediately on start
  console.log('🎬 Running first sync...')
  await syncISS()
  
  // Then run on interval
  console.log(`✅ Service running. Syncing every ${INTERVAL / 1000}s...`)
  console.log('   Press Ctrl+C to stop.')
  console.log('')
  
  setInterval(async () => {
    await syncISS()
  }, INTERVAL)
}

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', () => {
  console.log('')
  console.log('📴 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('')
  console.log('📴 Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  console.error('   Service will continue running...')
})

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason)
  console.error('   Service will continue running...')
})

// Start the service
main().catch((error) => {
  console.error('💥 Fatal error in main():', error)
  process.exit(1)
})

