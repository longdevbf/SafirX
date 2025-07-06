import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { NFT_MARKET_CONFIG, ERC721_ABI, ContractListing, ContractCollectionListing, ListingInfo } from '@/abis/MarketABI'
import { ProcessedNFT } from '@/interfaces/nft'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { readContract } from 'wagmi/actions'
import { config } from '@/components/config/wagmiConfig'

export function useNFTMarket() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // ✅ LISTING FUNCTIONS
  const listSingleNFT = async (nftContract: string, tokenId: string, priceInROSE: string): Promise<void> => {
    const priceInWei = parseEther(priceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'listSingleNFT',
      args: [nftContract as `0x${string}`, BigInt(tokenId), priceInWei],
    })
  }

  const listCollectionBundle = async (
    nftContract: string,
    tokenIds: string[],
    bundlePriceInROSE: string,
    collectionName: string
  ): Promise<void> => {
    const bundlePriceInWei = parseEther(bundlePriceInROSE)
    const tokenIdsBigInt = tokenIds.map(id => BigInt(id))
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'listCollectionBundle',
      args: [nftContract as `0x${string}`, tokenIdsBigInt, bundlePriceInWei, collectionName],
    })
  }

  const listCollectionIndividual = async (
    nftContract: string,
    tokenIds: string[],
    pricesInROSE: string[],
    collectionName: string
  ): Promise<void> => {
    const pricesInWei = pricesInROSE.map(price => parseEther(price))
    const tokenIdsBigInt = tokenIds.map(id => BigInt(id))
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'listCollectionIndividual',
      args: [nftContract as `0x${string}`, tokenIdsBigInt, pricesInWei, collectionName],
    })
  }

  const listCollectionSamePrice = async (
    nftContract: string,
    tokenIds: string[],
    pricePerItemInROSE: string,
    collectionName: string
  ): Promise<void> => {
    const pricePerItemInWei = parseEther(pricePerItemInROSE)
    const tokenIdsBigInt = tokenIds.map(id => BigInt(id))
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'listCollectionSamePrice',
      args: [nftContract as `0x${string}`, tokenIdsBigInt, pricePerItemInWei, collectionName],
    })
  }

  // ✅ UNIFIED BUYING FUNCTIONS
  const buyNFTUnified = async (id: string, priceInROSE: string): Promise<void> => {
    const priceInWei = parseEther(priceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'buyNFTUnified',
      args: [BigInt(id)],
      value: priceInWei,
    })
  }

  // ✅ LEGACY BUYING FUNCTIONS (for backwards compatibility)
  const buyNFT = async (listingId: string, priceInROSE: string): Promise<void> => {
    const priceInWei = parseEther(priceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'buyNFT',
      args: [BigInt(listingId)],
      value: priceInWei,
    })
  }

  const buyCollectionBundle = async (collectionId: string, bundlePriceInROSE: string): Promise<void> => {
    const bundlePriceInWei = parseEther(bundlePriceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'buyCollectionBundle',
      args: [BigInt(collectionId)],
      value: bundlePriceInWei,
    })
  }

  // ✅ UPDATE FUNCTIONS
  const updatePrice = async (listingId: string, newPriceInROSE: string): Promise<void> => {
    const newPriceInWei = parseEther(newPriceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'updatePrice',
      args: [BigInt(listingId), newPriceInWei],
    })
  }

  const updateBundlePrice = async (collectionId: string, newBundlePriceInROSE: string): Promise<void> => {
    const newBundlePriceInWei = parseEther(newBundlePriceInROSE)
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'updateBundlePrice',
      args: [BigInt(collectionId), newBundlePriceInWei],
    })
  }

  // ✅ UNIFIED CANCEL FUNCTIONS
  const cancelListingUnified = async (id: string): Promise<void> => {
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'cancelListingUnified',
      args: [BigInt(id)],
    })
  }

  // ✅ LEGACY CANCEL FUNCTIONS (for backwards compatibility)
  const cancelListing = async (listingId: string): Promise<void> => {
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'cancelListing',
      args: [BigInt(listingId)],
    })
  }

  const cancelCollection = async (collectionId: string): Promise<void> => {
    await writeContract({
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'cancelCollection',
      args: [BigInt(collectionId)],
    })
  }

  // ✅ APPROVAL FUNCTION
  const approveNFT = async (nftContract: string): Promise<void> => {
    await writeContract({
      address: nftContract as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [NFT_MARKET_CONFIG.address, true],
    })
  }

  return {
    listSingleNFT,
    listCollectionBundle,
    listCollectionIndividual,
    listCollectionSamePrice,
    buyNFTUnified,
    buyNFT,
    buyCollectionBundle,
    updatePrice,
    updateBundlePrice,
    cancelListingUnified,
    cancelListing,
    cancelCollection,
    approveNFT,
    hash,
    error: error as Error | null,
    isPending,
    isConfirming,
    isConfirmed,
  }
}

