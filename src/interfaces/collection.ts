/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ Collection Interface
export interface Collection {
  id: number
  collection_id: string
  name: string
  description?: string
  cover_image?: string
  banner_image?: string
  creator_address: string
  contract_address: string
  
  // Stats
  total_items: number
  floor_price: number
  total_volume: number
  item_count?: number
  likes_count: number
  views_count: number
  
  // Collection type
  is_bundle: boolean
  bundle_price?: number
  listing_type: number // 0=individual, 1=bundle, 2=same-price
  
  // Blockchain
  tx_hash?: string
  block_number?: number
  is_active: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Calculated fields
  floor_price_calculated?: number
  ceiling_price?: number
  avg_price?: number
  likes_count_actual?: number
}

// ✅ Collection Item Interface
export interface CollectionItem {
  id: number
  collection_id: string
  listing_id: string
  nft_contract: string
  token_id: string
  price: number
  position_in_collection?: number
  is_sold: boolean
  created_at: string
  
  // NFT details (from join with listings)
  nft_name?: string
  nft_description?: string
  nft_image?: string
  nft_attributes?: any[]
  nft_rarity?: string
  current_seller?: string
  is_listing_active?: boolean
}

// ✅ Collection Creation Data
export interface CreateCollectionData {
  collection_id: string
  name: string
  description?: string
  cover_image?: string
  banner_image?: string
  creator_address: string
  contract_address: string
  is_bundle?: boolean
  bundle_price?: number
  listing_type?: number
  tx_hash?: string
  block_number?: number
  items?: CollectionItemData[]
}

// ✅ Collection Item Data for Creation
export interface CollectionItemData {
  listing_id: string
  nft_contract: string
  token_id: string
  price: number
}

// ✅ Collection Update Data
export interface UpdateCollectionData {
  name?: string
  description?: string
  cover_image?: string
  banner_image?: string
  bundle_price?: number
  is_active?: boolean
}

// ✅ Collection Like Data
export interface CollectionLike {
  id: number
  collection_id: string
  user_address: string
  created_at: string
}

// ✅ Collection Stats
export interface CollectionStats {
  totalListings: number
  totalCollections: number
  activeListings: number
  activeBundles: number
  activeIndividualCollections: number
}

// ✅ Collection Filter Options
export interface CollectionFilters {
  creator?: string
  active?: boolean
  is_bundle?: boolean
  sort?: 'created_at' | 'name' | 'total_items' | 'floor_price' | 'likes_count' | 'views_count'
  order?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

// ✅ Collection Response
export interface CollectionResponse {
  collections: Collection[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ✅ Collection Detail Response
export interface CollectionDetailResponse {
  collection: Collection
  items: CollectionItem[]
}

// ✅ Collection Like Response
export interface CollectionLikeResponse {
  success: boolean
  isLiked: boolean
  likesCount: number
  message: string
}