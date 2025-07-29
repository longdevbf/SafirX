import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { createPublicClient, http } from 'viem'
import { sapphire } from 'viem/chains'

// Add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
})

// Create blockchain client
const publicClient = createPublicClient({
  chain: sapphire,
  transport: http()
})

// Auction contract ABI (only the functions we need)
const AUCTION_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "auctions",
    "outputs": [
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "bool", "name": "isCancelled", "type": "bool"},
      {"internalType": "enum AuctionSealedBid.AuctionType", "name": "auctionType", "type": "uint8"},
      {"internalType": "enum AuctionSealedBid.AuctionState", "name": "state", "type": "uint8"},
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
      {"internalType": "uint256", "name": "startingPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "reservePrice", "type": "uint256"},
      {"internalType": "uint256", "name": "minBidIncrement", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "uint256", "name": "bidExtensionTime", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "bool", "name": "isFinalized", "type": "bool"},
      {"internalType": "uint256", "name": "totalBids", "type": "uint256"},
      {"internalType": "uint256", "name": "uniqueBidders", "type": "uint256"},
      {"internalType": "address", "name": "highestBidder", "type": "address"},
      {"internalType": "uint256", "name": "highestBid", "type": "uint256"},
      {"internalType": "bool", "name": "allowPublicReveal", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const AUCTION_CONTRACT_ADDRESS = process.env.SEALED_BID_AUCTION as `0x${string}`

// Get auction winner from blockchain
async function getAuctionWinnerFromBlockchain(auctionId: string): Promise<string | null> {
  try {
    console.log('🔗 Fetching auction winner from blockchain for auction:', auctionId)
    
    const auctionData = await publicClient.readContract({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      functionName: 'auctions',
      args: [BigInt(auctionId)]
    })

    const winner = auctionData[17] // highestBidder is at index 17
    const isFinalized = auctionData[14] // isFinalized is at index 14
    
    console.log('🎯 Blockchain auction data:', {
      winner,
      isFinalized,
      auctionId
    })

    return isFinalized ? winner : null
  } catch (error) {
    console.error('❌ Error fetching auction from blockchain:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Claim API called')
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { 
      auctionId, 
      type, // 'claim' or 'reclaim'
      txHash,
      winnerAddress 
    } = body

    if (!auctionId || !type || !txHash) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields: auctionId, type, txHash' },
        { status: 400 }
      )
    }

    if (!['claim', 'reclaim'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "claim" or "reclaim"' },
        { status: 400 }
      )
    }

    console.log('🔌 Connecting to database...')
    const client = await pool.connect()

    try {
      // First, verify the auction exists and is finalized
      console.log('🔍 Checking auction:', auctionId)
      const auctionQuery = `
        SELECT auction_id, state, winner_address, nft_claimed, nft_reclaimed
        FROM auctions 
        WHERE auction_id = $1
      `
      const auctionResult = await client.query(auctionQuery, [auctionId])
      console.log('📊 Auction query result:', auctionResult.rows)

      if (auctionResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Auction not found' },
          { status: 404 }
        )
      }

      const auction = auctionResult.rows[0]

      if (auction.state !== 'FINALIZED') {
        return NextResponse.json(
          { success: false, error: 'Auction is not finalized' },
          { status: 400 }
        )
      }

      // Handle claim operation
      if (type === 'claim') {
        if (auction.nft_claimed) {
          return NextResponse.json(
            { success: false, error: 'NFT has already been claimed' },
            { status: 400 }
          )
        }

        // Get actual winner from blockchain
        const blockchainWinner = await getAuctionWinnerFromBlockchain(auctionId.toString())
        
        if (!blockchainWinner || blockchainWinner === '0x0000000000000000000000000000000000000000') {
          return NextResponse.json(
            { success: false, error: 'This auction has no winner' },
            { status: 400 }
          )
        }

        if (winnerAddress && blockchainWinner.toLowerCase() !== winnerAddress.toLowerCase()) {
          console.log('❌ Winner mismatch:', {
            blockchainWinner: blockchainWinner.toLowerCase(),
            providedWinner: winnerAddress.toLowerCase(),
            databaseWinner: auction.winner_address?.toLowerCase()
          })
          return NextResponse.json(
            { success: false, error: 'Only the winner can claim the NFT' },
            { status: 403 }
          )
        }

        // Update claim status
        const updateQuery = `
          UPDATE auctions 
          SET nft_claimed = TRUE, 
              claim_tx_hash = $1, 
              claimed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE auction_id = $2
          RETURNING auction_id, nft_claimed, claim_tx_hash, claimed_at
        `
        
        const result = await client.query(updateQuery, [txHash, auctionId])
        
        return addCorsHeaders(NextResponse.json({
          success: true,
          message: 'NFT claim status updated successfully',
          data: result.rows[0]
        }))
      }

      // Handle reclaim operation
      if (type === 'reclaim') {
        if (auction.nft_reclaimed) {
          return NextResponse.json(
            { success: false, error: 'NFT has already been reclaimed' },
            { status: 400 }
          )
        }

        // Update reclaim status
        const updateQuery = `
          UPDATE auctions 
          SET nft_reclaimed = TRUE, 
              reclaim_tx_hash = $1, 
              reclaimed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE auction_id = $2
          RETURNING auction_id, nft_reclaimed, reclaim_tx_hash, reclaimed_at
        `
        
        const result = await client.query(updateQuery, [txHash, auctionId])
        
        return addCorsHeaders(NextResponse.json({
          success: true,
          message: 'NFT reclaim status updated successfully',
          data: result.rows[0]
        }))
      }

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Error updating claim status:', error)
    
    // Check if it's a database connection error
    if (error instanceof Error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Database schema not updated. Please run migrations.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')

    if (!auctionId) {
      return NextResponse.json(
        { success: false, error: 'Missing auctionId parameter' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {
      const query = `
        SELECT 
          auction_id,
          nft_claimed,
          nft_reclaimed,
          claim_tx_hash,
          reclaim_tx_hash,
          claimed_at,
          reclaimed_at,
          winner_address
        FROM auctions 
        WHERE auction_id = $1
      `
      
      const result = await client.query(query, [auctionId])

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Auction not found' },
          { status: 404 }
        )
      }

      // Get actual winner from blockchain for accurate data
      const blockchainWinner = await getAuctionWinnerFromBlockchain(auctionId)
      
      const responseData = {
        ...result.rows[0],
        winner_address: blockchainWinner || result.rows[0].winner_address // Use blockchain winner if available
      }

      return addCorsHeaders(NextResponse.json({
        success: true,
        data: responseData
      }))

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Error fetching claim status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}