// ✅ UNIFIED MARKETPLACE DATA HOOK - Fixed refresh mechanism
export function useMarketplaceNFTs() {
  const [nfts, setNfts] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<string[]>([])
  const [rarities, setRarities] = useState<string[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // ✅ FIXED: Use getAllAvailableNFTs without queryKey
  const { data: allAvailableIds, isLoading: loadingAvailable, error: availableError, refetch: refetchAvailable } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getAllAvailableNFTs',
    query: { 
      refetchInterval: 30000,
      enabled: true,
    }
  })

  // ✅ Fetch marketplace stats
  const { data: marketplaceStats, refetch: refetchStats } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getMarketplaceStats',
  })

  // ✅ Helper function to fetch NFT metadata
  const fetchNFTMetadata = useCallback(async (nftContract: string, tokenId: string) => {
    try {
      const tokenURI = await readContract(config, {
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      })

      if (!tokenURI) return {
        name: `NFT #${tokenId}`,
        description: '',
        image: '/placeholder.svg',
        attributes: []
      }

      const ipfsUrl = tokenURI.startsWith('ipfs://') 
        ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenURI

      const response = await fetch(ipfsUrl)
      if (!response.ok) return {
        name: `NFT #${tokenId}`,
        description: '',
        image: '/placeholder.svg',
        attributes: []
      }

      const metadata = await response.json()
      return {
        name: metadata.name || `NFT #${tokenId}`,
        description: metadata.description || '',
        image: metadata.image?.startsWith('ipfs://') 
          ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') 
          : metadata.image || '/placeholder.svg',
        attributes: metadata.attributes || []
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
      return {
        name: `NFT #${tokenId}`,
        description: '',
        image: '/placeholder.svg',
        attributes: []
      }
    }
  }, [])

  // ✅ FIXED: Process marketplace data - triggered by refreshTrigger
  useEffect(() => {
    const processMarketplaceData = async () => {
      if (loadingAvailable) {
        setLoading(true)
        return
      }

      if (!allAvailableIds || !Array.isArray(allAvailableIds)) {
        setLoading(false)
        setNfts([])
        setCollections([])
        setRarities([])
        return
      }

      console.log('🔄 Processing marketplace data:', allAvailableIds.length, 'items', 'trigger:', refreshTrigger)
      setLoading(true)
      setError(null)

      try {
        const processedNFTs: ProcessedNFT[] = []
        const collectionsSet = new Set<string>()
        const raritiesSet = new Set<string>()

        for (const id of allAvailableIds) {
          try {
            const listingInfo = await getListingDataSafe(id)

            if (!listingInfo || !listingInfo.isActive) {
              continue
            }

            if (listingInfo.isBundle) {
              // ✅ Bundle Collection
              let bundleImage = '/placeholder.svg'
              if (listingInfo.tokenIds && listingInfo.tokenIds.length > 0) {
                try {
                  const firstTokenMetadata = await fetchNFTMetadata(
                    listingInfo.nftContract, 
                    listingInfo.tokenIds[0].toString()
                  )
                  bundleImage = firstTokenMetadata.image
                } catch (metaError) {
                  console.warn('Failed to fetch bundle metadata:', metaError)
                }
              }

              const bundleNFT: ProcessedNFT = {
                id: `bundle-${id}`,
                collectionId: id.toString(),
                name: listingInfo.collectionName || `Bundle Collection #${id}`,
                contractAddress: listingInfo.nftContract,
                tokenId: 'bundle',
                seller: listingInfo.seller,
                price: formatEther(listingInfo.price),
                collectionName: listingInfo.collectionName || 'Bundle Collection',
                image: bundleImage,
                isActive: listingInfo.isActive,
                isBundle: true,
                collection: (listingInfo.collectionName || 'bundle').toLowerCase().replace(/\s+/g, '-'),
                description: `Bundle of ${listingInfo.tokenIds?.length || 0} NFTs`,
                attributes: [
                  { trait_type: 'Type', value: 'Bundle' },
                  { trait_type: 'Items', value: (listingInfo.tokenIds?.length || 0).toString() }
                ],
                rarity: 'Epic',
                verified: true,
                views: Math.floor(Math.random() * 2000),
                likes: Math.floor(Math.random() * 200),
                bundleTokenIds: listingInfo.tokenIds?.map(id => id.toString()) || [],
                canPurchase: true,
              }

              processedNFTs.push(bundleNFT)
              
              if (bundleNFT.collectionName) {
                collectionsSet.add(bundleNFT.collectionName)
              }
              if (bundleNFT.rarity) {
                raritiesSet.add(bundleNFT.rarity)
              }
            } else {
              // ✅ Single NFT or Individual Collection Item
              const metadata = await fetchNFTMetadata(listingInfo.nftContract, listingInfo.tokenId.toString())
              
              const nft: ProcessedNFT = {
                id: `item-${id}`,
                listingId: id.toString(),
                name: metadata.name,
                contractAddress: listingInfo.nftContract,
                tokenId: listingInfo.tokenId.toString(),
                seller: listingInfo.seller,
                price: formatEther(listingInfo.price),
                collectionName: listingInfo.collectionName || 'Single NFT',
                image: metadata.image,
                isActive: listingInfo.isActive,
                collection: (listingInfo.collectionName || 'single-nft').toLowerCase().replace(/\s+/g, '-'),
                description: metadata.description,
                attributes: metadata.attributes,
                rarity: 'Common',
                verified: Boolean(listingInfo.collectionName),
                isBundle: false,
                isFromCollection: Boolean(listingInfo.collectionName && listingInfo.collectionName !== 'Single NFT'),
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 100),
                canPurchase: true,
              }

              processedNFTs.push(nft)
              
              if (nft.collectionName) {
                collectionsSet.add(nft.collectionName)
              }
              if (nft.rarity) {
                raritiesSet.add(nft.rarity)
              }
            }
          } catch (error) {
            console.warn(`Error processing NFT ${id}:`, error)
          }
        }

        console.log('✅ Processed NFTs:', processedNFTs.length)
        setNfts(processedNFTs)
        setCollections(Array.from(collectionsSet))
        setRarities(Array.from(raritiesSet))

      } catch (error) {
        console.error('Error processing marketplace data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load marketplace data')
      } finally {
        setLoading(false)
      }
    }

    processMarketplaceData()
  }, [allAvailableIds, loadingAvailable, fetchNFTMetadata, refreshTrigger])

  // ✅ FIXED: Proper refetch function using wagmi refetch
  const refetch = useCallback(async () => {
    console.log('🔄 Manual refresh triggered')
    setLoading(true)
    
    try {
      // Trigger refetch from wagmi
      await Promise.all([
        refetchAvailable(),
        refetchStats()
      ])
      
      // Also trigger our processing with updated trigger
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error during refresh:', error)
    }
  }, [refetchAvailable, refetchStats])

  const stats = marketplaceStats as [bigint, bigint, bigint, bigint, bigint] | undefined

  return {
    nfts,
    loading: loading || loadingAvailable,
    error: error || availableError?.message || null,
    total: stats ? Number(stats[0]) + Number(stats[1]) : 0,
    refetch,
    collections,
    rarities,
    stats: stats ? {
      totalListings: Number(stats[0]),
      totalCollections: Number(stats[1]),
      activeListings: Number(stats[2]),
      activeBundles: Number(stats[3]),
      activeIndividualCollections: Number(stats[4]),
    } : undefined,
  }
}

