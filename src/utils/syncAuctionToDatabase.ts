/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatEther } from 'viem'

// ✅ Get auction ID from transaction logs
export async function getAuctionIdFromTransaction(txHash: string): Promise<{
  auctionId?: string
  type?: 'single' | 'collection'
}> {
  try {
    console.log('🔍 Getting auction ID from transaction:', txHash)
    
    // First try to get receipt using fetch (more reliable than wagmi for this)
    const response = await fetch('https://testnet.sapphire.oasis.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await response.json()
    const receipt = data.result

    if (!receipt || !receipt.logs) {
      console.error('❌ No receipt or logs found for transaction')
      return {}
    }

    console.log(`📋 Found ${receipt.logs.length} logs in transaction`)

    // Look for AuctionCreated event
    // Event signature: AuctionCreated(uint256 indexed auctionId, address indexed seller, address indexed nftContract, ...)
    const auctionCreatedTopic = '0x...' // You need to calculate this from the event signature

    for (const log of receipt.logs) {
      if (log.topics && log.topics[0] === auctionCreatedTopic) {
        // Decode auction ID from first indexed parameter (topics[1])
        const auctionId = parseInt(log.topics[1], 16).toString()
        
        // Decode data to determine if it's collection or single
        // For simplicity, you can also check if tokenIds array is provided
        const type = log.data.includes('collection') ? 'collection' : 'single'
        
        console.log(`✅ Found auction ID: ${auctionId}, type: ${type}`)
        return { auctionId, type }
      }
    }

    console.warn('⚠️ AuctionCreated event not found in transaction logs')
    return {}

  } catch (error) {
    console.error('❌ Error getting auction ID from transaction:', error)
    return {}
  }
}

// ✅ Get latest auction ID from smart contract
export async function getLatestAuctionIdForUser(userAddress: string): Promise<string | null> {
  try {
    console.log('🔍 Getting latest auction ID for user:', userAddress)
    
    // Call the smart contract to get user's auctions
    const response = await fetch('https://testnet.sapphire.oasis.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0x...', // Your auction contract address
          data: '0x...' + userAddress.slice(2).padStart(64, '0'), // getUserAuctions(address) selector + padded address
        }, 'latest'],
        id: 1,
      }),
    })

    const data = await response.json()
    
    if (data.result && data.result !== '0x') {
      // Decode the returned auction IDs array
      // This is a simplified approach - you might need proper ABI decoding
      //const decoded = data.result.slice(2) // Remove 0x
      // Parse the last auction ID from the array
      // Implementation depends on your exact contract return format
      
      console.log('📋 Raw contract response:', data.result)
      // Return the latest auction ID
      return '1' // Placeholder - implement proper decoding
    }

    return null
  } catch (error) {
    console.error('❌ Error getting latest auction ID:', error)
    return null
  }
}

// ✅ Prepare auction data for database
export function prepareAuctionData(
  auctionId: string,
  nftContract: string,
  tokenId: string | null,
  tokenIds: string[] | null,
  sellerAddress: string,
  auctionData: {
    auctionType: 'SINGLE_NFT' | 'COLLECTION'
    title: string
    description: string
    startingPrice: string
    reservePrice: string
    minBidIncrement: string
    duration: number // ✅ Đây là giờ
    allowPublicReveal: boolean
    collectionImageUrl?: string
    collectionImageDriveId?: string
    individualNftMetadata?: any[]
  },
  txHash: string,
  nftMetadata?: {
    name?: string
    description?: string
    image?: string
    attributes?: Array<{ trait_type: string; value: string }>
  }
) {
  const now = Date.now() / 1000
  const endTime = now + (auctionData.duration * 3600) // ✅ Convert giờ sang giây cho smart contract

  return {
    auctionId: parseInt(auctionId),
    auctionType: auctionData.auctionType,
    title: auctionData.title,
    description: auctionData.description,
    sellerAddress,
    nftContract,
    tokenId: tokenId ? parseInt(tokenId) : null,
    tokenIds: tokenIds?.map(id => parseInt(id)) || null,
    nftCount: auctionData.auctionType === 'COLLECTION' ? (tokenIds?.length || 1) : 1,
    collectionImageUrl: auctionData.collectionImageUrl || null,
    collectionImageDriveId: auctionData.collectionImageDriveId || null,
    startingPrice: auctionData.startingPrice,
    reservePrice: auctionData.reservePrice,
    minBidIncrement: auctionData.minBidIncrement,
    startTime: Math.floor(now),
    endTime: Math.floor(endTime),
    durationHours: auctionData.duration, // ✅ Lưu giờ vào database
    allowPublicReveal: auctionData.allowPublicReveal,
    nftMetadata,
    individualNftMetadata: auctionData.individualNftMetadata ?? null,
    creationTxHash: txHash
  }
}

