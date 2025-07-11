// ✅ Enums - Updated with AuctionType
export enum AuctionType {
  SINGLE_NFT = 0,
  COLLECTION = 1
}

export enum AuctionState {
  ACTIVE = 0,
  FINALIZED = 1,
  CANCELLED = 2
}

export enum BidVisibility {
  HIDDEN = 0,
  REVEALED = 1,
  AUTO_REVEALED = 2
}

// ✅ Types - Updated with new fields
export interface Auction {
  auctionId: bigint
  auctionType: AuctionType  // ✅ NEW
  nftContract: string
  tokenId: bigint           // 0 for collection auctions
  tokenIds: bigint[]        // ✅ NEW: Array for collection
  seller: string
  startingPrice: bigint
  reservePrice: bigint
  minBidIncrement: bigint
  startTime: bigint
  endTime: bigint
  bidExtensionTime: bigint
  state: AuctionState
  totalBids: bigint
  uniqueBidders: bigint
  highestBidder: string
  highestBid: bigint
  allowPublicReveal: boolean
  title: string
  description: string
}

export interface SealedBid {
  bidder: string
  amount: bigint
  timestamp: bigint
  bidNumber: bigint
  visibility: BidVisibility
  isValid: boolean
  deposit: bigint
}

export interface PublicBidInfo {
  bidder: string
  amount: bigint
  timestamp: bigint
  bidNumber: bigint
}

export interface AuctionStats {
  totalBids: bigint
  uniqueBidders: bigint
  timeLeft: bigint
  hasReserveBeenMet: boolean
  isActive: boolean
  userHasBid: boolean
  allowsPublicReveal: boolean
  canFinalize: boolean
  auctionType: AuctionType   // ✅ NEW
  nftCount: bigint           // ✅ NEW
}

