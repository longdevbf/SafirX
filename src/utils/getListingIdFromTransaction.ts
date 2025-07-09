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

      // Check for single listing events
      if (eventName === 'SingleListing' || eventName === 'ItemListed' || eventName === 'NFTListed') {
        const listingId = args?.listingId?.toString() || args?.id?.toString() || args?.tokenId?.toString()
        if (listingId) {
          console.log('✅ Found single listing event:', eventName, 'listingId:', listingId)
          return { 
            listingId, 
            collectionId: null, 
            type: 'single' 
          }
        }
      }

      // Check for collection listing events
      if (eventName === 'CollectionListing' || eventName === 'BundleListed') {
        const collectionId = args?.collectionId?.toString() || args?.bundleId?.toString() || args?.id?.toString()
        if (collectionId) {
          console.log('✅ Found collection listing event:', eventName, 'collectionId:', collectionId)
          return { 
            listingId: null, 
            collectionId, 
            type: 'collection' 
          }
        }
      }

      // Check for any other listing-related events
      if (eventName?.toLowerCase().includes('listing') || eventName?.toLowerCase().includes('list')) {
        console.log('🔍 Found listing-related event:', eventName)
        
        // Try to extract ID from various possible fields
        const possibleIds = [
          args?.listingId,
          args?.collectionId,
          args?.id,
          args?.tokenId,
          args?._listingId,
          args?._collectionId,
          args?._id
        ].filter(id => id !== undefined)

        if (possibleIds.length > 0) {
          const id = possibleIds[0].toString()
          console.log('✅ Extracted ID from generic listing event:', id)
          return { 
            listingId: id, 
            collectionId: null, 
            type: 'unknown' 
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

// Alternative method: Get listing ID by querying smart contract directly
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

        if (listingInfo && listingInfo.seller?.toLowerCase() === userAddress.toLowerCase()) {
          console.log('✅ Found latest listing for user:', nftId.toString())
          return nftId.toString()
        }
      } catch (error) {
        console.warn('⚠️ Error getting listing info for ID:', nftId.toString(), error)
        continue
      }
    }

    console.log('❌ No listings found for user:', userAddress)
    return null

  } catch (error) {
    console.error('❌ Error getting latest listing ID for user:', error)
    return null
  }
}

// Validate if a listing ID exists and is active
export async function validateListingId(listingId: string): Promise<boolean> {
  try {
    console.log('🔍 Validating listing ID:', listingId)
    
    const listingInfo = await publicClient.readContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'getListingInfo',
      args: [BigInt(listingId)],
    }) as any

    const isValid = listingInfo && listingInfo.isActive
    console.log('✅ Listing ID validation result:', isValid)
    return isValid

  } catch (error) {
    console.error('❌ Error validating listing ID:', error)
    return false
  }
}