// ✅ FIXED: Collection detail hook with better debugging and error handling
export function useCollectionDetail(collectionId?: string) {
  const [collectionItems, setCollectionItems] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Get collection data
  const { data: collectionData, isLoading: loadingCollection, error: collectionError } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getCollection',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { 
      enabled: Boolean(collectionId),
      retry: 3,
      retryDelay: 1000,
      staleTime: 0, // Force fresh data
      gcTime: 0  // Don't cache
    },
  })

  // ✅ Get collection items
  const { data: collectionItemIds } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getCollectionItems',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { 
      enabled: Boolean(collectionId),
      retry: 3,
      retryDelay: 1000,
      staleTime: 0, // Force fresh data
      gcTime: 0  // Don't cache
    },
  })

  // ✅ Helper function to fetch NFT metadata
  const fetchNFTMetadata = useCallback(async (nftContract: string, tokenId: string) => {
    try {
      console.log(`🔍 Fetching metadata for ${nftContract}:${tokenId}`)
      
      const tokenURI = await readContract(config, {
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      })

      console.log(`📄 Token URI for ${tokenId}:`, tokenURI)

      if (!tokenURI) {
        console.log(`⚠️ No tokenURI for ${tokenId}, using fallback`)
        return {
          name: `NFT #${tokenId}`,
          description: `NFT ${tokenId} from collection`,
          image: '/placeholder.svg',
          attributes: []
        }
      }

      const ipfsUrl = tokenURI.startsWith('ipfs://') 
        ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenURI

      console.log(`🌐 Fetching metadata from: ${ipfsUrl}`)

      const response = await fetch(ipfsUrl)
      if (!response.ok) {
        console.log(`❌ Failed to fetch metadata from ${ipfsUrl}:`, response.status)
        return {
          name: `NFT #${tokenId}`,
          description: `NFT ${tokenId} from collection`,
          image: '/placeholder.svg',
          attributes: []
        }
      }

      const metadata = await response.json()
      console.log(`✅ Metadata for ${tokenId}:`, metadata)

      return {
        name: metadata.name || `NFT #${tokenId}`,
        description: metadata.description || `NFT ${tokenId} from collection`,
        image: metadata.image?.startsWith('ipfs://') 
          ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') 
          : metadata.image || '/placeholder.svg',
        attributes: metadata.attributes || []
      }
    } catch (error) {
      console.error(`❌ Error fetching metadata for token ${tokenId}:`, error)
      return {
        name: `NFT #${tokenId}`,
        description: `NFT ${tokenId} from collection`,
        image: '/placeholder.svg',
        attributes: []
      }
    }
  }, [])

  // ✅ ENHANCED: Process collection items with comprehensive debugging
  useEffect(() => {
    const processCollectionItems = async () => {
      if (!collectionId) {
        console.log('🚫 No collection ID provided')
        setCollectionItems([])
        setLoading(false)
        return
      }

      if (loadingCollection) {
        console.log('⏳ Collection data still loading...')
        setLoading(true)
        return
      }

      console.log('🔍 Processing collection items for ID:', collectionId)
      console.log('📊 Collection data:', collectionData)
      console.log('📋 Collection item IDs:', collectionItemIds)
      console.log('❌ Collection error:', collectionError)

      setLoading(true)
      setError(null)

      try {
        // ✅ Method 1: Try direct collection data
        if (collectionData && collectionItemIds && Array.isArray(collectionItemIds) && collectionItemIds.length > 0) {
          const collection = collectionData as ContractCollectionListing
          const itemIds = collectionItemIds as bigint[]
          
          console.log('✅ Using direct collection data:', {
            collectionName: collection.collectionName,
            itemCount: itemIds.length,
            isBundleType: collection.isBundleType,
            nftContract: collection.nftContract,
            seller: collection.seller,
            isActive: collection.isActive
          })

          const processedItems: ProcessedNFT[] = []

          for (let i = 0; i < itemIds.length; i++) {
            const tokenId = itemIds[i]
            console.log(`🔄 Processing item ${i + 1}/${itemIds.length}: Token ID ${tokenId}`)
            
            try {
              const metadata = await fetchNFTMetadata(collection.nftContract, tokenId.toString())
              
              const item: ProcessedNFT = {
                id: `collection-item-${collectionId}-${tokenId}`,
                listingId: tokenId.toString(),
                name: metadata.name,
                contractAddress: collection.nftContract,
                tokenId: tokenId.toString(),
                seller: collection.seller,
                price: collection.isBundleType 
                  ? formatEther(collection.bundlePrice) 
                  : formatEther(collection.prices?.[i] || BigInt(0)),
                collectionName: collection.collectionName,
                image: metadata.image,
                isActive: collection.isActive,
                collection: collection.collectionName.toLowerCase().replace(/\s+/g, '-'),
                description: metadata.description,
                attributes: metadata.attributes,
                rarity: 'Common',
                verified: true,
                isBundle: false,
                isFromCollection: true,
                views: Math.floor(Math.random() * 500),
                likes: Math.floor(Math.random() * 50),
                canPurchase: !collection.isBundleType,
              }

              processedItems.push(item)
              console.log(`✅ Processed item ${i + 1}: ${item.name}`)
            } catch (itemError) {
              console.warn(`❌ Error processing item ${tokenId}:`, itemError)
              
              // ✅ Still add item even if metadata fails
              const fallbackItem: ProcessedNFT = {
                id: `collection-item-${collectionId}-${tokenId}`,
                listingId: tokenId.toString(),
                name: `NFT #${tokenId}`,
                contractAddress: collection.nftContract,
                tokenId: tokenId.toString(),
                seller: collection.seller,
                price: collection.isBundleType 
                  ? formatEther(collection.bundlePrice) 
                  : formatEther(collection.prices?.[i] || BigInt(0)),
                collectionName: collection.collectionName,
                image: '/placeholder.svg',
                isActive: collection.isActive,
                collection: collection.collectionName.toLowerCase().replace(/\s+/g, '-'),
                description: `NFT ${tokenId} from collection`,
                attributes: [],
                rarity: 'Common',
                verified: true,
                isBundle: false,
                isFromCollection: true,
                views: Math.floor(Math.random() * 500),
                likes: Math.floor(Math.random() * 50),
                canPurchase: !collection.isBundleType,
              }
              
              processedItems.push(fallbackItem)
            }
          }

          console.log(`✅ Processed ${processedItems.length} collection items successfully`)
          setCollectionItems(processedItems)
        } 
        // ✅ Method 2: Enhanced fallback to bundle data
        else {
          console.log('🔄 Direct collection data not available, trying fallback methods...')
          
          // First try: Direct listing info
          try {
            console.log(`🔍 Trying getListingInfo for ID: ${collectionId}`)
            const listingInfo = await getListingDataSafe(BigInt(collectionId))
            
            if (listingInfo && listingInfo.isBundle && listingInfo.tokenIds && listingInfo.tokenIds.length > 0) {
              console.log('✅ Using fallback bundle data from getListingInfo:', {
                tokenCount: listingInfo.tokenIds.length,
                collectionName: listingInfo.collectionName,
                isBundle: listingInfo.isBundle,
                nftContract: listingInfo.nftContract,
                seller: listingInfo.seller,
                isActive: listingInfo.isActive
              })

              const processedItems: ProcessedNFT[] = []
              
              for (let i = 0; i < listingInfo.tokenIds.length; i++) {
                const tokenId = listingInfo.tokenIds[i]
                console.log(`🔄 Processing fallback item ${i + 1}/${listingInfo.tokenIds.length}: Token ID ${tokenId}`)
                
                try {
                  const metadata = await fetchNFTMetadata(listingInfo.nftContract, tokenId.toString())
                  
                  const item: ProcessedNFT = {
                    id: `fallback-collection-item-${collectionId}-${tokenId}`,
                    listingId: tokenId.toString(),
                    name: metadata.name,
                    contractAddress: listingInfo.nftContract,
                    tokenId: tokenId.toString(),
                    seller: listingInfo.seller,
                    price: formatEther(listingInfo.price),
                    collectionName: listingInfo.collectionName || 'Collection',
                    image: metadata.image,
                    isActive: listingInfo.isActive,
                    collection: (listingInfo.collectionName || 'collection').toLowerCase().replace(/\s+/g, '-'),
                    description: metadata.description,
                    attributes: metadata.attributes,
                    rarity: 'Common',
                    verified: true,
                    isBundle: false,
                    isFromCollection: true,
                    views: Math.floor(Math.random() * 500),
                    likes: Math.floor(Math.random() * 50),
                    canPurchase: false, // Bundle items can't be purchased individually
                  }

                  processedItems.push(item)
                  console.log(`✅ Processed fallback item ${i + 1}: ${item.name}`)
                } catch (itemError) {
                  console.warn(`❌ Error processing fallback item ${tokenId}:`, itemError)
                  
                  // Still add fallback item
                  const fallbackItem: ProcessedNFT = {
                    id: `fallback-collection-item-${collectionId}-${tokenId}`,
                    listingId: tokenId.toString(),
                    name: `NFT #${tokenId}`,
                    contractAddress: listingInfo.nftContract,
                    tokenId: tokenId.toString(),
                    seller: listingInfo.seller,
                    price: formatEther(listingInfo.price),
                    collectionName: listingInfo.collectionName || 'Collection',
                    image: '/placeholder.svg',
                    isActive: listingInfo.isActive,
                    collection: (listingInfo.collectionName || 'collection').toLowerCase().replace(/\s+/g, '-'),
                    description: `NFT ${tokenId} from collection`,
                    attributes: [],
                    rarity: 'Common',
                    verified: true,
                    isBundle: false,
                    isFromCollection: true,
                    views: Math.floor(Math.random() * 500),
                    likes: Math.floor(Math.random() * 50),
                    canPurchase: false,
                  }
                  
                  processedItems.push(fallbackItem)
                }
              }
              
              console.log(`✅ Processed ${processedItems.length} fallback items successfully`)
              setCollectionItems(processedItems)
            } else {
              console.warn('❌ No valid bundle data found in getListingInfo')
              console.log('📊 getListingInfo result:', listingInfo)
              
              // Last resort: Create placeholder items if we know it's a bundle
              if (collectionData) {
                const collection = collectionData as ContractCollectionListing
                console.log('🔧 Creating placeholder items based on collection data')
                
                const placeholderItems: ProcessedNFT[] = []
                const itemCount = Number(collection.totalItems) || 1
                
                for (let i = 0; i < Math.min(itemCount, 10); i++) { // Limit to 10 placeholder items
                  const placeholderItem: ProcessedNFT = {
                    id: `placeholder-${collectionId}-${i}`,
                    listingId: `${i}`,
                    name: `${collection.collectionName} #${i + 1}`,
                    contractAddress: collection.nftContract,
                    tokenId: `${i}`,
                    seller: collection.seller,
                    price: formatEther(collection.bundlePrice),
                    collectionName: collection.collectionName,
                    image: '/placeholder.svg',
                    isActive: collection.isActive,
                    collection: collection.collectionName.toLowerCase().replace(/\s+/g, '-'),
                    description: `Item ${i + 1} from ${collection.collectionName}`,
                    attributes: [],
                    rarity: 'Common',
                    verified: true,
                    isBundle: false,
                    isFromCollection: true,
                    views: Math.floor(Math.random() * 500),
                    likes: Math.floor(Math.random() * 50),
                    canPurchase: !collection.isBundleType,
                  }
                  
                  placeholderItems.push(placeholderItem)
                }
                
                console.log(`✅ Created ${placeholderItems.length} placeholder items`)
                setCollectionItems(placeholderItems)
              } else {
                setError('Collection not found or has no items')
                setCollectionItems([])
              }
            }
          } catch (fallbackError) {
            console.error('❌ All fallback methods failed:', fallbackError)
            setError('Failed to load collection items')
            setCollectionItems([])
          }
        }
      } catch (error) {
        console.error('❌ Critical error processing collection items:', error)
        setError(error instanceof Error ? error.message : 'Failed to load collection items')
        setCollectionItems([])
      } finally {
        setLoading(false)
      }
    }

    processCollectionItems()
  }, [collectionId, collectionData, collectionItemIds, loadingCollection, fetchNFTMetadata])

  // ✅ Enhanced return with better debugging info
  return {
    collection: collectionData as ContractCollectionListing | undefined,
    collectionItems,
    loading: loading || loadingCollection,
    error: error || collectionError?.message || null,
    isBundle: (collectionData as ContractCollectionListing)?.isBundleType || false,
    totalItems: (collectionData as ContractCollectionListing)?.totalItems || BigInt(0),
    soldItems: (collectionData as ContractCollectionListing)?.soldItems || BigInt(0),
    // ✅ Debug info
    debug: {
      collectionId,
      hasCollectionData: !!collectionData,
      hasCollectionItemIds: !!collectionItemIds,
      itemIdsLength: Array.isArray(collectionItemIds) ? collectionItemIds.length : 0,
      loadingCollection,
      collectionError: collectionError?.message,
    }
  }
}

