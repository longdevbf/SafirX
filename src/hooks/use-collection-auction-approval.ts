import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback } from 'react'
import { ERC721_ABI } from '@/abis/MarketABI'
import { SEALED_BID_AUCTION_CONFIG } from '@/abis/AuctionSealedBid'

export function useCollectionAuctionApproval(nftContract: string, userAddress?: string) {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Check if NFT contract is approved for auction contract
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: [userAddress as `0x${string}`, SEALED_BID_AUCTION_CONFIG.address],
    query: {
      enabled: !!nftContract && !!userAddress,
    }
  })

  // Approve NFT contract for auction
  const approveForAuction = useCallback(async () => {
    if (!nftContract) throw new Error('NFT contract address required')
    
    try {
      await writeContract({
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'setApprovalForAll',
        args: [SEALED_BID_AUCTION_CONFIG.address, true],
      })
    } catch (error) {
      throw error
    }
  }, [writeContract, nftContract])

  return {
    isApproved: Boolean(isApproved),
    approveForAuction,
    refetchApproval,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}
