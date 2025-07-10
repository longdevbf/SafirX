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

interface DatabaseListing {
  listing_id: string
  nft_contract: string
  token_id: string
  seller: string
  price: string
  collection_name?: string
  name: string
  description?: string
  category?: string
  image: string
  attributes?: string
  rarity?: string
  is_active: boolean
  is_bundle: boolean
  bundle_token_ids?: string
  collection_image?: string
  cover_image_url?: string
  bundle_price?: string
  individual_images?: string
  individual_metadata?: string
  nft_names?: string
  nft_descriptions?: string
  token_ids_array?: string
  individual_prices?: string
  collection_type?: string
  views_count?: number
  likes_count?: number
}

interface MarketplaceResponse {
  listings: DatabaseListing[]
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

interface CollectionDetail {
  id: string
  name: string
  description: string
  image: string
  price: string
  seller: string
  isBundle: boolean
  canPurchase: boolean
  isActive: boolean
  likes: number
  views: number
  collectionId?: string
  listingId?: string
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
      const processedNFTs: ProcessedNFT[] = data.listings.map(listing => {
        const nft: ProcessedNFT = {
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
          description: listing.description || '',
          attributes: [],
          rarity: listing.rarity || 'Common',
          verified: Boolean(listing.collection_name),
          isBundle: listing.is_bundle,
          isFromCollection: Boolean(listing.collection_name && listing.collection_name !== 'Single NFT'),
          views: listing.views_count || 0,
          likes: listing.likes_count || 0,
          canPurchase: listing.is_active,
        }

        // Parse attributes safely
        try {
          if (listing.attributes && typeof listing.attributes === 'string') {
            nft.attributes = JSON.parse(listing.attributes)
          }
        } catch (e) {
          console.warn('Failed to parse attributes for listing:', listing.listing_id)
          nft.attributes = []
        }

        // Add bundle-specific fields
        if (listing.is_bundle) {
          nft.collectionId = listing.listing_id
          // Use cover_image_url for collection display
          nft.image = listing.cover_image_url || listing.collection_image || listing.image
          // Use bundle_price for collection pricing
          nft.price = listing.bundle_price || listing.price
          
          try {
            if (listing.bundle_token_ids) {
              nft.bundleTokenIds = listing.bundle_token_ids.split(',').map(id => id.trim())
            }
          } catch (e) {
            console.warn('Failed to parse bundle_token_ids for listing:', listing.listing_id)
            nft.bundleTokenIds = []
          }
        }

        return nft
      })

      if (page === 1) {
        setNfts(processedNFTs)
      } else {
        setNfts(prev => [...prev, ...processedNFTs])
      }

      setPagination(data.pagination)
      
      // Extract unique rarities
      const uniqueRarities = Array.from(new Set(processedNFTs.map(nft => nft.rarity).filter((rarity): rarity is string => Boolean(rarity))))
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

  // Update NFT price
  const updateNFTPrice = useCallback(async (listingId: string, newPrice: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: newPrice })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update price')
      }

      const data = await response.json()
      
      // Update local state
      setNfts(prev => prev.map(nft => 
        nft.listingId === listingId 
          ? { ...nft, price: newPrice }
          : nft
      ))

      return data.listing
    } catch (err) {
      console.error('Error updating NFT price:', err)
      throw err
    }
  }, [])

  // Cancel NFT listing
  const cancelNFTListing = useCallback(async (listingId: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel listing')
      }

      // Remove from local state
      setNfts(prev => prev.filter(nft => nft.listingId !== listingId))

      return true
    } catch (err) {
      console.error('Error cancelling NFT listing:', err)
      throw err
    }
  }, [])

  // Buy NFT
  const buyNFT = useCallback(async (listingId: string, buyerAddress: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ buyer: buyerAddress })
      })
      
      if (!response.ok) {
        throw new Error('Failed to buy NFT')
      }

      const data = await response.json()
      
      // Remove from local state (bought NFTs are no longer active)
      setNfts(prev => prev.filter(nft => nft.listingId !== listingId))

      return data.listing
    } catch (err) {
      console.error('Error buying NFT:', err)
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
    updateNFTPrice,
    cancelNFTListing,
    buyNFT,
    hasMore: pagination.hasNext,
    total: pagination.totalCount
  }
}