// ✅ INDIVIDUAL DATA HOOKS
export function useListingInfo(id?: string) {
  const { data: listingInfo, isLoading, error, refetch } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getListingInfo',
    args: id ? [BigInt(id)] : undefined,
    query: { enabled: Boolean(id) },
  })

  return {
    listingInfo: listingInfo as ListingInfo | undefined,
    isLoading,
    error,
    refetch,
  }
}

export function useListingData(listingId?: string) {
  const { data: listing, isLoading, error, refetch } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getListing',
    args: listingId ? [BigInt(listingId)] : undefined,
    query: { enabled: Boolean(listingId) },
  })

  return {
    listing: listing as ContractListing | undefined,
    isLoading,
    error,
    refetch,
  }
}

export function useCollectionData(collectionId?: string) {
  const { data: collection, isLoading, error, refetch } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getCollection',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { enabled: Boolean(collectionId) },
  })

  return {
    collection: collection as ContractCollectionListing | undefined,
    isLoading,
    error,
    refetch,
  }
}

export function useUserMarketplaceData(userAddress?: string) {
  const { data: userListingIds } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getSellerListings',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { enabled: Boolean(userAddress) },
  })

  const { data: userCollectionIds } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getSellerCollections',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { enabled: Boolean(userAddress) },
  })

  return {
    userListingIds: (userListingIds as bigint[]) || [],
    userCollectionIds: (userCollectionIds as bigint[]) || [],
    userListingsCount: ((userListingIds as bigint[]) || []).length,
    userCollectionsCount: ((userCollectionIds as bigint[]) || []).length,
  }
}

