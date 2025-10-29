/**
 * Schema Registration Script
 * 
 * This script demonstrates schema inheritance in Somnia Data Streams:
 * 1. Register GPS schema (parent) - generic, reusable for any tracking app
 * 2. Register ISS schema (child) - extends GPS with ISS-specific fields
 * 3. Register event schema for reactivity notifications
 * 
 * Run: npm run register-schemas
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { privateKeyToAccount } from 'viem/accounts'
import { GPS_SCHEMA, ISS_SCHEMA } from '../lib/constants'
import { getSDK, getPublicClient } from '../lib/sdk'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  console.log('🚀 ISS Tracker - Schema Registration')
  console.log('=====================================\n')
  console.log('This demonstrates schema inheritance in Somnia Data Streams:')
  console.log('- GPS Schema (parent): Generic location tracking')
  console.log('- ISS Schema (child): Extends GPS with ISS-specific data\n')

  const sdk = getSDK()
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`
  const account = privateKeyToAccount(privateKey)
  
  console.log('📍 Publisher Address:', account.address)
  console.log('')

  // ===== Step 1: Compute and Register GPS Schema (Parent) =====
  console.log('📝 Step 1: Computing GPS schema ID...')
  console.log('   Schema:', GPS_SCHEMA)
  
  const gpsSchemaId = await sdk.streams.computeSchemaId(GPS_SCHEMA)
  console.log('✅ GPS Schema ID:', gpsSchemaId)
  console.log('')

  console.log('📤 Step 2: Registering GPS schema (parent/base)...')
  try {
    const tx1 = await sdk.streams.registerDataSchemas([
      {
        id: 'gps',
        schema: GPS_SCHEMA,
        parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' // No parent (root schema)
      }
    ])
    console.log('✅ GPS schema registered!')
    console.log('   Transaction:', tx1)
    
    // Wait for transaction confirmation before proceeding
    if (tx1) {
      console.log('⏳ Waiting for transaction confirmation...')
      const publicClient = getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: tx1 })
      console.log('✅ Transaction confirmed on blockchain!')
    }
  } catch (error) {
    const err = error as any
    // Check for SchemaAlreadyRegistered error
    if (err.message?.includes('SchemaAlreadyRegistered') || 
        err.message?.includes('already registered') ||
        err.data?.errorName === 'SchemaAlreadyRegistered') {
      console.log('ℹ️  GPS schema already registered (skipping)')
    } else {
      console.error('❌ Failed to register GPS schema:', err.message)
      throw error
    }
  }
  console.log('')

  // ===== Step 2: Compute and Register ISS Schema (Child) =====
  console.log('📝 Step 3: Computing ISS schema ID...')
  console.log('   Schema:', ISS_SCHEMA)
  console.log('   Parent:', gpsSchemaId)
  
  const issSchemaId = await sdk.streams.computeSchemaId(ISS_SCHEMA)
  console.log('✅ ISS Schema ID:', issSchemaId)
  console.log('')

  console.log('📤 Step 4: Registering ISS schema (child, extends GPS)...')
  console.log('   This demonstrates schema inheritance!')
  console.log('   ISS data will include: GPS fields + ISS fields')
  try {
    const tx2 = await sdk.streams.registerDataSchemas([
      {
        id: 'iss-location',
        schema: ISS_SCHEMA,
        parentSchemaId: gpsSchemaId // ISS extends GPS!
      }
    ])
    console.log('✅ ISS schema registered with GPS as parent!')
    console.log('   Transaction:', tx2)
    
    // Wait for transaction confirmation
    if (tx2) {
      console.log('⏳ Waiting for transaction confirmation...')
      const publicClient = getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: tx2 })
      console.log('✅ Transaction confirmed on blockchain!')
    }
  } catch (error) {
    const err = error as any
    // Check for SchemaAlreadyRegistered error
    if (err.message?.includes('SchemaAlreadyRegistered') || 
        err.message?.includes('already registered') ||
        err.data?.errorName === 'SchemaAlreadyRegistered') {
      console.log('ℹ️  ISS schema already registered (skipping)')
    } else {
      console.error('❌ Failed to register ISS schema:', err.message)
      throw error
    }
  }
  console.log('')

  // ===== Step 3: Register Event Schema for Reactivity =====
  console.log('📤 Step 5: Registering ISSPositionUpdated event schema...')
  console.log('   This enables real-time reactivity for subscribers')
  try {
    const tx3 = await sdk.streams.registerEventSchemas(
      ['ISSPositionUpdated'],
      [{
        params: [],
        eventTopic: 'ISSPositionUpdated()'
      }]
    )
    console.log('✅ Event schema registered!')
    console.log('   Transaction:', tx3)
  } catch (error) {
    const err = error as Error
    if (err.message.includes('already registered') || err.message.includes('AlreadyExists')) {
      console.log('ℹ️  Event already registered (skipping)')
    } else {
      console.error('⚠️  Failed to register event:', err.message)
      // Don't throw - event might already exist
    }
  }
  console.log('')

  // ===== Output Configuration =====
  console.log('✅ Schema Registration Complete!')
  console.log('=================================\n')
  console.log('📋 Add these to your .env.local file:\n')
  console.log(`NEXT_PUBLIC_GPS_SCHEMA_ID=${gpsSchemaId}`)
  console.log(`NEXT_PUBLIC_ISS_SCHEMA_ID=${issSchemaId}`)
  console.log(`NEXT_PUBLIC_PUBLISHER_ADDRESS=${account.address}`)
  console.log('')
  console.log('💡 Schema Inheritance Summary:')
  console.log('   GPS Schema: Generic base for any location tracking')
  console.log('   ├─ Can be reused by: Delivery apps, F1 tracking, flight tracking')
  console.log('   └─ ISS Schema: Adds velocity + visibility fields')
  console.log('')
  console.log('🎯 Next Steps:')
  console.log('   1. Copy the environment variables above to .env.local')
  console.log('   2. Run the oracle to start publishing ISS data')
  console.log('   3. Start the dev server to see real-time tracking')
  console.log('')
}

main()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

