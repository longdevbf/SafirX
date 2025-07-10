import { ProcessedNFT } from '@/interfaces/nft'

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
    
    const response = await fetch('/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to sync auction to database:', error)
      return false
    }

    const result = await response.json()
    console.log('✅ Successfully synced auction to database:', result.auction.auction_id)
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
  tokenId: string,
  seller: string,
  startingPrice: string,
  reservePrice: string,
  endTime: Date,
  txHash: string,
  nftData: {
    name: string
    description?: string
    category?: string
    image: string
    attributes?: any[]
    collectionName?: string
    collectionImage?: string
  },
  isCollection: boolean = false,
  collectionTokenIds?: string[]
): SyncAuctionData {
  return {
    auction_id: auctionId,
    nft_contract: nftContract,
    token_id: tokenId,
    seller: seller,
    starting_price: startingPrice,
    reserve_price: reservePrice,
    end_time: endTime,
    collection_name: nftData.collectionName || '',
    name: nftData.name,
    description: nftData.description || '',
    category: nftData.category || '',
    image: nftData.image,
    attributes: nftData.attributes || [],
    is_collection: isCollection,
    collection_token_ids: collectionTokenIds || [],
    collection_image: nftData.collectionImage || '',
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

    const result = await response.json()
    console.log('✅ Successfully updated listing status:', listingId)
    return true
  } catch (error) {
    console.error('❌ Error updating listing status:', error)
    return false
  }
}