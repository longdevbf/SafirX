/* eslint-disable @typescript-eslint/no-unused-vars */
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback } from 'react'
import { ERC721_ABI } from '@/abis/MarketABI'
import { SEALED_BID_AUCTION_CONFIG } from '@/abis/AuctionSealedBid'

export function useAuctionApproval(nftContract: string, userAddress?: string) {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // ✅ Check if NFT contract is approved for auction contract
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: [userAddress as `0x${string}`, SEALED_BID_AUCTION_CONFIG.address],
    query: {
      enabled: !!nftContract && !!userAddress,
    }
  })

  // ✅ Approve NFT contract for auction contract
  const approveForAuction = useCallback(async () => {
    if (!nftContract) throw new Error('NFT contract address required')
    if (!userAddress) throw new Error('User address required')
    
    try {
      await writeContract({
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'setApprovalForAll',
        args: [SEALED_BID_AUCTION_CONFIG.address, true],
      })
    } catch (error) {
      console.error('❌ Error approving NFT for auction:', error)
      throw error
    }
  }, [writeContract, nftContract, userAddress])

  // ✅ Check if specific token is approved (for single NFT auction)
  const { data: isTokenApproved, refetch: refetchTokenApproval } = useReadContract({
    address: nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'getApproved',
    args: [BigInt(0)], // tokenId = 0 for checking approval pattern
    query: {
      enabled: !!nftContract,
    }
  })

  // ✅ Approve specific token for auction contract
  const approveTokenForAuction = useCallback(async (tokenId: number) => {
    if (!nftContract) throw new Error('NFT contract address required')
    
    try {
      await writeContract({
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'setApprovalForAll',
        args: [SEALED_BID_AUCTION_CONFIG.address, true],
      })
    } catch (error) {
      console.error('❌ Error approving token for auction:', error)
      throw error
    }
  }, [writeContract, nftContract])

  // ✅ Check if user can create auction (has approval)
  const canCreateAuction = useCallback((tokenId?: number) => {
    if (!nftContract || !userAddress) return false
    
    // Nếu có approval cho tất cả tokens
    if (isApproved) return true
    
    // Nếu chỉ approve specific token
    if (tokenId !== undefined) {
      // Cần implement logic check specific token approval
      return false // Tạm thời return false, cần implement sau
    }
    
    return false
  }, [nftContract, userAddress, isApproved])

  return {
    // ✅ Approval status
    isApproved: Boolean(isApproved),
    isTokenApproved: Boolean(isTokenApproved),
    canCreateAuction,
    
    // ✅ Approval functions
    approveForAuction,
    approveTokenForAuction,
    
    // ✅ Refetch functions
    refetchApproval,
    refetchTokenApproval,
    
    // ✅ Transaction status
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}
