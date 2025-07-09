import { useState, useEffect, useCallback } from 'react'
import { ProcessedNFT } from '@/interfaces/nft'

interface MarketplaceFilters {
  category?: string
  collection?: string
  rarity?: string
  priceMin?: number
  priceMax?: number
  search?: string
}

interface MarketplacePagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface MarketplaceResponse {
  listings: any[]
  pagination: MarketplacePagination
}

interface CollectionSummary {
  name: string
  totalItems: number
  floorPrice: number
  ceilingPrice: number
  avgPrice: number
  totalLikes: number
  totalViews: number
  image: string
}

export function useMarketplaceDB() {
  const [nfts, setNfts] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<MarketplacePagination>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [rarities, setRarities] = useState<string[]>([])

  // Fetch NFT listings from database
  const fetchListings = useCallback(async (filters: MarketplaceFilters = {}, page: number = 1) => {
    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.category && { category: filters.category }),
        ...(filters.collection && { collection: filters.collection }),
        ...(filters.rarity && { rarity: filters.rarity }),
        ...(filters.priceMin && { priceMin: filters.priceMin.toString() }),
        ...(filters.priceMax && { priceMax: filters.priceMax.toString() }),
        ...(filters.search && { search: filters.search })
      })

      const response = await fetch(`/api/listings?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch listings')
      }

      const data: MarketplaceResponse = await response.json()
      
      // Transform database listings to ProcessedNFT format
      const processedNFTs: ProcessedNFT[] = data.listings.map(listing => ({
        id: listing.listing_id,
        listingId: listing.listing_id,
        name: listing.name,
        contractAddress: listing.nft_contract,
        tokenId: listing.token_id,
        seller: listing.seller,
        price: listing.price,
        collectionName: listing.collection_name || 'Single NFT',
        image: listing.image,
        isActive: listing.is_active,
        collection: (listing.collection_name || 'single-nft').toLowerCase().replace(/\s+/g, '-'),
        description: listing.description,
        attributes: listing.attributes ? JSON.parse(listing.attributes) : [],
        rarity: listing.rarity || 'Common',
        verified: Boolean(listing.collection_name),
        isBundle: listing.is_bundle,
        isFromCollection: Boolean(listing.collection_name && listing.collection_name !== 'Single NFT'),
        views: listing.views_count || 0,
        likes: listing.likes_count || 0,
        canPurchase: listing.is_active,
        ...(listing.is_bundle && {
          collectionId: listing.listing_id,
          bundleTokenIds: listing.bundle_token_ids ? JSON.parse(listing.bundle_token_ids) : []
        })
      }))

      if (page === 1) {
        setNfts(processedNFTs)
      } else {
        setNfts(prev => [...prev, ...processedNFTs])
      }

      setPagination(data.pagination)
      
      // Extract unique rarities
      const uniqueRarities = Array.from(new Set(processedNFTs.map(nft => nft.rarity).filter(Boolean)))
      setRarities(uniqueRarities)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch collections summary
  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      setCollections(data.collections)
    } catch (err) {
      console.error('Error fetching collections:', err)
    }
  }, [])

  // Load more NFTs for pagination
  const loadMoreNFTs = useCallback(async (filters: MarketplaceFilters = {}) => {
    if (pagination.hasNext && !loading) {
      await fetchListings(filters, pagination.page + 1)
    }
  }, [fetchListings, pagination.hasNext, pagination.page, loading])

  // Refetch all data
  const refetch = useCallback(async (filters: MarketplaceFilters = {}) => {
    await Promise.all([
      fetchListings(filters, 1),
      fetchCollections()
    ])
  }, [fetchListings, fetchCollections])

  // Like a listing
  const likeNFT = useCallback(async (listingId: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}/like`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to like listing')
      }

      const data = await response.json()
      
      // Update local state
      setNfts(prev => prev.map(nft => 
        nft.listingId === listingId 
          ? { ...nft, likes: data.likes_count }
          : nft
      ))

      return data.likes_count
    } catch (err) {
      console.error('Error liking NFT:', err)
      throw err
    }
  }, [])

  // Initial load
  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    nfts,
    loading,
    error,
    pagination,
    collections,
    rarities,
    fetchListings,
    loadMoreNFTs,
    refetch,
    likeNFT,
    hasMore: pagination.hasNext,
    total: pagination.totalCount
  }
}