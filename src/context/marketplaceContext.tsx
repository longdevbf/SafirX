"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMarketplaceDB } from '@/hooks/use-marketplace-db'
import { ProcessedNFT } from '@/interfaces/nft'

// Define context type
interface MarketplaceContextType {
  nfts: ProcessedNFT[]
  loading: boolean
  pageLoading: boolean
  hasMore: boolean
  error: string | null
  collections: string[]
  rarities: string[]
  loadMoreNFTs: () => Promise<void>
  refetch: () => Promise<void>
  isInitialized: boolean
  total: number
  likeNFT: (listingId: string) => Promise<number>
  updateNFTPrice: (listingId: string, newPrice: string) => Promise<unknown>
  cancelNFTListing: (listingId: string) => Promise<boolean>
  buyNFT: (listingId: string, buyerAddress: string) => Promise<unknown>
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
  likeNFT: async () => 0,
  updateNFTPrice: async () => null,
  cancelNFTListing: async () => false,
  buyNFT: async () => null,
})

export const useMarketplace = () => useContext(MarketplaceContext)

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Use database hook instead of blockchain
  const {
    nfts,
    loading,
    error,
    collections: dbCollections,
    rarities,
    loadMoreNFTs: dbLoadMore,
    refetch: dbRefetch,
    hasMore,
    total,
    likeNFT,
    updateNFTPrice,
    cancelNFTListing,
    buyNFT
  } = useMarketplaceDB()

  const [pageLoading, setPageLoading] = useState(false)
  
  // Set initialized when first batch of NFTs is loaded
  useEffect(() => {
    if (!loading && nfts.length >= 0) { // Allow empty arrays to be initialized
      setIsInitialized(true)
    }
  }, [loading, nfts])

  // Extract collection names from database collections
  const collections = dbCollections.map((col: { name: string }) => col.name)
  
  // Wrapper for loadMoreNFTs with page loading state
  const loadMoreNFTs = async (): Promise<void> => {
    if (!hasMore || pageLoading) return
    
    setPageLoading(true)
    try {
      await dbLoadMore()
    } finally {
      setPageLoading(false)
    }
  }

  // Wrapper for refetch
  const refetch = async (): Promise<void> => {
    await dbRefetch()
  }

      return (
      <MarketplaceContext.Provider
        value={{
          nfts,
          loading,
          pageLoading,
          error,
          collections,
          rarities,
          loadMoreNFTs,
          refetch,
          hasMore,
          isInitialized,
          total,
          likeNFT,
          updateNFTPrice,
          cancelNFTListing,
          buyNFT,
        }}
      >
        {children}
      </MarketplaceContext.Provider>
    )
}