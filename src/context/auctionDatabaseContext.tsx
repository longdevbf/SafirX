"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWallet } from './walletContext'

// ✅ Database auction interface
export interface DatabaseAuction {
  id: number
  auction_id: number
  auction_type: 'SINGLE_NFT' | 'COLLECTION'
  title: string
  description: string
  seller_address: string
  nft_contract: string
  token_id: number | null
  token_ids: number[] | null
  nft_count: number
  collection_image_url: string | null
  starting_price: string
  reserve_price: string
  min_bid_increment: string
  start_time: string
  end_time: string
  duration_hours: number
  state: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED'
  allow_public_reveal: boolean
  winner_address: string | null
  final_price: string | null
  total_bids: number
  unique_bidders: number
  nft_metadata: Record<string, unknown> | null
  nft_metadata_individuals?: any[] | null
  creation_tx_hash: string
  finalization_tx_hash: string | null
  created_at: string
  updated_at: string
  finalized_at: string | null
  
  // Computed fields
  timeRemaining: number
  isActive: boolean
  isEnded: boolean
  isFinalized: boolean
  isCancelled: boolean
  tokenIds: number[]
  
  // Aliases for compatibility with existing code
  seller: string // Alias for seller_address
  totalBids: bigint | number // Alias for total_bids  
  formattedStartingPrice: string
  formattedReservePrice: string
  formattedFinalPrice: string
  formattedMinBidIncrement: string
  isCollection: boolean
}

// ✅ Grouped auctions
export interface GroupedAuctions {
  active: DatabaseAuction[]
  ended: DatabaseAuction[]
  finalized: DatabaseAuction[]
  cancelled: DatabaseAuction[]
}

// ✅ Bid history interface
export interface BidHistory {
  id: number
  auction_id: number
  bidder_address: string
  bid_amount: string
  bid_number: number
  bid_timestamp: string
  visibility: 'HIDDEN' | 'REVEALED' | 'AUTO_REVEALED'
  synced_at: string
}

// ✅ Context interface
interface AuctionDatabaseContextType {
  // Auctions
  auctions: DatabaseAuction[]
  groupedAuctions: GroupedAuctions
  loading: boolean
  error: string | null
  
  // Actions
  refetch: () => Promise<void>
  fetchUserAuctions: (address: string) => Promise<DatabaseAuction[]>
  fetchBidHistory: (auctionId: number) => Promise<BidHistory[]>
  
