import { createPublicClient, http, parseEventLogs } from 'viem'
import { sapphireTestnet } from 'viem/chains'
import { NFT_MARKET_CONFIG } from '@/abis/MarketABI'

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
  chain: sapphireTestnet,
  transport: http()
})

// Event signatures for different listing types
const LISTING_EVENTS = {
  SingleListing: 'event SingleListing(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price)',
  CollectionListing: 'event CollectionListing(uint256 indexed collectionId, address indexed nftContract, uint256[] tokenIds, address seller, uint256 price, bool isBundle, string collectionName)',
  // Add more events as needed
}

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

    // Look for SingleListing event
    const singleListingEvent = parsedLogs.find(log => log.eventName === 'SingleListing')
    if (singleListingEvent) {
      const listingId = singleListingEvent.args.listingId?.toString()
      console.log('✅ Found SingleListing event, listingId:', listingId)
      return { 
        listingId, 
        collectionId: null, 
        type: 'single' 
      }
    }

    // Look for CollectionListing event
    const collectionListingEvent = parsedLogs.find(log => log.eventName === 'CollectionListing')
    if (collectionListingEvent) {
      const collectionId = collectionListingEvent.args.collectionId?.toString()
      console.log('✅ Found CollectionListing event, collectionId:', collectionId)
      return { 
        listingId: null, 
        collectionId, 
        type: 'collection' 
      }
    }

    // Look for any other listing-related events
    const listingRelatedEvents = parsedLogs.filter(log => 
      log.eventName?.toLowerCase().includes('listing') || 
      log.eventName?.toLowerCase().includes('list')
    )

    if (listingRelatedEvents.length > 0) {
      console.log('🔍 Found listing-related events:', listingRelatedEvents.map(e => e.eventName))
      
      // Try to extract ID from first event
      const firstEvent = listingRelatedEvents[0]
      const args = firstEvent.args as any
      
      // Common patterns for listing IDs
      const possibleIds = [
        args.listingId,
        args.collectionId,
        args.id,
        args.tokenId,
        args._listingId,
        args._collectionId,
        args._id
      ].filter(id => id !== undefined)

      if (possibleIds.length > 0) {
        const id = possibleIds[0].toString()
        console.log('✅ Extracted ID from event:', id)
        return { 
          listingId: id, 
          collectionId: null, 
          type: 'unknown' 
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