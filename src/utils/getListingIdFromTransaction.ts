import { createPublicClient, http, parseEventLogs } from 'viem'
import { sapphireTestnet } from 'viem/chains'
import { NFT_MARKET_CONFIG } from '@/abis/MarketABI'

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
  chain: sapphireTestnet,
  transport: http()
})

// Extract listing ID from transaction receipt
export async function getListingIdFromTransaction(txHash: string): Promise<{
  listingId: string | null
  collectionId: string | null
  type: 'single' | 'collection' | 'unknown'
}> {
  try {
    console.log('🔍 Getting listing ID from transaction:', txHash)
    
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    })

    if (!receipt || !receipt.logs) {
      console.error('❌ No receipt or logs found for transaction:', txHash)
      return { listingId: null, collectionId: null, type: 'unknown' }
    }

    console.log('📋 Transaction receipt logs:', receipt.logs.length)

    // Parse logs to find listing events
    const parsedLogs = parseEventLogs({
      abi: NFT_MARKET_CONFIG.abi,
      logs: receipt.logs,
    })

    console.log('🔍 Parsed logs:', parsedLogs.length)
    console.log('📋 Available events:', parsedLogs.map(log => (log as any).eventName))

    // Look for listing events
    for (const log of parsedLogs) {
      const logAny = log as any
      const eventName = logAny.eventName
      const args = logAny.args

      console.log('🔍 Checking event:', eventName, 'args:', args)

      // Check for single NFT listing events
      if (eventName === 'NFTListed') {
        const listingId = args?.listingId?.toString()
        if (listingId) {
          console.log('✅ Found NFTListed event, listingId:', listingId)
          return { 
            listingId, 
            collectionId: null, 
            type: 'single' 
          }
        }
      }

      // Check for collection bundle listing events
      if (eventName === 'CollectionBundleListed') {
        const collectionId = args?.collectionId?.toString()
        if (collectionId) {
          console.log('✅ Found CollectionBundleListed event, collectionId:', collectionId)
          return { 
            listingId: null, 
            collectionId, 
            type: 'collection' 
          }
        }
      }

      // Check for collection individual listing events
      if (eventName === 'CollectionIndividualListed') {
        const collectionId = args?.collectionId?.toString()
        if (collectionId) {
          console.log('✅ Found CollectionIndividualListed event, collectionId:', collectionId)
          return { 
            listingId: null, 
            collectionId, 
            type: 'collection' 
          }
        }
      }
    }

    console.log('❌ No listing events found in transaction logs')
    return { listingId: null, collectionId: null, type: 'unknown' }

  } catch (error) {
    console.error('❌ Error getting listing ID from transaction:', error)
    return { listingId: null, collectionId: null, type: 'unknown' }
  }
}

// Alternative method: Get latest listing ID for user
export async function getLatestListingIdForUser(userAddress: string): Promise<string | null> {
  try {
    console.log('🔍 Getting latest listing ID for user:', userAddress)
    
    // Get all available NFTs and find the latest one for this user
    const allNFTs = await publicClient.readContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'getAllAvailableNFTs',
    }) as bigint[]

    if (!allNFTs || allNFTs.length === 0) {
      console.log('❌ No NFTs found in marketplace')
      return null
    }

    console.log('📋 Found', allNFTs.length, 'NFTs in marketplace')

    // Check each NFT to find the latest one from this user
    for (let i = allNFTs.length - 1; i >= 0; i--) {
      const nftId = allNFTs[i]
      
      try {
        const listingInfo = await publicClient.readContract({
          address: NFT_MARKET_CONFIG.address,
          abi: NFT_MARKET_CONFIG.abi,
          functionName: 'getListingInfo',
          args: [nftId],
        }) as any

        console.log(`📋 Checking NFT ${nftId}: seller=${listingInfo[3]}, active=${listingInfo[5]}`)
        
        // listingInfo is array: [isBundle, tokenId, nftContract, seller, price, isActive, collectionName, tokenIds]
        const seller = listingInfo[3]
        const isActive = listingInfo[5]
        
        if (seller && seller.toLowerCase() === userAddress.toLowerCase() && isActive) {
          console.log('✅ Found latest listing for user:', nftId.toString())
          return nftId.toString()
        }
      } catch (error) {
        console.warn('⚠️ Error getting listing info for ID:', nftId.toString(), error)
        continue
      }
    }

    console.log('❌ No active listings found for user:', userAddress)
    return null

  } catch (error) {
    console.error('❌ Error getting latest listing ID for user:', error)
    return null
  }
}

// Get absolute latest listing ID from smart contract
export async function getAbsoluteLatestListingId(): Promise<string | null> {
  try {
    console.log('🔍 Getting absolute latest listing ID from smart contract')
    
    const allNFTs = await publicClient.readContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'getAllAvailableNFTs',
    }) as bigint[]

    if (!allNFTs || allNFTs.length === 0) {
      console.log('❌ No NFTs found in marketplace')
      return null
    }

    const latestId = allNFTs[allNFTs.length - 1]
    console.log('✅ Absolute latest listing ID:', latestId.toString())
    return latestId.toString()

  } catch (error) {
    console.error('❌ Error getting absolute latest listing ID:', error)
    return null
  }
}