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
      const decoded = data.result.slice(2) // Remove 0x
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
    duration: number
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
  const endTime = now + (auctionData.duration * 3600) // Convert hours to seconds

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
    durationHours: auctionData.duration,
    allowPublicReveal: auctionData.allowPublicReveal,
    nftMetadata,
    individualNftMetadata: auctionData.individualNftMetadata ?? null,
    creationTxHash: txHash
  }
}

// ✅ Sync auction to database
export async function syncAuctionToDatabase(auctionData: any): Promise<boolean> {
  try {
    console.log('💾 Syncing auction to database:', auctionData.auctionId)

    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create',
        ...auctionData
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Auction synced to database successfully')
      return true
    } else {
      console.error('❌ Failed to sync auction to database:', result.error)
      return false
    }

  } catch (error) {
    console.error('❌ Error syncing auction to database:', error)
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