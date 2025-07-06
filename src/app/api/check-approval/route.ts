import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { oasisTestnet } from 'viem/chains' // hoặc mainnet
import { ERC721_ABI } from '@/abis/MarketABI'
import { mainnet, sapphireTestnet } from 'wagmi/chains';
const publicClient = createPublicClient({
  chain: sapphireTestnet, // hoặc oasisMainnet
  transport: http()
})

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, owner, marketAddress } = await request.json()

    if (!contractAddress || !owner || !marketAddress) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const isApproved = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'isApprovedForAll',
      args: [owner as `0x${string}`, marketAddress as `0x${string}`]
    })

    return NextResponse.json({ isApproved })
  } catch (error) {
    console.error('Error checking approval:', error)
    return NextResponse.json({ error: 'Failed to check approval' }, { status: 500 })
  }
}