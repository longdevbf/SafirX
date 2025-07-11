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
  buyNFT: (listingId: string) => Promise<unknown>
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
  const [nfts, setNfts] = useState<ProcessedNFT[]>([])
  
  // Use database hook instead of blockchain
  const {
    nfts: dbNfts,
    loading,
    error,
    collections: dbCollections,
    rarities,
    loadMoreNFTs: dbLoadMore,
    refetch: dbRefetch,
    hasMore,
    total,
    likeNFT,
    updateNFTPrice: _dbUpdateNFTPrice,
    cancelNFTListing: _dbCancelNFTListing,
    buyNFT: _dbBuyNFT
  } = useMarketplaceDB()
  
  // Suppress unused variable warnings
  void _dbUpdateNFTPrice
  void _dbCancelNFTListing
  void _dbBuyNFT

  // Sync database NFTs with local state
  useEffect(() => {
    if (dbNfts) {
      setNfts(dbNfts)
    }
  }, [dbNfts])

  // Enhanced functions with API calls
  const updateNFTPrice = async (listingId: string, newPrice: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update price')
      }
      
      const result = await response.json()
      
      // Update local NFT state to reflect the price change
      setNfts(prev => prev.map(nft => {
        if ((nft.listingId === listingId || nft.collectionId === listingId || nft.id === listingId)) {
          return { ...nft, price: newPrice }
        }
        return nft
      }))
      
      return result
    } catch (error) {
      console.error('Error updating price:', error)
      throw error
    }
  }

  const cancelNFTListing = async (listingId: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel listing')
      }
      
      // Remove cancelled NFT from local state
      setNfts(prev => prev.filter(nft => 
        nft.listingId !== listingId && 
        nft.collectionId !== listingId && 
        nft.id !== listingId
      ))
      
      return true
    } catch (error) {
      console.error('Error cancelling listing:', error)
      throw error
    }
  }

  const buyNFT = async (listingId: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete purchase')
      }
      
      // Remove purchased NFT from local state
      setNfts(prev => prev.filter(nft => 
        nft.listingId !== listingId && 
        nft.collectionId !== listingId && 
        nft.id !== listingId
      ))
      
      return await response.json()
    } catch (error) {
      console.error('Error completing purchase:', error)
      throw error
    }
  }

  const [pageLoading, setPageLoading] = useState(false)
  
  // Set initialized when first batch of NFTs is loaded
  useEffect(() => {
    if (!loading) { // Allow empty arrays to be initialized
      setIsInitialized(true)
    }
  }, [loading])

  // Extract collection names from database collections
  const collections = dbCollections?.map ? dbCollections.map((col: { name: string }) => col.name) : []
  
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