// ✅ Contract Configuration - Updated
export const SEALED_BID_AUCTION_CONFIG = {
  address: '0x83E40b787ee2bc69CA9D8ddf4d856b183646Bcc6', // Update this address
  abi: [
    // ✅ Constructor
    {
      type: "constructor",
      inputs: [
        { name: "initialOwner", type: "address", internalType: "address" }
      ]
    },

    // ✅ Events - Updated with new fields
    {
      type: "event",
      name: "AuctionCreated",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "seller", type: "address", indexed: true },
        { name: "nftContract", type: "address", indexed: true },
        { name: "auctionType", type: "uint8", indexed: false },    // ✅ NEW
        { name: "tokenId", type: "uint256", indexed: false },      // 0 for collection
        { name: "tokenIds", type: "uint256[]", indexed: false },   // ✅ NEW
        { name: "startingPrice", type: "uint256", indexed: false },
        { name: "endTime", type: "uint256", indexed: false },
        { name: "title", type: "string", indexed: false },
        { name: "allowPublicReveal", type: "bool", indexed: false }
      ]
    },
    {
      type: "event",
      name: "BidPlaced",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "bidder", type: "address", indexed: true },
        { name: "bidNumber", type: "uint256", indexed: false },
        { name: "timestamp", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "BidUpdated",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "bidder", type: "address", indexed: true },
        { name: "bidNumber", type: "uint256", indexed: false },
        { name: "timestamp", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "AuctionFinalized",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "winner", type: "address", indexed: true },
        { name: "finalPrice", type: "uint256", indexed: false },
        { name: "platformFeeAmount", type: "uint256", indexed: false },
        { name: "sellerAmount", type: "uint256", indexed: false },
        { name: "totalRefunded", type: "uint256", indexed: false },
        { name: "nftCount", type: "uint256", indexed: false }      // ✅ NEW
      ]
    },
    {
      type: "event",
      name: "AuctionFailed",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "reason", type: "string", indexed: false },
        { name: "totalRefunded", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "BidRevealed",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "bidder", type: "address", indexed: true },
        { name: "bidAmount", type: "uint256", indexed: false },
        { name: "timestamp", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "AllBidsRevealed",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "totalRevealed", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "AuctionCancelled",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "seller", type: "address", indexed: true },
        { name: "reason", type: "string", indexed: false },
        { name: "totalRefunded", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "DepositRefunded",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "bidder", type: "address", indexed: true },
        { name: "amount", type: "uint256", indexed: false }
      ]
    },
    {
      type: "event",
      name: "AuctionExtended",
      inputs: [
        { name: "auctionId", type: "uint256", indexed: true },
        { name: "newEndTime", type: "uint256", indexed: false },
        { name: "reason", type: "string", indexed: false }
      ]
    },

    // ✅ Write Functions - NEW: Specific auction creation functions
    {
      type: "function",
      name: "createSingleNFTAuction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "nftContract", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "startingPrice", type: "uint256" },
        { name: "reservePrice", type: "uint256" },
        { name: "minBidIncrement", type: "uint256" },
        { name: "duration", type: "uint256" },
        { name: "allowPublicReveal", type: "bool" },
        { name: "title", type: "string" },
        { name: "description", type: "string" }
      ],
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "createCollectionAuction",    // ✅ NEW
      stateMutability: "nonpayable",
      inputs: [
        { name: "nftContract", type: "address" },
        { name: "tokenIds", type: "uint256[]" },
        { name: "startingPrice", type: "uint256" },
        { name: "reservePrice", type: "uint256" },
        { name: "minBidIncrement", type: "uint256" },
        { name: "duration", type: "uint256" },
        { name: "allowPublicReveal", type: "bool" },
        { name: "title", type: "string" },
        { name: "description", type: "string" }
      ],
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "createAuction",              // Legacy function
      stateMutability: "nonpayable",
      inputs: [
        { name: "nftContract", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "startingPrice", type: "uint256" },
        { name: "reservePrice", type: "uint256" },
        { name: "minBidIncrement", type: "uint256" },
        { name: "duration", type: "uint256" },
        { name: "allowPublicReveal", type: "bool" },
        { name: "title", type: "string" },
        { name: "description", type: "string" }
      ],
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "placeBid",
      stateMutability: "payable",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "finalizeAuction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "revealMyBid",
      stateMutability: "nonpayable",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "enablePublicBidHistory",
      stateMutability: "nonpayable",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "cancelAuction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "auctionId", type: "uint256" },
        { name: "reason", type: "string" }
      ],
      outputs: []
    },

    // ✅ Read Functions - Updated with new functions
    {
      type: "function",
      name: "getAuction",
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          components: [
            { name: "auctionId", type: "uint256" },
            { name: "auctionType", type: "uint8" },          // ✅ NEW
            { name: "nftContract", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "tokenIds", type: "uint256[]" },         // ✅ NEW
            { name: "seller", type: "address" },
            { name: "startingPrice", type: "uint256" },
            { name: "reservePrice", type: "uint256" },
            { name: "minBidIncrement", type: "uint256" },
            { name: "startTime", type: "uint256" },
            { name: "endTime", type: "uint256" },
            { name: "bidExtensionTime", type: "uint256" },
            { name: "state", type: "uint8" },
            { name: "totalBids", type: "uint256" },
            { name: "uniqueBidders", type: "uint256" },
            { name: "highestBidder", type: "address" },
            { name: "highestBid", type: "uint256" },
            { name: "allowPublicReveal", type: "bool" },
            { name: "title", type: "string" },
            { name: "description", type: "string" }
          ]
        }
      ]
    },
    {
      type: "function",
      name: "getAuctionTokenIds",         // ✅ NEW
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [{ name: "", type: "uint256[]" }]
    },
    {
      type: "function",
      name: "isCollectionAuction",        // ✅ NEW
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [{ name: "", type: "bool" }]
    },
    {
      type: "function",
      name: "getMyBid",
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          components: [
            { name: "bidder", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "timestamp", type: "uint256" },
            { name: "bidNumber", type: "uint256" },
            { name: "visibility", type: "uint8" },
            { name: "isValid", type: "bool" },
            { name: "deposit", type: "uint256" }
          ]
        }
      ]
    },
    {
      type: "function",
      name: "getAuctionStats",
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [
        { name: "totalBids", type: "uint256" },
        { name: "uniqueBidders", type: "uint256" },
        { name: "timeLeft", type: "uint256" },
        { name: "hasReserveBeenMet", type: "bool" },
        { name: "isActive", type: "bool" },
        { name: "userHasBid", type: "bool" },
        { name: "allowsPublicReveal", type: "bool" },
        { name: "canFinalize", type: "bool" },
        { name: "auctionType", type: "uint8" },             // ✅ NEW
        { name: "nftCount", type: "uint256" }               // ✅ NEW
      ]
    },
    {
      type: "function",
      name: "getPublicBidHistory",
      stateMutability: "view",
      inputs: [
        { name: "auctionId", type: "uint256" }
      ],
      outputs: [
        {
          name: "",
          type: "tuple[]",
          components: [
            { name: "bidder", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "timestamp", type: "uint256" },
            { name: "bidNumber", type: "uint256" }
          ]
        }
      ]
    },
    {
      type: "function",
      name: "getActiveAuctions",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256[]" }]
    },
    {
      type: "function",
      name: "getActiveAuctionsByType",    // ✅ NEW
      stateMutability: "view",
      inputs: [
        { name: "auctionType", type: "uint8" }
      ],
      outputs: [{ name: "", type: "uint256[]" }]
    },
    {
      type: "function",
      name: "getUserAuctions",
      stateMutability: "view",
      inputs: [
        { name: "user", type: "address" }
      ],
      outputs: [{ name: "", type: "uint256[]" }]
    },
    {
      type: "function",
      name: "getUserBids",
      stateMutability: "view",
      inputs: [
        { name: "user", type: "address" }
      ],
      outputs: [{ name: "", type: "uint256[]" }]
    },

    // ✅ Public State Variables - Updated
    {
      type: "function",
      name: "auctions",
      stateMutability: "view",
      inputs: [
        { name: "", type: "uint256" }
      ],
      outputs: [
        { name: "auctionId", type: "uint256" },
        { name: "auctionType", type: "uint8" },             // ✅ NEW
        { name: "nftContract", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "seller", type: "address" },
        { name: "startingPrice", type: "uint256" },
        { name: "reservePrice", type: "uint256" },
        { name: "minBidIncrement", type: "uint256" },
        { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" },
        { name: "bidExtensionTime", type: "uint256" },
        { name: "state", type: "uint8" },
        { name: "totalBids", type: "uint256" },
        { name: "uniqueBidders", type: "uint256" },
        { name: "highestBidder", type: "address" },
        { name: "highestBid", type: "uint256" },
        { name: "allowPublicReveal", type: "bool" },
        { name: "title", type: "string" },
        { name: "description", type: "string" }
      ]
    },
    {
      type: "function",
      name: "platformFee",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "hasUserBid",
      stateMutability: "view",
      inputs: [
        { name: "", type: "uint256" },
        { name: "", type: "address" }
      ],
      outputs: [{ name: "", type: "bool" }]
    },
    {
      type: "function",
      name: "auctionDeposits",
      stateMutability: "view",
      inputs: [
        { name: "", type: "uint256" }
      ],
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "paused",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "bool" }]
    },

    // ✅ Admin Functions
    {
      type: "function",
      name: "setPlatformFee",
      stateMutability: "nonpayable",
      inputs: [
        { name: "newFee", type: "uint256" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "withdrawFees",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    },
    {
      type: "function",
      name: "setPaused",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_paused", type: "bool" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "emergencyWithdraw",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    },

    // ✅ Ownable Functions
    {
      type: "function",
      name: "owner",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "address" }]
    },
    {
      type: "function",
      name: "transferOwnership",
      stateMutability: "nonpayable",
      inputs: [
        { name: "newOwner", type: "address" }
      ],
      outputs: []
    },
    {
      type: "function",
      name: "renounceOwnership",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    },

    // ✅ Receive Function
    {
      type: "receive",
      stateMutability: "payable"
    }
  ] as const,
  
  // ✅ Constants from contract - Updated
  constants: {
    MAX_FEE: BigInt(1000), // 10%
    MIN_BID_INCREMENT: BigInt("1000000000000000"), // 0.001 ether
    MIN_AUCTION_DURATION: BigInt(3600), // 1 hour
    MAX_AUCTION_DURATION: BigInt(2592000), // 30 days
    BID_EXTENSION_TIME: BigInt(600), // 10 minutes
    MAX_COLLECTION_SIZE: BigInt(100) // ✅ NEW: Max NFTs in collection
  }
} as const

// ✅ ERC721 ABI for NFT approvals
export { ERC721_ABI } from './MarketABI'