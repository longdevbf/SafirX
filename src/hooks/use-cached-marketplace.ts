import { useState, useEffect, useCallback } from 'react'
import { ProcessedNFT } from '@/interfaces/nft'

interface CachedMarketplaceState {
  nfts: ProcessedNFT[]
  loading: boolean
  error: string | null
  collections: string[]
  rarities: string[]
  total: number
}

interface CachedMarketplaceOptions {
  limit?: number
  offset?: number
  collection?: string
  seller?: string
  search?: string
  includeAuctions?: boolean
}

export function useCachedMarketplace(options: CachedMarketplaceOptions = {}) {
  const [state, setState] = useState<CachedMarketplaceState>({
    nfts: [],
    loading: true,
    error: null,
    collections: [],
    rarities: [],
    total: 0
  })

  const fetchCachedData = useCallback(async (opts: CachedMarketplaceOptions = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { limit = 50, offset = 0, collection, seller, search, includeAuctions = false } = opts

      // Fetch listings from cache
      const listingsParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(collection && { collection }),
        ...(seller && { seller }),
        ...(search && { search })
      })

      const listingsResponse = await fetch(`/api/cache/listings?${listingsParams}`)
      const listingsData = await listingsResponse.json()

      let allNFTs: ProcessedNFT[] = []
      
      if (listingsData.success) {
        allNFTs = [...listingsData.data]
      } else {
        throw new Error(listingsData.error || 'Failed to fetch listings')
      }

      // Optionally fetch auctions
      if (includeAuctions) {
        const auctionsParams = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          ...(seller && { seller })
        })

        const auctionsResponse = await fetch(`/api/cache/auctions?${auctionsParams}`)
        const auctionsData = await auctionsResponse.json()

        if (auctionsData.success) {
          allNFTs = [...allNFTs, ...auctionsData.data]
        }
      }

      // Extract collections and rarities
      const collectionsSet = new Set<string>()
      const raritiesSet = new Set<string>()

      allNFTs.forEach(nft => {
        if (nft.collectionName) collectionsSet.add(nft.collectionName)
        if (nft.rarity) raritiesSet.add(nft.rarity)
      })

      setState({
        nfts: allNFTs,
        loading: false,
        error: null,
        collections: Array.from(collectionsSet),
        rarities: Array.from(raritiesSet),
        total: allNFTs.length
      })

    } catch (error) {
      console.error('Error fetching cached marketplace data:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load marketplace data'
      }))
    }
  }, [])

  const refetch = useCallback(() => {
    fetchCachedData(options)
  }, [fetchCachedData, options])

  useEffect(() => {
    fetchCachedData(options)
  }, [fetchCachedData, options])

  return {
    nfts: state.nfts,
    loading: state.loading,
    error: state.error,
    collections: state.collections,
    rarities: state.rarities,
    total: state.total,
    refetch
  }
}

// Hook for syncing data to cache after transactions
export function useCacheSync() {
  const syncListing = useCallback(async (blockchainId: string, data: any) => {
    try {
      const response = await fetch('/api/cache/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'listing',
          blockchainId,
          data
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error('Error syncing listing:', error)
      throw error
    }
  }, [])

  const syncAuction = useCallback(async (blockchainId: string, data: any) => {
    try {
      const response = await fetch('/api/cache/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auction',
          blockchainId,
          data
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error('Error syncing auction:', error)
      throw error
    }
  }, [])

  const updateCachedData = useCallback(async (type: 'listing' | 'auction', blockchainId: string, updates: any) => {
    try {
      const response = await fetch('/api/cache/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          blockchainId,
          updates
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('Error updating cached data:', error)
      throw error
    }
  }, [])

  return {
    syncListing,
    syncAuction,
    updateCachedData
  }
}

// Hook for user-specific cached data
export function useUserCachedData(userAddress?: string) {
  const [listings, setListings] = useState<ProcessedNFT[]>([])
  const [auctions, setAuctions] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = useCallback(async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      setError(null)

      // Fetch user's listings
      const listingsResponse = await fetch(`/api/cache/listings?seller=${userAddress}`)
      const listingsData = await listingsResponse.json()

      // Fetch user's auctions
      const auctionsResponse = await fetch(`/api/cache/auctions?seller=${userAddress}`)
      const auctionsData = await auctionsResponse.json()

      if (listingsData.success) {
        setListings(listingsData.data)
      }

      if (auctionsData.success) {
        setAuctions(auctionsData.data)
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  return {
    listings,
    auctions,
    loading,
    error,
    refetch: fetchUserData
  }
}