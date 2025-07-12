/* eslint-disable @typescript-eslint/no-explicit-any */
//import { ProcessedNFT } from '@/interfaces/nft'

interface SyncListingData {
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
  attributes?: any[]
  rarity?: string
  is_bundle?: boolean
  bundle_token_ids?: string[]
  collection_image?: string
  tx_hash: string
  // Enhanced fields for unified schema
  cover_image_url?: string
  cover_image_drive_id?: string
  individual_images?: string
  individual_metadata?: string
  nft_names?: string
  nft_descriptions?: string
  token_ids_array?: string
  individual_prices?: string
  collection_type?: string
  bundle_price?: string
  individual_price?: string
  metadata_synced?: boolean
  parent_collection_id?: string
  is_collection_item?: boolean
  collection_position?: number
}

interface SyncAuctionData {
  auction_id: string
  nft_contract: string
  token_id: string
  seller: string
  starting_price: string
  reserve_price: string
  min_bid_increment: string
  end_time: Date
  collection_name?: string
  name: string
  description?: string
  category?: string
  image: string
  attributes?: any[]
  is_collection?: boolean
  collection_token_ids?: string[]
  collection_image?: string
  allow_public_reveal?: boolean
  individual_nft_metadata?: any[]
  tx_hash: string
}

// Sync single NFT listing to database
export async function syncListingToDatabase(data: SyncListingData): Promise<boolean> {
  try {
    console.log('🔄 Syncing listing to database:', data.listing_id)
    
    // Prepare data with proper serialization for enhanced fields
    const apiData = {
      ...data,
      attributes: typeof data.attributes === 'object' ? JSON.stringify(data.attributes) : data.attributes,
      bundle_token_ids: typeof data.bundle_token_ids === 'object' ? JSON.stringify(data.bundle_token_ids) : data.bundle_token_ids,
      // Enhanced fields - ensure they're already strings from prepareListingData
      individual_images: data.individual_images || '',
      individual_metadata: data.individual_metadata || '',
      nft_names: data.nft_names || '',
      nft_descriptions: data.nft_descriptions || '',
      token_ids_array: data.token_ids_array || '',
      individual_prices: data.individual_prices || '',
      collection_type: data.collection_type || 'single',
      metadata_synced: data.metadata_synced !== false, // Default to true
      is_collection_item: data.is_collection_item || false,
      collection_position: data.collection_position || 0
    }
    
    console.log('📊 Syncing with enhanced data:', {
      listing_id: apiData.listing_id,
      collection_type: apiData.collection_type,
      metadata_synced: apiData.metadata_synced,
      individual_images_length: apiData.individual_images.length,
      nft_names_count: apiData.nft_names ? JSON.parse(apiData.nft_names).length : 0
    })
    
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to sync listing to database:', error)
      return false
    }

    const result = await response.json()
    console.log('✅ Successfully synced listing to database:', result.listing.listing_id)
    return true
  } catch (error) {
    console.error('❌ Error syncing listing to database:', error)
    return false
  }
}

// Sync auction to database
export async function syncAuctionToDatabase(data: SyncAuctionData): Promise<boolean> {
  try {
    console.log('🔄 Syncing auction to database:', data.auction_id)
    
    // ✅ DEBUG: Log the individual_nft_metadata
    console.log('🔍 DEBUG individual_nft_metadata:', {
      is_collection: data.is_collection,
      individual_nft_metadata: data.individual_nft_metadata,
      individual_count: data.individual_nft_metadata?.length || 0,
      first_item: data.individual_nft_metadata?.[0] || null
    })
    
    // Transform data to match API expectations
    const apiData = {
      action: 'create',
      auctionId: parseInt(data.auction_id),
      auctionType: data.is_collection ? 'COLLECTION' : 'SINGLE_NFT',
      title: data.name,
      description: data.description,
      sellerAddress: data.seller,
      nftContract: data.nft_contract,
      tokenId: data.token_id ? parseInt(data.token_id) : undefined,
      tokenIds: data.collection_token_ids?.map(id => parseInt(id)),
      nftCount: data.is_collection ? data.collection_token_ids?.length : 1,
      collectionImageUrl: data.collection_image,
      startingPrice: data.starting_price,
      reservePrice: data.reserve_price,
      minBidIncrement: data.min_bid_increment,
      startTime: Math.floor(Date.now() / 1000),
      endTime: Math.floor(data.end_time.getTime() / 1000),
      durationHours: Math.floor((data.end_time.getTime() - Date.now()) / (1000 * 60 * 60)),
      allowPublicReveal: data.allow_public_reveal || false,
      nftMetadata: data.is_collection ? {
        collectionName: data.collection_name,
        collectionDescription: data.description,
        collectionImage: data.collection_image,
        nftCount: data.collection_token_ids?.length || 0,
        individualNfts: data.individual_nft_metadata || []
      } : {
        name: data.name,
        description: data.description,
        image: data.image,
        attributes: data.attributes,
        collectionName: data.collection_name
      },
      individualNftMetadata: data.individual_nft_metadata || [],
      creationTxHash: data.tx_hash
    }
    
    // ✅ DEBUG: Log the final nftMetadata
    console.log('🔍 DEBUG final nftMetadata:', {
      auctionType: apiData.auctionType,
      nftMetadata: apiData.nftMetadata,
      individualNftMetadata: apiData.individualNftMetadata
    })
    
    console.log('📊 Syncing auction with transformed data:', {
      auctionId: apiData.auctionId,
      auctionType: apiData.auctionType,
      title: apiData.title,
      nftCount: apiData.nftCount,
      tokenIds: apiData.tokenIds?.length || 0
    })
    
    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to sync auction to database:', error)
      return false
    }

    const result = await response.json()
    console.log('✅ Successfully synced auction to database:', result.auction?.auction_id || apiData.auctionId)
    return true
  } catch (error) {
    console.error('❌ Error syncing auction to database:', error)
    return false
  }
}

