import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther,  Address } from 'viem'
//import { toast } from './use-toast'
import { 
  SEALED_BID_AUCTION_CONFIG, 
  AuctionState, 
  
  AuctionType,
  type Auction, 
  type SealedBid, 
  type PublicBidInfo,
 
} from '@/abis/AuctionSealedBid'
import { retryWithBackoff, withTimeout, createNetworkErrorMessage } from '@/utils/retryUtils'
interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  attributes?: Array<{ trait_type: string; value: string }>
}


export interface ProcessedAuction extends Auction {
  [x: string]: unknown
  // Time calculations
  timeRemaining: number
  isActive: boolean
  isFinalized: boolean
  isCancelled: boolean
  
  // User context
  userCanBid: boolean
  userBid?: SealedBid
  
  // NFT metadata
  nftMetadata?: {
    name?: string
    description?: string
    image?: string
    attributes?: Array<{ trait_type: string; value: string }>
  }
  
  // Display helpers
  finalPrice?: string
  isCollection: boolean         
  nftCount: number             
  tokenIdsList: bigint[]     
}

// ✅ Hook for sealed bid auction operations
export function useSealedBidAuction() {
  const { address } = useAccount()
  //const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [hash, setHash] = useState<`0x${string}` | undefined>()
  const [isPending, setIsPending] = useState(false)
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })
  
  const [error, setError] = useState<Error | null>(null)

  // ✅ Create Single NFT Auction
  const createSingleNFTAuction = useCallback(async (
    nftContract: string,
    tokenId: string,
    startingPrice: string,
    reservePrice: string,
    minBidIncrement: string,
    duration: number,
    allowPublicReveal: boolean,
    title: string,
    description: string
  ) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const durationBigInt = BigInt(duration)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'createSingleNFTAuction',
        args: [
          nftContract as Address,
          BigInt(tokenId),
          parseEther(startingPrice),
          parseEther(reservePrice),
          parseEther(minBidIncrement),
          durationBigInt,
          allowPublicReveal,
          title,
          description
        ]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error creating single NFT auction:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Create Collection Auction - NEW
  const createCollectionAuction = useCallback(async (
    nftContract: string,
    tokenIds: string[],
    startingPrice: string,
    reservePrice: string,
    minBidIncrement: string,
    duration: number,
    allowPublicReveal: boolean,
    title: string,
    description: string
  ) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      if (tokenIds.length === 0) throw new Error('No token IDs provided')
      if (tokenIds.length === 1) throw new Error('Use single NFT auction for one token')
      if (tokenIds.length > 100) throw new Error('Too many tokens (max 100)')
      
      const tokenIdsBigInt = tokenIds.map(id => BigInt(id))
      const durationBigInt = BigInt(duration)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'createCollectionAuction',
        args: [
          nftContract as Address,
          tokenIdsBigInt,
          parseEther(startingPrice),
          parseEther(reservePrice),
          parseEther(minBidIncrement),
          durationBigInt,
          allowPublicReveal,
          title,
          description
        ]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error creating collection auction:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Legacy Create Auction (backward compatibility)
  const createAuction = useCallback(async (
    nftContract: string,
    tokenId: string,
    startingPrice: string,
    reservePrice: string,
    minBidIncrement: string,
    duration: number,
    allowPublicReveal: boolean,
    title: string,
    description: string
  ) => {
    return createSingleNFTAuction(
      nftContract, tokenId, startingPrice, reservePrice,
      minBidIncrement, duration, allowPublicReveal, title, description
    )
  }, [createSingleNFTAuction])

  // ✅ Place Bid
  const placeBid = useCallback(async (auctionId: string, bidAmount: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const bidAmountWei = parseEther(bidAmount)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'placeBid',
        args: [BigInt(auctionId)],
        value: bidAmountWei
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error placing bid:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Finalize Auction
  const finalizeAuction = useCallback(async (auctionId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'finalizeAuction',
        args: [BigInt(auctionId)]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error finalizing auction:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Reveal My Bid
  const revealMyBid = useCallback(async (auctionId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'revealMyBid',
        args: [BigInt(auctionId)]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error revealing bid:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Enable Public Bid History
  const enablePublicBidHistory = useCallback(async (auctionId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'enablePublicBidHistory',
        args: [BigInt(auctionId)]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error enabling public bid history:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  // ✅ Cancel Auction
  const cancelAuction = useCallback(async (auctionId: string, reason: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    try {
      setIsPending(true)
      setError(null)
      
      const txHash = await walletClient.writeContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'cancelAuction',
        args: [BigInt(auctionId), reason]
      })
      
      setHash(txHash)
      return txHash
    } catch (error) {
      console.error('Error cancelling auction:', error)
      setError(error as Error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [walletClient, address])

  return {
    // Single NFT auction
    createSingleNFTAuction,
    
    // Collection auction - NEW
    createCollectionAuction,
    
    // Legacy function
    createAuction,
    
    // Bidding
    placeBid,
    finalizeAuction,
    revealMyBid,
    enablePublicBidHistory,
    cancelAuction,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

// ✅ Hook for fetching auction data
export function useAuctionDetail(auctionId: string) {
  const publicClient = usePublicClient()
  const { address } = useAccount()
  
  const [auction, setAuction] = useState<ProcessedAuction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Fetch NFT metadata for collection
  const fetchNFTMetadata = useCallback(async (
    nftContract: string, 
    tokenIds: bigint[]
  ): Promise<NFTMetadata> => {
    try {
      // For collection, we'll get metadata of the first NFT as representative
      const tokenId = tokenIds[0]
      
      // Try to get tokenURI
      const tokenURI = await publicClient?.readContract({
        address: nftContract as Address,
        abi: [
          {
            name: 'tokenURI',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ type: 'uint256', name: 'tokenId' }],
            outputs: [{ type: 'string', name: '' }]
          }
        ],
        functionName: 'tokenURI',
        args: [tokenId]
      })

      if (tokenURI && typeof tokenURI === 'string') {
        let metadataUrl = tokenURI
        
        if (metadataUrl.startsWith('ipfs://')) {
          metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
        }
        
        const response = await fetch(metadataUrl)
        const metadata = await response.json()
        
        if (metadata.image?.startsWith('ipfs://')) {
          metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
        }
        
        // For collections, add count information
        if (tokenIds.length > 1) {
          metadata.name = `${metadata.name || 'NFT Collection'} (${tokenIds.length} items)`
          metadata.description = `Collection of ${tokenIds.length} NFTs. ${metadata.description || ''}`
        }
        
        return metadata
      }
    } catch (error) {
      console.warn('Failed to fetch NFT metadata:', error)
    }
    
    return {
      name: tokenIds.length > 1 ? `NFT Collection (${tokenIds.length} items)` : 'NFT',
      description: tokenIds.length > 1 ? `Collection of ${tokenIds.length} NFTs` : 'NFT for auction',
      image: '/placeholder.svg'
    }
  }, [publicClient])

  const fetchAuction = useCallback(async () => {
    if (!publicClient || !auctionId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Get basic auction data
      const auctionData = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuction',
        args: [BigInt(auctionId)]
      }) as Auction
      
      // Get auction stats
      const stats = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuctionStats',
        args: [BigInt(auctionId)]
      }) as [bigint, bigint, bigint, boolean, boolean, boolean, boolean, boolean, number, bigint]
      
      // Get token IDs (single or collection)
      const tokenIds = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuctionTokenIds',
        args: [BigInt(auctionId)]
      }) as bigint[]
      
      // Get user's bid if exists
      let userBid: SealedBid | undefined
      if (address) {
        try {
          const bidData = await publicClient.readContract({
            address: SEALED_BID_AUCTION_CONFIG.address,
            abi: SEALED_BID_AUCTION_CONFIG.abi,
            functionName: 'getMyBid',
            args: [BigInt(auctionId)]
          }) as SealedBid
          
          if (bidData.bidder !== '0x0000000000000000000000000000000000000000') {
            userBid = bidData
          }
        } catch {
          // User has no bid
        }
      }
      
      // Calculate time remaining
      const now = Math.floor(Date.now() / 1000)
      const endTime = Number(auctionData.endTime)
      const timeRemaining = Math.max(0, endTime - now)
      
      // Fetch NFT metadata
      const nftMetadata = await fetchNFTMetadata(auctionData.nftContract, tokenIds)
      
      // Process auction data
      const processedAuction: ProcessedAuction = {
        ...auctionData,
        timeRemaining,
        isActive: auctionData.state === AuctionState.ACTIVE && timeRemaining > 0,
        isFinalized: auctionData.state === AuctionState.FINALIZED,
        isCancelled: auctionData.state === AuctionState.CANCELLED,
        userCanBid: address ? 
          auctionData.state === AuctionState.ACTIVE && 
          timeRemaining > 0 && 
          auctionData.seller.toLowerCase() !== address.toLowerCase() : false,
        userBid,
        nftMetadata,
        finalPrice: auctionData.state === AuctionState.FINALIZED && auctionData.highestBid > 0 
          ? formatEther(auctionData.highestBid) 
          : undefined,
        isCollection: auctionData.auctionType === AuctionType.COLLECTION,
        nftCount: Number(stats[9]), // nftCount from stats
        tokenIdsList: tokenIds
      }
      
      setAuction(processedAuction)
    } catch (error) {
      console.error('Error fetching auction:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch auction')
    } finally {
      setLoading(false)
    }
  }, [publicClient, auctionId, address, fetchNFTMetadata])

  // Get public bid history
  const [publicBids, setPublicBids] = useState<PublicBidInfo[]>([])
  const [loadingBids, setLoadingBids] = useState(false)

  const fetchPublicBids = useCallback(async () => {
    if (!publicClient || !auctionId) return
    
    try {
      setLoadingBids(true)
      
      // console.log(`🔍 Fetching public bid history for auction ${auctionId}...`)
      // console.log(`📋 Auction details:`, {
      //   auctionId,
      //   state: auction?.state,
      //   isFinalized: auction?.isFinalized,
      //   allowPublicReveal: auction?.allowPublicReveal,
      //   totalBids: auction?.totalBids?.toString(),
      //   seller: auction?.seller
      // })
      
      const bids = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getPublicBidHistory',
        args: [BigInt(auctionId)]
      }) as PublicBidInfo[]
      
    //  console.log(`📊 Smart contract returned ${bids.length} public bids for auction ${auctionId}:`, bids)
      
      if (bids.length === 0 && auction?.totalBids && auction.totalBids > 0) {
        console.log(`⚠️ Expected ${auction.totalBids.toString()} bids but got 0 public bids. This means:`)
        console.log(`   - Auction is finalized: ${auction.isFinalized}`)
        console.log(`   - Allow public reveal: ${auction.allowPublicReveal}`)
        console.log(`   - Seller may need to call enablePublicBidHistory()`)
      }
      
      setPublicBids(bids)
    } catch (error) {
      console.error(`❌ Error fetching public bid history for auction ${auctionId}:`, error)
      setPublicBids([])
    } finally {
      setLoadingBids(false)
    }
  }, [publicClient, auctionId, auction?.state, auction?.isFinalized, auction?.allowPublicReveal, auction?.totalBids, auction?.seller])

  useEffect(() => {
    fetchAuction()
  }, [fetchAuction])

  useEffect(() => {
    // Fetch public bids if:
    // 1. Auction is finalized (always try to get bids for completed auctions)
    // 2. Auction has ended (not active) - seller might have enabled public history
    if (auction && (auction.isFinalized || (!auction.isActive && auction.state !== AuctionState.CANCELLED))) {
      fetchPublicBids()
    }
  }, [auction?.isFinalized, auction?.isActive, auction?.state, fetchPublicBids])

  return {
    auction,
    publicBids,
    loading,
    loadingBids,
    error,
    refetch: fetchAuction,
    refetchBids: fetchPublicBids
  }
}

// ✅ Hook for fetching ALL auctions (active + ended + finalized)
export function useAllAuctions() {
  const publicClient = usePublicClient()
  const { address } = useAccount()
  
  const [auctions, setAuctions] = useState<ProcessedAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllAuctions = useCallback(async () => {
    if (!publicClient) return
    
    try {
      setLoading(true)
      setError(null)
      
    //  console.log('🔍 Starting to fetch all auctions...')
      
      // Step 1: First try to get active auctions (these we know exist and work)
      const allAuctionIds = new Set<bigint>()
      let activeAuctionIds: bigint[] = []
      
      try {
        activeAuctionIds = await retryWithBackoff(
          () => withTimeout(
            publicClient.readContract({
              address: SEALED_BID_AUCTION_CONFIG.address,
              abi: SEALED_BID_AUCTION_CONFIG.abi,
              functionName: 'getActiveAuctions'
            }),
            10000 // 10 second timeout
          ),
          {
            maxRetries: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
             // console.log(`🔄 Retrying to fetch active auctions (attempt ${attempt}/3):`, error)
            }
          }
        ) as bigint[]
        
     //   console.log('✅ Active auction IDs from contract:', activeAuctionIds.map(id => id.toString()))
        activeAuctionIds.forEach(id => allAuctionIds.add(id))
      } catch (error) {
        console.warn('❌ Failed to get active auctions after retries:', error)
        setError(createNetworkErrorMessage(error))
        return
      }
      
      // Step 2: If we have active auctions, scan around them for ended/finalized ones
      // Use a more conservative approach - only scan a small range around active auctions
      if (activeAuctionIds.length > 0) {
        const minActiveId = Math.min(...activeAuctionIds.map(id => Number(id)))
        const maxActiveId = Math.max(...activeAuctionIds.map(id => Number(id)))
        
        // Only scan a small range around active auctions (±10 IDs)
        const startScan = Math.max(1, minActiveId - 10)
        const endScan = maxActiveId + 10
        
     //  console.log(`🔍 Scanning auction IDs ${startScan} to ${endScan} for ended/finalized auctions...`)
        
        // Scan in smaller batches to avoid timeout
        const batchSize = 5
        for (let i = startScan; i <= endScan; i += batchSize) {
          const batchEnd = Math.min(i + batchSize - 1, endScan)
          const batchPromises: Promise<void>[] = []
          
          for (let auctionIdNum = i; auctionIdNum <= batchEnd; auctionIdNum++) {
            const auctionId = BigInt(auctionIdNum)
            
            // Skip if we already have this auction
            if (allAuctionIds.has(auctionId)) continue
            
            const promise = retryWithBackoff(
              () => withTimeout(
                publicClient.readContract({
                  address: SEALED_BID_AUCTION_CONFIG.address,
                  abi: SEALED_BID_AUCTION_CONFIG.abi,
                  functionName: 'getAuction',
                  args: [auctionId]
                }),
                5000 // 5 second timeout per auction
              ),
              {
                maxRetries: 2,
                delayMs: 500,
                onRetry: (attempt) => {
            //      console.log(`🔄 Retrying auction ${auctionId} (attempt ${attempt}/2)`)
                }
              }
            ).then((result) => {
              const auctionData = result as Auction
              // If auction exists (has a seller), add to list
              if (auctionData.seller !== '0x0000000000000000000000000000000000000000') {
                allAuctionIds.add(auctionId)
             //   console.log(`✅ Found additional auction ${auctionId} (state: ${auctionData.state})`)
              }
            }).catch((error) => {
              // Auction doesn't exist or network error, ignore
            //  console.log(`⚠️ Auction ${auctionId} not found or network error:`, error.message)
            })
            
            batchPromises.push(promise)
          }
          
          // Wait for this batch to complete before next batch
          try {
            await Promise.all(batchPromises)
            // Small delay between batches to avoid overwhelming the RPC
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.warn(`❌ Error in batch ${i}-${batchEnd}:`, error)
            // Continue with next batch even if this one fails
          }
        }
      } else {
        // If no active auctions, try a small scan from auction ID 1-20
        console.log('🔍 No active auctions found, scanning IDs 1-20...')
        
        for (let i = 1; i <= 20; i++) {
          const auctionId = BigInt(i)
          
          try {
            const auctionData = await publicClient.readContract({
              address: SEALED_BID_AUCTION_CONFIG.address,
              abi: SEALED_BID_AUCTION_CONFIG.abi,
              functionName: 'getAuction',
              args: [auctionId]
            }) as Auction
            
            if (auctionData.seller !== '0x0000000000000000000000000000000000000000') {
              allAuctionIds.add(auctionId)
              console.log(`✅ Found auction ${auctionId} (state: ${auctionData.state})`)
            }
          } catch (error) {
            // Auction doesn't exist, continue
            console.log(error)
            continue
          }
        }
      }
      
      const finalAuctionIds = Array.from(allAuctionIds).sort((a, b) => Number(a) - Number(b))
 //     console.log(`📊 Total unique auctions found: ${finalAuctionIds.length}`)
   //   console.log('🔢 Auction IDs:', finalAuctionIds.map(id => id.toString()))
      
      if (finalAuctionIds.length === 0) {
        console.log('⚠️ No auctions found')
        setAuctions([])
        return
      }
      
      // Step 3: Fetch detailed data for all found auctions
    //  console.log('📥 Fetching detailed auction data...')
      const auctionPromises = finalAuctionIds.map(async (id) => {
        try {
          // Add timeout and retry for individual auction calls
          const auctionData = await publicClient.readContract({
            address: SEALED_BID_AUCTION_CONFIG.address,
            abi: SEALED_BID_AUCTION_CONFIG.abi,
            functionName: 'getAuction',
            args: [id]
          }) as Auction
          
          // Get token IDs
          const tokenIds = await publicClient.readContract({
            address: SEALED_BID_AUCTION_CONFIG.address,
            abi: SEALED_BID_AUCTION_CONFIG.abi,
            functionName: 'getAuctionTokenIds',
            args: [id]
          }) as bigint[]
          
          // Get user's bid if exists
          let userBid: SealedBid | undefined
          if (address) {
            try {
              const bidData = await publicClient.readContract({
                address: SEALED_BID_AUCTION_CONFIG.address,
                abi: SEALED_BID_AUCTION_CONFIG.abi,
                functionName: 'getMyBid',
                args: [id]
              }) as SealedBid
              
              if (bidData.bidder !== '0x0000000000000000000000000000000000000000') {
                userBid = bidData
              }
            } catch {
              // User has no bid
            }
          }
          
          // Calculate time remaining
          const now = Math.floor(Date.now() / 1000)
          const endTime = Number(auctionData.endTime)
          const timeRemaining = Math.max(0, endTime - now)
          
          // Fetch basic NFT metadata (skip if network issues)
          let nftMetadata: NFTMetadata = {
            name: tokenIds.length > 1 ? `NFT Collection (${tokenIds.length} items)` : 'NFT',
            description: tokenIds.length > 1 ? `Collection of ${tokenIds.length} NFTs` : 'NFT for auction',
            image: '/placeholder.svg'
          }
          
          // Skip metadata fetch if having network issues
          try {
            const tokenId = tokenIds[0]
            const tokenURI = await publicClient.readContract({
              address: auctionData.nftContract as Address,
              abi: [
                {
                  name: 'tokenURI',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [{ type: 'uint256', name: 'tokenId' }],
                  outputs: [{ type: 'string', name: '' }]
                }
              ],
              functionName: 'tokenURI',
              args: [tokenId]
            })

            if (tokenURI && typeof tokenURI === 'string') {
              let metadataUrl = tokenURI
              if (metadataUrl.startsWith('ipfs://')) {
                metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              
              // Use timeout for fetch request
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
              
              const response = await fetch(metadataUrl, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
              })
              clearTimeout(timeoutId)
              
              const metadata = await response.json()
              
              if (metadata.image?.startsWith('ipfs://')) {
                metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              
              if (tokenIds.length > 1) {
                metadata.name = `${metadata.name || 'NFT Collection'} (${tokenIds.length} items)`
                metadata.description = `Collection of ${tokenIds.length} NFTs. ${metadata.description || ''}`
              }
              
              nftMetadata = metadata
            }
          } catch (error) {
            console.warn(`Failed to fetch metadata for auction ${id}, using placeholder:`, error)
          }
          
          const processedAuction: ProcessedAuction = {
            ...auctionData,
            timeRemaining,
            isActive: auctionData.state === AuctionState.ACTIVE && timeRemaining > 0,
            isFinalized: auctionData.state === AuctionState.FINALIZED,
            isCancelled: auctionData.state === AuctionState.CANCELLED,
            userCanBid: address ? 
              auctionData.state === AuctionState.ACTIVE && 
              timeRemaining > 0 && 
              auctionData.seller.toLowerCase() !== address.toLowerCase() : false,
            userBid,
            nftMetadata,
            finalPrice: auctionData.state === AuctionState.FINALIZED && auctionData.highestBid > 0 
              ? formatEther(auctionData.highestBid) 
              : undefined,
            isCollection: auctionData.auctionType === AuctionType.COLLECTION,
            nftCount: tokenIds.length,
            tokenIdsList: tokenIds
          }
          
          // console.log(`✅ Processed auction ${id}:`, {
          //   title: auctionData.title,
          //   state: auctionData.state,
          //   timeRemaining,
          //   endTime: new Date(endTime * 1000).toLocaleString()
          // })
          
          return processedAuction
        } catch (error) {
          console.error(`❌ Error fetching auction ${id}:`, error)
          return null
        }
      })
      
      const results = await Promise.all(auctionPromises)
      const validAuctions = results.filter((auction): auction is ProcessedAuction => auction !== null)
      
     // console.log(`🎉 Successfully fetched ${validAuctions.length} valid auctions`)
      setAuctions(validAuctions)
    } catch (error) {
      console.error('❌ Error fetching all auctions:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch auctions')
    } finally {
      setLoading(false)
    }
  }, [publicClient, address])

  useEffect(() => {
    fetchAllAuctions()
  }, [fetchAllAuctions])

  return {
    auctions,
    loading,
    error,
    refetch: fetchAllAuctions
  }
}

// ✅ Hook for fetching multiple auctions (keep existing for compatibility)
export function useActiveAuctions(auctionType?: AuctionType) {
  const publicClient = usePublicClient()
  const { address } = useAccount()
  
  const [auctions, setAuctions] = useState<ProcessedAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuctions = useCallback(async () => {
    if (!publicClient) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Get auction IDs based on type
      let auctionIds: bigint[]
      
      if (auctionType !== undefined) {
        auctionIds = await publicClient.readContract({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'getActiveAuctionsByType',
          args: [auctionType]
        }) as bigint[]
      } else {
        auctionIds = await publicClient.readContract({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'getActiveAuctions'
        }) as bigint[]
      }
      
      if (auctionIds.length === 0) {
        setAuctions([])
        return
      }
      
      // Fetch all auction details
      const auctionPromises = auctionIds.map(async (id) => {
        try {
          const auctionData = await publicClient.readContract({
            address: SEALED_BID_AUCTION_CONFIG.address,
            abi: SEALED_BID_AUCTION_CONFIG.abi,
            functionName: 'getAuction',
            args: [id]
          }) as Auction
          
          // Get token IDs
          const tokenIds = await publicClient.readContract({
            address: SEALED_BID_AUCTION_CONFIG.address,
            abi: SEALED_BID_AUCTION_CONFIG.abi,
            functionName: 'getAuctionTokenIds',
            args: [id]
          }) as bigint[]
          
          // Get user's bid if exists
          let userBid: SealedBid | undefined
          if (address) {
            try {
              const bidData = await publicClient.readContract({
                address: SEALED_BID_AUCTION_CONFIG.address,
                abi: SEALED_BID_AUCTION_CONFIG.abi,
                functionName: 'getMyBid',
                args: [id]
              }) as SealedBid
              
              if (bidData.bidder !== '0x0000000000000000000000000000000000000000') {
                userBid = bidData
              }
            } catch {
              // User has no bid
            }
          }
          
          // Calculate time remaining
          const now = Math.floor(Date.now() / 1000)
          const endTime = Number(auctionData.endTime)
          const timeRemaining = Math.max(0, endTime - now)
          
          // Fetch basic NFT metadata (just name for listing)
          let nftMetadata: NFTMetadata = {
            name: tokenIds.length > 1 ? `NFT Collection (${tokenIds.length} items)` : 'NFT',
            description: tokenIds.length > 1 ? `Collection of ${tokenIds.length} NFTs` : 'NFT for auction',
            image: '/placeholder.svg'
          }
          
          try {
            const tokenId = tokenIds[0]
            const tokenURI = await publicClient.readContract({
              address: auctionData.nftContract as Address,
              abi: [
                {
                  name: 'tokenURI',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [{ type: 'uint256', name: 'tokenId' }],
                  outputs: [{ type: 'string', name: '' }]
                }
              ],
              functionName: 'tokenURI',
              args: [tokenId]
            })

            if (tokenURI && typeof tokenURI === 'string') {
              let metadataUrl = tokenURI
              if (metadataUrl.startsWith('ipfs://')) {
                metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              
              const response = await fetch(metadataUrl)
              const metadata = await response.json()
              
              if (metadata.image?.startsWith('ipfs://')) {
                metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              
              if (tokenIds.length > 1) {
                metadata.name = `${metadata.name || 'NFT Collection'} (${tokenIds.length} items)`
                metadata.description = `Collection of ${tokenIds.length} NFTs. ${metadata.description || ''}`
              }
              
              nftMetadata = metadata
            }
          } catch (error) {
            console.warn(`Failed to fetch metadata for auction ${id}:`, error)
          }
          
          const processedAuction: ProcessedAuction = {
            ...auctionData,
            timeRemaining,
            isActive: auctionData.state === AuctionState.ACTIVE && timeRemaining > 0,
            isFinalized: auctionData.state === AuctionState.FINALIZED,
            isCancelled: auctionData.state === AuctionState.CANCELLED,
            userCanBid: address ? 
              auctionData.state === AuctionState.ACTIVE && 
              timeRemaining > 0 && 
              auctionData.seller.toLowerCase() !== address.toLowerCase() : false,
            userBid,
            nftMetadata,
            finalPrice: auctionData.state === AuctionState.FINALIZED && auctionData.highestBid > 0 
              ? formatEther(auctionData.highestBid) 
              : undefined,
            isCollection: auctionData.auctionType === AuctionType.COLLECTION,
            nftCount: tokenIds.length,
            tokenIdsList: tokenIds
          }
          
          return processedAuction
        } catch (error) {
          console.error(`Error fetching auction ${id}:`, error)
          return null
        }
      })
      
      const results = await Promise.all(auctionPromises)
      const validAuctions = results.filter((auction): auction is ProcessedAuction => auction !== null)
      
      setAuctions(validAuctions)
    } catch (error) {
      console.error('Error fetching auctions:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch auctions')
    } finally {
      setLoading(false)
    }
  }, [publicClient, address, auctionType])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  return {
    auctions,
    loading,
    error,
    refetch: fetchAuctions
  }
}

// ✅ Hook for user's auctions (created by user)
// export function useUserAuctions(userAddress?: string) {
//   const { address } = useAccount()
//  //const targetAddress = userAddress || address
  
//   return useActiveAuctions() // You might want to create a specific hook for this
// }

// ✅ Hook for user's bids (auctions user has bid on)
// export function useUserBids(userAddress?: string) {
//   //const { address } = useAccount()
//   //const targetAddress = userAddress || address
  
//   return useActiveAuctions() // You might want to create a specific hook for this
// }