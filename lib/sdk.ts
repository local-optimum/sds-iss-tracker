/**
 * Server-side SDK helpers
 * Use these for Oracle operations (writing data to blockchain)
 * NEVER use these in client-side code
 */
import { SDK } from '@somnia-chain/streams'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { somniaTestnet } from './chains'

export function getPublicClient() {
  const rpcUrl = process.env.RPC_URL || 'https://dream-rpc.somnia.network'
  
  return createPublicClient({
    chain: somniaTestnet,
    transport: http(rpcUrl),
  })
}

export function getWalletClient() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required for wallet operations')
  }
  
  const account = privateKeyToAccount(privateKey)
  const rpcUrl = process.env.RPC_URL || 'https://dream-rpc.somnia.network'
  
  return createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(rpcUrl),
  })
}

/**
 * Get SDK instance with both read and write capabilities
 * Use this in server-side operations only
 */
export function getSDK() {
  return new SDK({
    public: getPublicClient(),
    wallet: getWalletClient(),
  })
}

