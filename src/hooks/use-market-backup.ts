import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { NFT_MARKET_CONFIG, ERC721_ABI, ContractListing, ContractCollectionListing, ListingInfo } from '@/abis/MarketABI'
import { Proce        if (allAvailableIds && allAvailableIds.length > 0) {
          console.log('🔍 DEBUG - Processing', allAvailableIds.length, 'available items (unified approach)')
          console.log('🔍 DEBUG - Available IDs:', allAvailableIds.map(id => id.toString()))
          
          for (const id of allAvailableIds) {
            try {
              console.log('🔍 Processing ID:', id.toString())
              
              // ✅ Use getListingInfo to get unified information
              const listingInfo = await readContract(config, {
                address: NFT_MARKET_CONFIG.address,
                abi: NFT_MARKET_CONFIG.abi,
                functionName: 'getListingInfo',
                args: [id],
              }) as unknown as ListingInfo

              console.log('📋 Listing Info for ID', id.toString(), ':', {
                isActive: listingInfo?.isActive,
                isBundle: listingInfo?.isBundle,
                seller: listingInfo?.seller,
                nftContract: listingInfo?.nftContract,
                tokenId: listingInfo?.tokenId?.toString(),
                price: listingInfo?.price?.toString(),
                collectionName: listingInfo?.collectionName
              })

              if (!listingInfo || !listingInfo.isActive) {
                console.log('⚠️ Skipping inactive listing:', id.toString())
                continue
              } '@/interfaces/nft'
import { useState, useEffect, useMemo } from 'react'
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

// ✅ UNIFIED MARKETPLACE DATA HOOK - Uses new contract functions
export function useMarketplaceNFTs() {
  const [nfts, setNfts] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<string[]>([])
  const [rarities, setRarities] = useState<string[]>([])

  // ✅ Use getAllAvailableNFTs to get all available items (unified approach)
  const { data: allAvailableIds, isLoading: loadingAvailable, error: availableError, refetch: refetchAvailable } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getAllAvailableNFTs',
    query: { refetchInterval: 30000 }
  })

  // ✅ Fetch marketplace stats
  const { data: marketplaceStats } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getMarketplaceStats',
  })

  // ✅ Helper function to fetch NFT metadata
  const fetchNFTMetadata = async (nftContract: string, tokenId: string) => {
    try {
      const tokenURI = await readContract(config, {
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      })

      if (!tokenURI) return null

      const ipfsUrl = tokenURI.startsWith('ipfs://') 
        ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenURI

      const response = await fetch(ipfsUrl)
      if (!response.ok) return null

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
      return null
    }
  }

  // ✅ Helper function to check if ID is a bundle collection
  const isBundleCollectionId = (id: bigint): boolean => {
    return id > BigInt(1000000) // Bundle collections have special IDs > 1,000,000
  }

  // ✅ Helper function to get real collection ID from special ID
  const getRealCollectionId = (specialId: bigint): bigint => {
    if (specialId > BigInt(1000000)) {
      return specialId - BigInt(1000000)
    }
    return specialId
  }

  // ✅ Process marketplace data using unified approach
  useEffect(() => {
    const processUnifiedMarketplaceData = async () => {
      if (loadingAvailable) return

      setLoading(true)
      setError(null)

      try {
        const processedNFTs: ProcessedNFT[] = []
        const collectionsSet = new Set<string>()
        const raritiesSet = new Set<string>()

        if (allAvailableIds && allAvailableIds.length > 0) {
          console.log('� Processing', allAvailableIds.length, 'available items (unified approach)')
          
          for (const id of allAvailableIds) {
            try {
              // ✅ Use getListingInfo to get unified information
              const listingInfo = await readContract(config, {
                address: NFT_MARKET_CONFIG.address,
                abi: NFT_MARKET_CONFIG.abi,
                functionName: 'getListingInfo',
                args: [id],
              }) as unknown as ListingInfo

              if (!listingInfo.isActive) continue

              if (listingInfo.isBundle) {
                // ✅ Bundle Collection
                let bundleImage = '/placeholder.svg'
                if (listingInfo.tokenIds.length > 0) {
                  const firstTokenMetadata = await fetchNFTMetadata(
                    listingInfo.nftContract, 
                    listingInfo.tokenIds[0].toString()
                  )
                  bundleImage = firstTokenMetadata?.image || '/placeholder.svg'
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
                  description: `Bundle of ${listingInfo.tokenIds.length} NFTs`,
                  attributes: [
                    { trait_type: 'Type', value: 'Bundle' },
                    { trait_type: 'Items', value: listingInfo.tokenIds.length.toString() }
                  ],
                  rarity: 'Epic',
                  verified: true,
                  views: Math.floor(Math.random() * 2000),
                  likes: Math.floor(Math.random() * 200),
                  bundleTokenIds: listingInfo.tokenIds.map(id => id.toString()),
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
                  name: metadata?.name || `NFT #${listingInfo.tokenId}`,
                  contractAddress: listingInfo.nftContract,
                  tokenId: listingInfo.tokenId.toString(),
                  seller: listingInfo.seller,
                  price: formatEther(listingInfo.price),
                  collectionName: listingInfo.collectionName || 'Single NFT',
                  image: metadata?.image || '/placeholder.svg',
                  isActive: listingInfo.isActive,
                  collection: (listingInfo.collectionName || 'single-nft').toLowerCase().replace(/\s+/g, '-'),
                  description: metadata?.description || '',
                  attributes: metadata?.attributes || [],
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
              console.error('Error processing item:', id, error)
            }
          }
        }

        console.log('✅ Processed NFTs (unified):', {
          total: processedNFTs.length,
          singles: processedNFTs.filter(n => !n.isBundle && !n.isFromCollection).length,
          bundles: processedNFTs.filter(n => n.isBundle).length,
          collectionItems: processedNFTs.filter(n => n.isFromCollection).length,
        })

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

    processUnifiedMarketplaceData()
  }, [allAvailableIds, loadingAvailable])

  const refetch = () => {
    refetchAvailable()
  }

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

// ✅ Hook to get detailed collection information
export function useCollectionDetail(collectionId?: string) {
  const [collectionItems, setCollectionItems] = useState<ProcessedNFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Get collection data
  const { data: collectionData, isLoading: loadingCollection } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getCollection',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { enabled: Boolean(collectionId) },
  })

  // ✅ Get collection items
  const { data: collectionItemIds } = useReadContract({
    address: NFT_MARKET_CONFIG.address,
    abi: NFT_MARKET_CONFIG.abi,
    functionName: 'getCollectionItems',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { enabled: Boolean(collectionId) },
  })

  // ✅ Helper function to fetch NFT metadata
  const fetchNFTMetadata = async (nftContract: string, tokenId: string) => {
    try {
      const tokenURI = await readContract(config, {
        address: nftContract as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      })

      if (!tokenURI) return null

      const ipfsUrl = tokenURI.startsWith('ipfs://') 
        ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : tokenURI

      const response = await fetch(ipfsUrl)
      if (!response.ok) return null

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
      return null
    }
  }

  // ✅ Process collection items
  useEffect(() => {
    const processCollectionItems = async () => {
      if (!collectionData || !collectionItemIds || loadingCollection) return

      setLoading(true)
      setError(null)

      try {
        const collection = collectionData as ContractCollectionListing
        const itemIds = collectionItemIds as bigint[]
        const processedItems: ProcessedNFT[] = []

        for (let i = 0; i < itemIds.length; i++) {
          const tokenId = itemIds[i]
          const metadata = await fetchNFTMetadata(collection.nftContract, tokenId.toString())
          
          const item: ProcessedNFT = {
            id: `collection-item-${collectionId}-${tokenId}`,
            listingId: tokenId.toString(),
            name: metadata?.name || `${collection.collectionName} #${tokenId}`,
            contractAddress: collection.nftContract,
            tokenId: tokenId.toString(),
            seller: collection.seller,
            price: collection.isBundleType 
              ? formatEther(collection.bundlePrice) 
              : formatEther(collection.prices[i] || BigInt(0)),
            collectionName: collection.collectionName,
            image: metadata?.image || '/placeholder.svg',
            isActive: collection.isActive,
            collection: collection.collectionName.toLowerCase().replace(/\s+/g, '-'),
            description: metadata?.description || '',
            attributes: metadata?.attributes || [],
            rarity: 'Common',
            verified: true,
            isBundle: false,
            isFromCollection: true,
            views: Math.floor(Math.random() * 500),
            likes: Math.floor(Math.random() * 50),
            canPurchase: !collection.isBundleType, // Individual items can only be purchased if not bundle type
          }

          processedItems.push(item)
        }

        setCollectionItems(processedItems)
      } catch (error) {
        console.error('Error processing collection items:', error)
        setError(error instanceof Error ? error.message : 'Failed to load collection items')
      } finally {
        setLoading(false)
      }
    }

    processCollectionItems()
  }, [collectionData, collectionItemIds, loadingCollection, collectionId])

  return {
    collection: collectionData as ContractCollectionListing | undefined,
    collectionItems,
    loading: loading || loadingCollection,
    error,
    isBundle: (collectionData as ContractCollectionListing)?.isBundleType || false,
    totalItems: (collectionData as ContractCollectionListing)?.totalItems || BigInt(0),
    soldItems: (collectionData as ContractCollectionListing)?.soldItems || BigInt(0),
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