// ✅ Sync auction to database
export async function syncAuctionToDatabase(auctionData: any): Promise<boolean> {
  try {
    console.log('💾 Syncing auction to database:', auctionData.auction_id)
    console.log('📊 Full auction data:', JSON.stringify(auctionData, null, 2))
    
    if (!auctionData.seller) {
      console.error('❌ sellerAddress is undefined in auctionData')
      return false
    }
    
    // ✅ Xử lý metadata cho collection auctions
    let nftMetadata: any = {
      name: auctionData.name || 'Auction',
      description: auctionData.description || '',
      image: auctionData.collection_image || auctionData.individual_nft_metadata?.[0]?.image || '/placeholder-nft.jpg',
      attributes: auctionData.attributes || []
    };
    
    // ✅ Nếu là collection, thêm metadata của tất cả NFTs
    if (auctionData.is_collection && auctionData.individual_nft_metadata?.length > 0) {
      nftMetadata = {
        ...nftMetadata,
        coverImage: auctionData.collection_image || auctionData.individual_nft_metadata?.[0]?.image,
        individualNfts: auctionData.individual_nft_metadata.map((nft: any) => ({
          ...nft,
          image: nft.image || '/placeholder-nft.jpg'
        })),
        totalNfts: auctionData.individual_nft_metadata.length
      };
    }
    
    // ✅ Tính duration từ end_time - start_time (bằng giờ)
    const startTime = Math.floor(Date.now() / 1000)
    const endTime = Math.floor(new Date(auctionData.end_time).getTime() / 1000)
    const durationHours = Math.ceil((endTime - startTime) / 3600) // ✅ Convert giây sang giờ
    
    const apiData = {
      action: 'create',
      auctionId: parseInt(auctionData.auction_id),
      auctionType: auctionData.is_collection ? 'COLLECTION' : 'SINGLE_NFT',
      title: auctionData.name || 'Auction',
      description: auctionData.description || '',
      sellerAddress: auctionData.seller,
      nftContract: auctionData.nft_contract,
      tokenId: auctionData.token_id ? parseInt(auctionData.token_id) : undefined,
      tokenIds: auctionData.collection_token_ids?.map((id: string) => parseInt(id)),
      nftCount: auctionData.is_collection ? auctionData.collection_token_ids?.length || 1 : 1,
      collectionImageUrl: auctionData.collection_image,
      collectionImageDriveId: '',
      startingPrice: auctionData.starting_price,
      reservePrice: auctionData.reserve_price,
      minBidIncrement: auctionData.min_bid_increment,
      startTime: startTime,
      endTime: endTime,
      durationHours: durationHours, // ✅ Lưu giờ vào database
      allowPublicReveal: auctionData.allow_public_reveal || false,
      nftMetadata: nftMetadata,
      individualNftMetadata: auctionData.individual_nft_metadata || [],
      creationTxHash: auctionData.tx_hash
    }
    
    console.log('📤 Sending to API:', JSON.stringify(apiData, null, 2))
    
    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Auction synced successfully:', result)
    return true
  } catch (error) {
    console.error('❌ Failed to sync auction to database:', error)
    return false
  }
}

// ✅ Update auction state in database
export async function updateAuctionState(
  auctionId: string, 
  state: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED',
  txHash?: string
): Promise<boolean> {
  try {
    console.log(`🔄 Updating auction ${auctionId} state to ${state}`)

    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update_state',
        auctionId: parseInt(auctionId),
        state,
        txHash
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log(`✅ Auction ${auctionId} state updated to ${state}`)
      return true
    } else {
      console.error('❌ Failed to update auction state:', result.error)
      return false
    }

  } catch (error) {
    console.error('❌ Error updating auction state:', error)
    return false
  }
}

// ✅ Finalize auction in database
export async function finalizeAuctionInDatabase(
  auctionId: string,
  finalizationResult: {
    winnerAddress?: string
    finalPrice?: string
    totalBids?: number
    uniqueBidders?: number
  },
  txHash: string
): Promise<boolean> {
  try {
    console.log(`🎯 Finalizing auction ${auctionId} in database`)

    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'finalize',
        auctionId: parseInt(auctionId),
        winnerAddress: finalizationResult.winnerAddress,
        finalPrice: finalizationResult.finalPrice,
        totalBids: finalizationResult.totalBids || 0,
        uniqueBidders: finalizationResult.uniqueBidders || 0,
        finalizationTxHash: txHash
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log(`✅ Auction ${auctionId} finalized in database`)
      return true
    } else {
      console.error('❌ Failed to finalize auction in database:', result.error)
      return false
    }

  } catch (error) {
    console.error('❌ Error finalizing auction in database:', error)
    return false
  }
}

// ✅ Sync bid history to database
export async function syncBidHistoryToDatabase(
  auctionId: string,
  bidHistory: Array<{
    bidder: string
    amount: bigint
    timestamp: bigint
    bidNumber: bigint
  }>
): Promise<boolean> {
  try {
    console.log(`📊 Syncing ${bidHistory.length} bids for auction ${auctionId}`)

    // Convert bigint to string for JSON serialization
    const processedBidHistory = bidHistory.map(bid => ({
      bidder: bid.bidder,
      amount: formatEther(bid.amount),
      timestamp: bid.timestamp.toString(),
      bidNumber: bid.bidNumber.toString()
    }))

    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'sync_bids',
        auctionId: parseInt(auctionId),
        bidHistory: processedBidHistory
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log(`✅ Bid history synced for auction ${auctionId}`)
      return true
    } else {
      console.error('❌ Failed to sync bid history:', result.error)
      return false
    }

  } catch (error) {
    console.error('❌ Error syncing bid history:', error)
    return false
  }
}

// ✅ Get absolute latest auction ID from contract
export async function getAbsoluteLatestAuctionId(): Promise<string | null> {
  try {
    console.log('🔍 Getting absolute latest auction ID from contract')
    
    // Call contract's _auctionIdCounter or similar
    const response = await fetch('https://testnet.sapphire.oasis.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0x...', // Your auction contract address
          data: '0x...' // _auctionIdCounter selector
        }, 'latest'],
        id: 1,
      }),
    })

    const data = await response.json()
    
    if (data.result && data.result !== '0x') {
      const latestId = (parseInt(data.result, 16) - 1).toString() // Counter is always +1 ahead
      console.log('📋 Latest auction ID from contract:', latestId)
      return latestId
    }

    return null
  } catch (error) {
    console.error('❌ Error getting absolute latest auction ID:', error)
    return null
  }
}