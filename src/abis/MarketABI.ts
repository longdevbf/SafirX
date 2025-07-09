import { Address } from 'viem'

export const NFT_MARKET_ABI = [
  // ✅ LISTING FUNCTIONS
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "price", "type": "uint256"}
    ],
    "name": "listSingleNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
      {"internalType": "uint256", "name": "bundlePrice", "type": "uint256"},
      {"internalType": "string", "name": "collectionName", "type": "string"}
    ],
    "name": "listCollectionBundle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "prices", "type": "uint256[]"},
      {"internalType": "string", "name": "collectionName", "type": "string"}
    ],
    "name": "listCollectionIndividual",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
      {"internalType": "uint256", "name": "pricePerItem", "type": "uint256"},
      {"internalType": "string", "name": "collectionName", "type": "string"}
    ],
    "name": "listCollectionSamePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ✅ BUYING FUNCTIONS
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "collectionId", "type": "uint256"}],
    "name": "buyCollectionBundle",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "buyNFTUnified",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },

  // ✅ UPDATE FUNCTIONS
  {
    "inputs": [
      {"internalType": "uint256", "name": "listingId", "type": "uint256"},
      {"internalType": "uint256", "name": "newPrice", "type": "uint256"}
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "collectionId", "type": "uint256"},
      {"internalType": "uint256", "name": "newBundlePrice", "type": "uint256"}
    ],
    "name": "updateBundlePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ✅ CANCEL FUNCTIONS
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "cancelListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "collectionId", "type": "uint256"}],
    "name": "cancelCollection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "cancelListingUnified",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Core
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "getListing",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
          {"internalType": "address", "name": "nftContract", "type": "address"},
          {"internalType": "address", "name": "seller", "type": "address"},
          {"internalType": "uint256", "name": "price", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "collectionId", "type": "uint256"}
        ],
        "internalType": "struct NFTMarket.Listing",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "collectionId", "type": "uint256"}],
    "name": "getCollection",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "collectionId", "type": "uint256"},
          {"internalType": "address", "name": "nftContract", "type": "address"},
          {"internalType": "address", "name": "seller", "type": "address"},
          {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
          {"internalType": "uint256[]", "name": "prices", "type": "uint256[]"},
          {"internalType": "uint256", "name": "bundlePrice", "type": "uint256"},
          {"internalType": "uint256", "name": "totalItems", "type": "uint256"},
          {"internalType": "uint256", "name": "soldItems", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "bool", "name": "isBundleType", "type": "bool"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "string", "name": "collectionName", "type": "string"},
          {"internalType": "uint8", "name": "listingType", "type": "uint8"}
        ],
        "internalType": "struct NFTMarket.CollectionListing",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "getListingInfo",
    "outputs": [
      {"internalType": "bool", "name": "isBundle", "type": "bool"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "uint256", "name": "price", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "string", "name": "collectionName", "type": "string"},
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Active Listings
  {
    "inputs": [],
    "name": "getActiveListings",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveCollections",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBundleCollections",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIndividualCollections",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllAvailableNFTs",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Seller Data
  {
    "inputs": [{"internalType": "address", "name": "seller", "type": "address"}],
    "name": "getSellerListings",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "seller", "type": "address"}],
    "name": "getSellerCollections",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Collection Items
  {
    "inputs": [{"internalType": "uint256", "name": "collectionId", "type": "uint256"}],
    "name": "getCollectionItems",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Utility
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "isTokenListed",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "isBundleCollectionId",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "specialId", "type": "uint256"}],
    "name": "getRealCollectionId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "pure",
    "type": "function"
  },

  // ✅ VIEW FUNCTIONS - Paginated & Stats
  {
    "inputs": [
      {"internalType": "uint256", "name": "offset", "type": "uint256"},
      {"internalType": "uint256", "name": "limit", "type": "uint256"}
    ],
    "name": "getActiveListingsPaginated",
    "outputs": [
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"},
      {"internalType": "uint256", "name": "totalCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMarketplaceStats",
    "outputs": [
      {"internalType": "uint256", "name": "totalListings", "type": "uint256"},
      {"internalType": "uint256", "name": "totalCollections", "type": "uint256"},
      {"internalType": "uint256", "name": "activeListings", "type": "uint256"},
      {"internalType": "uint256", "name": "activeBundles", "type": "uint256"},
      {"internalType": "uint256", "name": "activeIndividualCollections", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalListings",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalCollections",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ✅ ADMIN FUNCTIONS
  {
    "inputs": [{"internalType": "uint256", "name": "newFee", "type": "uint256"}],
    "name": "setMarketplaceFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeesBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bool", "name": "_paused", "type": "bool"}],
    "name": "setPaused",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ✅ PUBLIC VARIABLES
  {
    "inputs": [],
    "name": "marketplaceFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const ERC721_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getApproved",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const NFT_MARKET_CONFIG = {
  address: '0xCfB677324e2d9cac13eb6B5Fa969C44F7Ad6417E' as Address,
  abi: NFT_MARKET_ABI,
}

// ✅ Type definitions matching the contract structs
export enum ListingType {
  SINGLE = 0,
  COLLECTION_BUNDLE = 1,
  COLLECTION_INDIVIDUAL = 2
}

export interface ContractListing {
  tokenId: bigint
  nftContract: string
  seller: string
  price: bigint
  isActive: boolean
  createdAt: bigint
  collectionId: bigint
}

export interface ContractCollectionListing {
  collectionId: bigint
  nftContract: string
  seller: string
  tokenIds: bigint[]
  prices: bigint[]
  bundlePrice: bigint
  totalItems: bigint
  soldItems: bigint
  isActive: boolean
  isBundleType: boolean
  createdAt: bigint
  collectionName: string
  listingType: number
}

export interface ListingInfo {
  isBundle: boolean
  tokenId: bigint
  nftContract: string
  seller: string
  price: bigint
  isActive: boolean
  collectionName: string
  tokenIds: bigint[]
}