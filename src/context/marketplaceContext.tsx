"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useCachedMarketplace } from '@/hooks/use-cached-marketplace'
import { ProcessedNFT } from '@/interfaces/nft'

// Define context type
interface MarketplaceContextType {
  nfts: ProcessedNFT[]
  loading: boolean
  pageLoading: boolean // Giữ nguyên, sẽ sửa ở phần khác
  hasMore: boolean     // Giữ nguyên, sẽ sửa ở phần khác
  error: string | null
  collections: string[]
  rarities: string[]
  loadMoreNFTs: () => Promise<void>
  refetch: () => Promise<void>
  isInitialized: boolean
  total: number // Thêm total vào để truy cập
}

// Create context with default values
const MarketplaceContext = createContext<MarketplaceContextType>({
  nfts: [],
  loading: true,
  pageLoading: false,
  hasMore: false,
  error: null,
  collections: [],
  rarities: [],
  loadMoreNFTs: async () => {},
  refetch: async () => {},
  isInitialized: false,
  total: 0,
})

export const useMarketplace = () => useContext(MarketplaceContext)

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [allNFTs, setAllNFTs] = useState<ProcessedNFT[]>([])
  const [pageLoading, setPageLoading] = useState(false)
  const ITEMS_PER_PAGE = 50
  
  // ✅ Memoize options để tránh re-render
  const cachedOptions = useMemo(() => ({
    limit: ITEMS_PER_PAGE,
    offset: currentOffset,
    includeAuctions: true
  }), [currentOffset, ITEMS_PER_PAGE])
  
  // ✅ USE CACHED DATA INSTEAD OF BLOCKCHAIN - FAST!
  const {
    nfts,
    loading,
    error,
    collections,
    rarities,
    refetch,
    total
  } = useCachedMarketplace(cachedOptions)
  
  // ✅ Accumulate NFTs when new batch loads
  useEffect(() => {
    if (!loading && nfts.length > 0) {
      setIsInitialized(true)
      // If this is a new page load, append to existing NFTs
      if (currentOffset > 0) {
        setAllNFTs((prev: ProcessedNFT[]) => [...prev, ...nfts])
      } else {
        // First load, replace all
        setAllNFTs(nfts)
      }
    }
  }, [loading, nfts, currentOffset])

  // Begin loading immediately when component mounts
  useEffect(() => {
  }, [])
  
  // ✅ Proper loadMore implementation with pagination
  const loadMoreNFTs = async (): Promise<void> => {
    if (pageLoading || loading) return
    
    setPageLoading(true)
    try {
      const nextOffset = currentOffset + ITEMS_PER_PAGE
      setCurrentOffset(nextOffset)
    } finally {
      setPageLoading(false)
    }
  }
  
  // ✅ Calculate if there are more items to load
  const hasMore = allNFTs.length < total && total > 0

  return (
    <MarketplaceContext.Provider
      value={{
        nfts: allNFTs, // ✅ USE ACCUMULATED NFTs
        loading,
        pageLoading,
        error,
        collections,
        rarities,
        loadMoreNFTs,
        refetch: async () => {
          setCurrentOffset(0)
          setAllNFTs([])
          await refetch()
        },
        hasMore, // ✅ PROPER PAGINATION CHECK
        isInitialized,
        total,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}