  // Real-time updates
  updateAuctionState: (auctionId: number, state: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED') => void
  
  // Stats
  stats: {
    totalActive: number
    totalEnded: number
    totalFinalized: number
    userAuctions: number
  }
}

const AuctionDatabaseContext = createContext<AuctionDatabaseContextType | undefined>(undefined)

// ✅ Provider component
export function AuctionDatabaseProvider({ children }: { children: ReactNode }) {
  const [auctions, setAuctions] = useState<DatabaseAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { address } = useWallet()

  // ✅ Fetch auctions from database
  const fetchAuctions = useCallback(async (params?: {
    state?: string
    seller?: string
    type?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      if (params?.state) searchParams.set('state', params.state)
      if (params?.seller) searchParams.set('seller', params.seller)
      if (params?.type) searchParams.set('type', params.type)

      const response = await fetch(`/api/auctions?${searchParams.toString()}`)
      const data = await response.json()

      if (data.success) {
        console.log(`✅ Loaded ${data.auctions.length} auctions from database`)
        
        // ✅ Process auctions with computed properties
        const processedAuctions = data.auctions.map((auction: DatabaseAuction) => {
          const now = Date.now()
          const endTime = new Date(auction.end_time).getTime()
          const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000))
          
          return {
            ...auction,
            // Computed time fields
            timeRemaining,
            isActive: auction.state === 'ACTIVE' && timeRemaining > 0,
            isEnded: auction.state === 'ENDED' || (auction.state === 'ACTIVE' && timeRemaining === 0),
            isFinalized: auction.state === 'FINALIZED',
            isCancelled: auction.state === 'CANCELLED',
            
            // Token IDs processing
            tokenIds: auction.token_ids || (auction.token_id ? [auction.token_id] : []),
            
            // Aliases for compatibility
            seller: auction.seller_address,
            totalBids: auction.total_bids || 0,
            
            // Formatted prices
            formattedStartingPrice: `${auction.starting_price} ROSE`,
            formattedReservePrice: `${auction.reserve_price} ROSE`,
            formattedFinalPrice: auction.final_price ? `${auction.final_price} ROSE` : 'N/A',
            formattedMinBidIncrement: `${auction.min_bid_increment} ROSE`,
            
            // Type helpers
            isCollection: auction.auction_type === 'COLLECTION'
          }
        })
        
        setAuctions(processedAuctions)
      } else {
        throw new Error(data.error || 'Failed to fetch auctions')
      }

    } catch (error) {
      console.error('❌ Error fetching auctions:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch auctions')
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ Fetch user's auctions
  const fetchUserAuctions = useCallback(async (userAddress: string): Promise<DatabaseAuction[]> => {
    try {
      const response = await fetch(`/api/auctions?seller=${userAddress}`)
      const data = await response.json()

      if (data.success) {
        return data.auctions
      } else {
        throw new Error(data.error || 'Failed to fetch user auctions')
      }

    } catch (error) {
      console.error('❌ Error fetching user auctions:', error)
      return []
    }
  }, [])

  // ✅ Fetch bid history for an auction
  const fetchBidHistory = useCallback(async (auctionId: number): Promise<BidHistory[]> => {
    try {
      const response = await fetch(`/api/auctions/bids?auctionId=${auctionId}`)
      const data = await response.json()

      if (data.success) {
        return data.bidHistory
      } else {
        console.warn('No bid history found for auction:', auctionId)
        return []
      }

    } catch (error) {
      console.error('❌ Error fetching bid history:', error)
      return []
    }
  }, [])

  // ✅ Update auction state in real-time
  const updateAuctionState = useCallback((auctionId: number, newState: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED') => {
    setAuctions(prev => prev.map(auction => 
      auction.auction_id === auctionId 
        ? { 
            ...auction, 
            state: newState,
            isActive: newState === 'ACTIVE',
            isEnded: newState === 'ENDED',
            isFinalized: newState === 'FINALIZED',
            isCancelled: newState === 'CANCELLED'
          }
        : auction
    ))
  }, [])

  // ✅ Group auctions by state
  const groupedAuctions: GroupedAuctions = {
    active: auctions.filter(a => a.state === 'ACTIVE' && a.timeRemaining > 0),
    ended: auctions.filter(a => a.state === 'ENDED' || (a.state === 'ACTIVE' && a.timeRemaining <= 0)),
    finalized: auctions.filter(a => a.state === 'FINALIZED'),
    cancelled: auctions.filter(a => a.state === 'CANCELLED')
  }

  // ✅ Calculate stats
  const stats = {
    totalActive: groupedAuctions.active.length,
    totalEnded: groupedAuctions.ended.length,
    totalFinalized: groupedAuctions.finalized.length,
    userAuctions: address ? auctions.filter(a => a.seller_address.toLowerCase() === address.toLowerCase()).length : 0
  }

  // ✅ Auto-refresh timer for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      
      setAuctions(prev => prev.map(auction => {
        const endTime = new Date(auction.end_time).getTime()
        const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000))
        
        return {
          ...auction,
          timeRemaining,
          isActive: auction.state === 'ACTIVE' && timeRemaining > 0,
          isEnded: auction.state === 'ENDED' || (auction.state === 'ACTIVE' && timeRemaining === 0)
        }
      }))
    }, 1000) // Update every second for countdown

    return () => clearInterval(interval)
  }, [])

  // ✅ Initial fetch
  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  const contextValue: AuctionDatabaseContextType = {
    auctions,
    groupedAuctions,
    loading,
    error,
    refetch: () => fetchAuctions(),
    fetchUserAuctions,
    fetchBidHistory,
    updateAuctionState,
    stats
  }

  return (
    <AuctionDatabaseContext.Provider value={contextValue}>
      {children}
    </AuctionDatabaseContext.Provider>
  )
}

// ✅ Hook to use auction context
export function useAuctionDatabase() {
  const context = useContext(AuctionDatabaseContext)
  if (context === undefined) {
    throw new Error('useAuctionDatabase must be used within an AuctionDatabaseProvider')
  }
  return context
}

// ✅ Hook for specific auction states
export function useAuctionsByState(state: 'ACTIVE' | 'ENDED' | 'FINALIZED' | 'CANCELLED') {
  const { groupedAuctions, loading, error } = useAuctionDatabase()
  
  return {
    auctions: groupedAuctions[state.toLowerCase() as keyof GroupedAuctions],
    loading,
    error
  }
}

// ✅ Hook for user's auctions
export function useUserAuctions(userAddress?: string) {
  const { auctions, loading, error } = useAuctionDatabase()
  const { address } = useWallet()
  
  const targetAddress = userAddress || address
  const userAuctions = targetAddress 
    ? auctions.filter(a => a.seller_address.toLowerCase() === targetAddress.toLowerCase())
    : []

  return {
    auctions: userAuctions,
    loading,
    error
  }
}

// ✅ Hook for auction countdown
export function useAuctionCountdown(endTime: string) {
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now()
      const end = new Date(endTime).getTime()
      const remaining = Math.max(0, Math.floor((end - now) / 1000))
      setTimeRemaining(remaining)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  // ✅ Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Ended"
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  return {
    timeRemaining,
    formatted: formatTimeRemaining(timeRemaining),
    isEnded: timeRemaining <= 0
  }
}