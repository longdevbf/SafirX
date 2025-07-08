"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMarketplaceNFTs } from '@/hooks/use-market'
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
  
  // Lấy dữ liệu từ hook gốc
  const {
    nfts,
    loading,
    error,
    collections,
    rarities,
    refetch,
    total
  } = useMarketplaceNFTs()

  // Thêm biến state để giả lập phân trang
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasLoaded, setHasLoaded] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  
  // Set initialized when first batch of NFTs is loaded
  useEffect(() => {
    if (!loading && nfts.length > 0) {
      setIsInitialized(true)
      setHasLoaded(true)
    }
  }, [loading, nfts])

  // Begin loading immediately when component mounts
  useEffect(() => {
  }, [])
  
  // Tạo hàm loadMoreNFTs giả (sẽ không cần trong cách tiếp cận này)
  const loadMoreNFTs = async (): Promise<void> => {
    setPageLoading(true)
    try {
      // Chúng ta không thực sự load thêm vì hook gốc đã load hết
      console.log("🔄 Simulating loading more NFTs...")
      // Tạm dừng để giả lập loading
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setPageLoading(false)
    }
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
        hasMore: false, // Không cần phân trang vì load tất cả
        isInitialized,
        total,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}