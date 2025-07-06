export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface RawNFT {
  
  id?: string;
  metadata_accessed?: string;
  metadata_uri?: string;
  num_transfers?: number;
  owner?: string;
  owner_eth?: string;
  token?: {
    contract_address?: string;
    collection_name?: string;
    [key: string]: any;
  };
}
export interface ProcessedNFT {
  id: string
  name: string
  collection: string
  image: string
  contractAddress: string
  tokenId: string
  description?: string
  attributes?: Array<{ trait_type: string; value: string }>
  rarity?: string
  
  // Marketplace specific fields
  listingId?: string
  collectionId?: string
  seller?: string
  price?: string
  collectionName?: string
  isActive?: boolean
  isBundle?: boolean
  isFromCollection?: boolean
  bundleTokenIds?: string[]
  canPurchase?: boolean
  
  // Display fields
  views?: number
  likes?: number
  verified?: boolean
  
  // Additional data
  metadata?: any
  owner?: string
}
export interface NFTApiResponse {
  nfts: RawNFT[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProcessedNFTResponse {
  nfts: ProcessedNFT[];
  total: number;
  limit: number;
  offset: number;
}