export function useTokenStatus(nftContract?: string, tokenId?: string) {
  const { data: tokenStatus } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'isTokenListed',
    args: nftContract && tokenId ? [nftContract as `0x${string}`, BigInt(tokenId)] : undefined,
    query: { enabled: Boolean(nftContract && tokenId) },
  })

  const [isListed, listingId] = (tokenStatus as [boolean, bigint]) || [false, BigInt(0)]

  return {
    isListed,
    listingId: listingId.toString(),
  }
}

export function useNFTApproval(nftContract?: string, owner?: string) {
  const { data: isApproved } = useReadContract({
    address: nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: owner && nftContract ? [owner as `0x${string}`, NFT_MARKET_CONFIG.address] : undefined,
    query: { enabled: Boolean(nftContract && owner) },
  })

  return { isApproved: Boolean(isApproved) }
}

// ✅ Helper function to get listing data with fallback
const getListingDataSafe = async (id: bigint) => {
  try {
    // ✅ Try getListingInfo first (unified approach)
    const listingInfoResult = await readContract(config, {
      address: NFT_MARKET_CONFIG.address,
      abi: NFT_MARKET_CONFIG.abi,
      functionName: 'getListingInfo',
      args: [id],
    }) as [boolean, bigint, string, string, bigint, boolean, string, bigint[]]

    return {
      isBundle: listingInfoResult[0],
      tokenId: listingInfoResult[1],
      nftContract: listingInfoResult[2],
      seller: listingInfoResult[3],
      price: listingInfoResult[4],
      isActive: listingInfoResult[5],
      collectionName: listingInfoResult[6],
      tokenIds: listingInfoResult[7]
    }
  } catch (error) {
    try {
      // ✅ Fallback: try getListing for single NFTs
      const listingResult = await readContract(config, {
        address: NFT_MARKET_CONFIG.address,
        abi: NFT_MARKET_CONFIG.abi,
        functionName: 'getListing',
        args: [id],
      }) as {
        tokenId: bigint
        nftContract: string
        seller: string
        price: bigint
        isActive: boolean
        createdAt: bigint
        collectionId: bigint
      }

      return {
        isBundle: false,
        tokenId: listingResult.tokenId,
        nftContract: listingResult.nftContract,
        seller: listingResult.seller,
        price: listingResult.price,
        isActive: listingResult.isActive,
        collectionName: 'Single NFT',
        tokenIds: [listingResult.tokenId]
      }
    } catch (fallbackError) {
      console.error('Both getListingInfo and getListing failed for ID:', id.toString())
      return null
    }
  }
}