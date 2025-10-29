/**
 * Test Oracle Script
 * 
 * Manually trigger the oracle to test ISS data fetching and publishing
 * Useful for development and debugging
 * 
 * Run: npm run test-oracle
 * (Make sure dev server is running: npm run dev)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  console.log('🧪 Testing ISS Oracle...\n')
  
  const url = 'http://localhost:3000/api/cron/sync-iss'
  const cronSecret = process.env.CRON_SECRET
  
  console.log('📡 Calling:', url)
  console.log('🔐 Using CRON_SECRET:', cronSecret ? '✓ Set' : '✗ Not set')
  console.log('')
  
  try {
    const response = await fetch(url, {
      headers: cronSecret ? {
        'Authorization': `Bearer ${cronSecret}`
      } : {}
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Oracle Success!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('TX Hash:', data.txHash)
      console.log('Position:', `${data.position.lat}, ${data.position.lon}`)
      console.log('Timestamp:', new Date(data.position.timestamp * 1000).toISOString())
      console.log('Nonce:', data.nonce)
      console.log('Duration:', data.duration, 'ms')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
      console.log('🎉 ISS position published to blockchain!')
      console.log('💡 Check Somnia Explorer:', `https://explorer.somnia.network/tx/${data.txHash}`)
    } else {
      console.error('❌ Oracle Failed!')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('Status:', response.status)
      console.error('Error:', data.error)
      console.error('Message:', data.message)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  } catch (error) {
    console.error('❌ Request Failed!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Error:', (error as Error).message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    console.error('💡 Make sure:')
    console.error('   1. Dev server is running (npm run dev)')
    console.error('   2. .env.local has all required variables')
    console.error('   3. Schemas are registered (npm run register-schemas)')
  }
}

main().catch(console.error)

