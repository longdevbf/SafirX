"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAllAuctions, ProcessedAuction } from '@/hooks/use-auction'
import { useWallet } from '@/context/walletContext'

// Define context type
interface AuctionContextType {
  auctions: ProcessedAuction[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  groupedAuctions: {
    active: ProcessedAuction[]
    ended: ProcessedAuction[]
    finalized: ProcessedAuction[]
  }
  isInitialized: boolean
}

// Create context with default values
const AuctionContext = createContext<AuctionContextType>({
  auctions: [],
  loading: true,
  error: null,
  refetch: async () => {},
  groupedAuctions: { active: [], ended: [], finalized: [] },
  isInitialized: false
})

// Context provider component
export function AuctionProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { address, isConnected } = useWallet()
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Use the existing hook
  const { auctions, loading, error, refetch } = useAllAuctions()
  
  // Group auctions by state
  const groupedAuctions = React.useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    
    const active = auctions.filter(auction => {
      const endTime = Number(auction.endTime)
      const timeRemaining = Math.max(0, endTime - now)
      const isActiveState = auction.state === 0
      return isActiveState && timeRemaining > 0
    })
    
    const ended = auctions.filter(auction => {
      const endTime = Number(auction.endTime)
      const timeRemaining = Math.max(0, endTime - now)
      const isActiveState = auction.state === 0
      return isActiveState && timeRemaining <= 0
    })
    
    const finalized = auctions.filter(auction => {
      return auction.state === 1 || auction.state === 2
    })
    
    return { active, ended, finalized }
  }, [auctions])

  // Mark as initialized after first load
  useEffect(() => {
    if (!loading && !isInitialized) {
      setIsInitialized(true)
    }
  }, [loading, isInitialized])
  
  // Refresh data periodically
  useEffect(() => {
    if (!isConnected) return

    // Refresh auctions every 60 seconds
    const intervalId = setInterval(() => {
      refetch()
    }, 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [isConnected, refetch])

  return (
    <AuctionContext.Provider 
      value={{ 
        auctions, 
        loading, 
        error, 
        refetch, 
        groupedAuctions,
        isInitialized
      }}
    >
      {children}
    </AuctionContext.Provider>
  )
}

// Custom hook to use the auction context
export function useAuction() {
  return useContext(AuctionContext)
}

// Export default for dynamic import
export default {
  AuctionProvider,
  useAuction
}