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
  auction_type: 'SINGLE_NFT' | 'COLLECTION'
  title: string
  description?: string
  seller_address: string
  nft_contract: string
  token_id: string | null
  token_ids?: string[]
  nft_count: number
  collection_image_url?: string
  collection_image_drive_id?: string | null
  starting_price: string
  reserve_price: string
  min_bid_increment: string
  start_time: Date
  end_time: Date
  duration_hours: number
  allow_public_reveal: boolean
  nft_metadata?: any
  individual_nft_metadata?: any[]
  creation_tx_hash: string
  
  // ✅ Claim/Reclaim status (default values)
  nft_claimed?: boolean
  nft_reclaimed?: boolean
  claim_tx_hash?: string | null
  reclaim_tx_hash?: string | null
  claimed_at?: Date | null
  reclaimed_at?: Date | null
  
  // Legacy fields for compatibility
  collection_name?: string
  name?: string
  seller?: string
  category?: string
  image: string
  attributes?: any[]
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

// ✅ Sửa syncAuctionToDatabase - đầy đủ trường mới
export async function syncAuctionToDatabase(auctionData: SyncAuctionData): Promise<boolean> {
  try {
    console.log('🔄 Syncing auction to database:', auctionData.auction_id)
    console.log('📊 Full auction data:', JSON.stringify(auctionData, null, 2))
    
    // ✅ Validate required fields
    if (!auctionData.seller_address && !auctionData.seller) {
      console.error('❌ seller_address is required in auctionData')
      return false
    }
    
    // ✅ Xử lý metadata cho collection auctions
    let nftMetadata: any = {
      name: auctionData.title || auctionData.name || 'Auction',
      description: auctionData.description || '',
      image: auctionData.collection_image_url || auctionData.individual_nft_metadata?.[0]?.image || '/placeholder-nft.jpg',
      attributes: auctionData.attributes || []
    };
    
    // ✅ Nếu là collection, thêm metadata của tất cả NFTs
    if (auctionData.auction_type === 'COLLECTION' && auctionData.individual_nft_metadata && auctionData.individual_nft_metadata.length > 0) {
      nftMetadata = {
        ...nftMetadata,
        coverImage: auctionData.collection_image_url || auctionData.individual_nft_metadata[0]?.image,
        individualNfts: auctionData.individual_nft_metadata.map((nft: any) => ({
          ...nft,
          image: nft.image || '/placeholder-nft.jpg'
        })),
        totalNfts: auctionData.individual_nft_metadata.length
      };
    }
    
    const apiData = {
      action: 'create',
      auctionId: parseInt(auctionData.auction_id),
      auctionType: auctionData.auction_type,
      title: auctionData.title || auctionData.name || 'Auction',
      description: auctionData.description || '',
      sellerAddress: auctionData.seller_address || auctionData.seller,
      nftContract: auctionData.nft_contract,
      tokenId: auctionData.token_id ? parseInt(auctionData.token_id) : null,
      tokenIds: auctionData.token_ids?.map((id: string) => parseInt(id)) || null,
      nftCount: auctionData.nft_count,
      collectionImageUrl: auctionData.collection_image_url || null,
      collectionImageDriveId: auctionData.collection_image_drive_id || null,
      startingPrice: auctionData.starting_price,
      reservePrice: auctionData.reserve_price,
      minBidIncrement: auctionData.min_bid_increment,
      startTime: Math.floor(auctionData.start_time.getTime() / 1000),
      endTime: Math.floor(auctionData.end_time.getTime() / 1000),
      durationHours: auctionData.duration_hours,
      allowPublicReveal: auctionData.allow_public_reveal,
      nftMetadata: nftMetadata,
      individualNftMetadata: auctionData.individual_nft_metadata || [],
      creationTxHash: auctionData.creation_tx_hash
    }
    
    console.log('📤 Sending to API:', JSON.stringify(apiData, null, 2))
    
    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Auction synced successfully:', result)
    return true
  } catch (error) {
    console.error('❌ Failed to sync auction to database:', error)
    return false
  }
}

// Helper function to extract NFT metadata from blockchain or IPFS
export async function fetchNFTMetadata(nftContract: string, tokenId: string): Promise<{
  name: string;
  description: string;
  image: string;
  attributes: any[];
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

// ✅ Sửa prepareAuctionData với schema mới đầy đủ
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
    duration: number // Duration in hours
    allowPublicReveal: boolean
    collectionImage?: string
    collectionImageDriveId?: string | null
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
  if (!seller) {
    throw new Error('seller address is required')
  }
  
  const startTime = new Date()
  const endTime = new Date(Date.now() + (auctionParams.duration * 60 * 60 * 1000))
  
  return {
    auction_id: auctionId,
    auction_type: auctionParams.auctionType,
    title: auctionParams.title,
    description: auctionParams.description,
    seller_address: seller,
    nft_contract: nftContract,
    token_id: tokenId,
    token_ids: collectionTokenIds || undefined,
    nft_count: auctionParams.auctionType === 'COLLECTION' ? (collectionTokenIds?.length || 1) : 1,
    collection_image_url: auctionParams.collectionImage || nftData.image,
    collection_image_drive_id: auctionParams.collectionImageDriveId,
    starting_price: auctionParams.startingPrice,
    reserve_price: auctionParams.reservePrice,
    min_bid_increment: auctionParams.minBidIncrement,
    start_time: startTime,
    end_time: endTime,
    duration_hours: auctionParams.duration,
    allow_public_reveal: auctionParams.allowPublicReveal,
    nft_metadata: {
      name: nftData.name,
      description: nftData.description || '',
      image: nftData.image,
      attributes: nftData.attributes || []
    },
    individual_nft_metadata: auctionParams.individualNftMetadata || [],
    creation_tx_hash: txHash,
    
    // ✅ Default claim/reclaim status
    nft_claimed: false,
    nft_reclaimed: false,
    claim_tx_hash: null,
    reclaim_tx_hash: null,
    claimed_at: null,
    reclaimed_at: null,
    
    // Legacy compatibility fields
    collection_name: nftData.collectionName || nftData.name || '',
    name: auctionParams.title,
    seller: seller,
    category: nftData.category || '',
    image: auctionParams.collectionImage || nftData.image,
    attributes: nftData.attributes || [],
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