// Helper function to extract NFT metadata from blockchain or IPFS
export async function fetchNFTMetadata(nftContract: string, tokenId: string): Promise<{
  name: string
  description: string
  image: string
  attributes: any[]
}> {
  try {
    // This would typically call the blockchain to get tokenURI
    // For now, return a placeholder
    return {
      name: `NFT #${tokenId}`,
      description: '',
      image: '/placeholder-nft.jpg',
      attributes: []
    }
  } catch (error) {
    console.error('Error fetching NFT metadata:', error)
    return {
      name: `NFT #${tokenId}`,
      description: '',
      image: '/placeholder-nft.jpg',
      attributes: []
    }
  }
}

// Helper function to prepare listing data for database sync
export function prepareListingData(
  listingId: string,
  nftContract: string,
  tokenId: string,
  seller: string,
  price: string,
  txHash: string,
  nftData: {
    name: string
    description?: string
    category?: string
    image: string
    attributes?: any[]
    rarity?: string
    collectionName?: string
    collectionImage?: string
  },
  isBundle: boolean = false,
  bundleTokenIds?: string[]
): SyncListingData {
  return {
    listing_id: listingId,
    nft_contract: nftContract,
    token_id: tokenId,
    seller: seller,
    price: price,
    collection_name: nftData.collectionName || '',
    name: nftData.name,
    description: nftData.description || '',
    category: nftData.category || '',
    image: nftData.image,
    attributes: nftData.attributes || [],
    rarity: nftData.rarity || 'Common',
    is_bundle: isBundle,
    bundle_token_ids: bundleTokenIds || [],
    collection_image: nftData.collectionImage || '',
    tx_hash: txHash,
    // Enhanced fields for single NFT listings
    cover_image_url: nftData.image, // Use NFT image as cover for single listings
    cover_image_drive_id: '', // Not applicable for single NFTs
    individual_images: JSON.stringify([nftData.image]), // Single image array
    individual_metadata: JSON.stringify([{
      name: nftData.name,
      description: nftData.description,
      attributes: nftData.attributes
    }]),
    nft_names: JSON.stringify([nftData.name]),
    nft_descriptions: JSON.stringify([nftData.description || '']),
    token_ids_array: JSON.stringify([tokenId]),
    individual_prices: JSON.stringify([price]),
    collection_type: isBundle ? 'bundle' : 'single',
    bundle_price: isBundle ? price : '',
    individual_price: isBundle ? '' : price,
    metadata_synced: true,
    parent_collection_id: '',
    is_collection_item: false,
    collection_position: 0
  }
}

// Helper function to prepare auction data for database sync
export function prepareAuctionData(
  auctionId: string,
  nftContract: string,
  tokenId: string | null,
  collectionTokenIds: string[] | null,
  seller: string,
  auctionParams: {
    auctionType: 'SINGLE_NFT' | 'COLLECTION'
    title: string
    description: string
    startingPrice: string
    reservePrice: string
    minBidIncrement: string
    durationHours: number
    allowPublicReveal: boolean
    collectionImage?: string
    collectionImageDriveId?: string
    individualNftMetadata?: any[]
  },
  txHash: string,
  nftData: {
    name: string
    description?: string
    category?: string
    image: string
    attributes?: any[]
    collectionName?: string
  }
): SyncAuctionData {
  const endTime = new Date(Date.now() + (auctionParams.durationHours * 60 * 60 * 1000))
  const isCollection = auctionParams.auctionType === 'COLLECTION'
  
  // ✅ DEBUG: Log individual NFT metadata in prepareAuctionData
  console.log('🔍 DEBUG prepareAuctionData:', {
    auctionType: auctionParams.auctionType,
    individualNftMetadata: auctionParams.individualNftMetadata,
    individualCount: auctionParams.individualNftMetadata?.length || 0
  })
  
  return {
    auction_id: auctionId,
    nft_contract: nftContract,
    token_id: tokenId || '',
    seller: seller,
    starting_price: auctionParams.startingPrice,
    reserve_price: auctionParams.reservePrice,
    min_bid_increment: auctionParams.minBidIncrement,
    end_time: endTime,
    collection_name: nftData.collectionName || nftData.name || '',
    name: auctionParams.title,
    description: auctionParams.description,
    category: nftData.category || '',
    image: auctionParams.collectionImage || nftData.image,
    attributes: nftData.attributes || [],
    is_collection: isCollection,
    collection_token_ids: collectionTokenIds || [],
    collection_image: auctionParams.collectionImage || nftData.image,
    allow_public_reveal: auctionParams.allowPublicReveal,
    individual_nft_metadata: auctionParams.individualNftMetadata || [],
    tx_hash: txHash
  }
}

// Update listing status in database (when sold or cancelled)
export async function updateListingStatus(listingId: string, isActive: boolean): Promise<boolean> {
  try {
    console.log('🔄 Updating listing status:', listingId, 'Active:', isActive)
    
    const response = await fetch(`/api/listings/${listingId}`, {
      method: isActive ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: isActive ? JSON.stringify({ price: '0' }) : undefined // For PUT we need price, for DELETE we don't
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to update listing status:', error)
      return false
    }

  //  const result = await response.json()
    console.log('✅ Successfully updated listing status:', listingId)
    return true
  } catch (error) {
    console.error('❌ Error updating listing status:', error)
    return false
  }
}