export function useCollectionDetailFromDB(collectionId?: string) {
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [collectionItems, setCollectionItems] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBundle = collection?.isBundle || false
  const totalItems = collectionItems.length
  const soldItems = collectionItems.filter(item => !item.isActive).length

  useEffect(() => {
    if (!collectionId) return

    const fetchCollectionDetail = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch collection/listing data from API
        const response = await fetch(`/api/listings/${collectionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch collection data')
        }

        const data = await response.json()
        
        if (data.listing) {
          // Transform database listing to collection format
          const listing = data.listing
          
          setCollection({
            id: listing.listing_id,
            name: listing.name,
            description: listing.description || '',
            image: listing.cover_image_url || listing.collection_image || listing.image || '/placeholder.svg',
            price: listing.is_bundle ? (listing.bundle_price || listing.price) : listing.price,
            seller: listing.seller,
            isBundle: listing.is_bundle,
            canPurchase: listing.is_active,
            isActive: listing.is_active,
            likes: listing.likes_count || 0,
            views: listing.views_count || 0,
            collectionId: listing.is_bundle ? listing.listing_id : undefined,
            listingId: listing.listing_id
          })

          // If it's a bundle, fetch individual items
          if (listing.is_bundle) {
            const items: ProcessedNFT[] = []
            
            if (listing.bundle_token_ids) {
              const tokenIds = listing.bundle_token_ids.split(',')
              const individualPrices = listing.individual_prices ? 
                JSON.parse(listing.individual_prices) : []
              const individualImages = listing.individual_images ? 
                JSON.parse(listing.individual_images) : []
              const individualNames = listing.nft_names ? 
                JSON.parse(listing.nft_names) : []

              tokenIds.forEach((tokenId: string, index: number) => {
                items.push({
                  id: `${listing.listing_id}-${tokenId}`,
                  listingId: `${listing.listing_id}-${tokenId}`,
                  name: individualNames[index] || `${listing.name} #${tokenId}`,
                  contractAddress: listing.nft_contract,
                  tokenId,
                  seller: listing.seller,
                  price: '', // No individual price for bundle items - will show token ID instead
                  collectionName: listing.collection_name,
                  image: individualImages[index] || listing.cover_image_url || listing.image,
                  isActive: listing.is_active,
                  collection: listing.collection_name?.toLowerCase().replace(/\s+/g, '-') || 'collection',
                  description: listing.description || '',
                  attributes: [
                    { trait_type: 'Token ID', value: tokenId },
                    { trait_type: 'Bundle Position', value: (index + 1).toString() }
                  ],
                  rarity: 'Bundle Item',
                  verified: true,
                  isBundle: false,
                  isFromCollection: true,
                  views: 0,
                  likes: 0,
                  canPurchase: false, // Bundle items can't be purchased individually
                })
              })
            }
            
            setCollectionItems(items)
          } else {
            // Single NFT
            setCollectionItems([{
              id: listing.listing_id,
              listingId: listing.listing_id,
              name: listing.name,
              contractAddress: listing.nft_contract,
              tokenId: listing.token_id,
              seller: listing.seller,
              price: listing.price,
              collectionName: listing.collection_name,
              image: listing.image,
              isActive: listing.is_active,
              collection: listing.collection_name?.toLowerCase().replace(/\s+/g, '-') || 'single',
              description: listing.description || '',
              attributes: listing.attributes ? JSON.parse(listing.attributes) : [],
              rarity: listing.rarity || 'Common',
              verified: true,
              isBundle: false,
              views: listing.views_count || 0,
              likes: listing.likes_count || 0,
              canPurchase: listing.is_active,
            }])
          }
        }
      } catch (err) {
        console.error('Error fetching collection detail:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch collection')
      } finally {
        setLoading(false)
      }
    }

    fetchCollectionDetail()
  }, [collectionId])

  return {
    collection,
    collectionItems,
    loading,
    error,
    isBundle,
    totalItems,
    soldItems
  }
}