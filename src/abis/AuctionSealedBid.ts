

export const SEALED_BID_AUCTION_CONFIG = {
  address: '0xFB566B9D3B648cDe703d382504902a796fbD245D' as `0x${string}`,
  abi: [
    {
        "type": "constructor",
        "inputs": [
            {"name": "initialOwner", "type": "address", "internalType": "address"}
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "cancelAuction",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "claimNFT",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "createCollectionAuction",
        "inputs": [
            {"name": "nftContract", "type": "address", "internalType": "address"},
            {"name": "tokenIds", "type": "uint256[]", "internalType": "uint256[]"},
            {"name": "startingPrice", "type": "uint256", "internalType": "uint256"},
            {"name": "reservePrice", "type": "uint256", "internalType": "uint256"},
            {"name": "minBidIncrement", "type": "uint256", "internalType": "uint256"},
            {"name": "duration", "type": "uint256", "internalType": "uint256"},
            {"name": "title", "type": "string", "internalType": "string"},
            {"name": "description", "type": "string", "internalType": "string"}
        ],
        "outputs": [
            {"name": "", "type": "uint256", "internalType": "uint256"}
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "createSingleNFTAuction",
        "inputs": [
            {"name": "nftContract", "type": "address", "internalType": "address"},
            {"name": "tokenId", "type": "uint256", "internalType": "uint256"},
            {"name": "startingPrice", "type": "uint256", "internalType": "uint256"},
            {"name": "reservePrice", "type": "uint256", "internalType": "uint256"},
            {"name": "minBidIncrement", "type": "uint256", "internalType": "uint256"},
            {"name": "duration", "type": "uint256", "internalType": "uint256"},
            {"name": "title", "type": "string", "internalType": "string"},
            {"name": "description", "type": "string", "internalType": "string"}
        ],
        "outputs": [
            {"name": "", "type": "uint256", "internalType": "uint256"}
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "finalizeAuction",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getAuctionBids",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [
            {
                "components": [
                    {"name": "bidder", "type": "address", "internalType": "address"},
                    {"name": "amount", "type": "uint256", "internalType": "uint256"},
                    {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
                    {"name": "deposit", "type": "uint256", "internalType": "uint256"}
                ],
                "type": "tuple[]",
                "internalType": "struct SealedBidAuction.Bid[]"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "onERC721Received",
        "inputs": [
            {"name": "", "type": "address", "internalType": "address"},
            {"name": "", "type": "address", "internalType": "address"},
            {"name": "", "type": "uint256", "internalType": "uint256"},
            {"name": "", "type": "bytes", "internalType": "bytes"}
        ],
        "outputs": [
            {"name": "", "type": "bytes4", "internalType": "bytes4"}
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {"name": "", "type": "address", "internalType": "address"}
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "placeBid",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"name": "bidAmount", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "reclaimNFT",
        "inputs": [
            {"name": "auctionId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {"name": "newOwner", "type": "address", "internalType": "address"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "AuctionCancelled",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "seller", "type": "address", "internalType": "address"},
            {"indexed": false, "name": "reason", "type": "string", "internalType": "string"}
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AuctionCreated",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "seller", "type": "address", "internalType": "address"},
            {"indexed": true, "name": "nftContract", "type": "address", "internalType": "address"},
            {"indexed": false, "name": "auctionType", "type": "uint8", "internalType": "enum SealedBidAuction.AuctionType"},
            {"indexed": false, "name": "tokenId", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "tokenIds", "type": "uint256[]", "internalType": "uint256[]"},
            {"indexed": false, "name": "startingPrice", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "endTime", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "title", "type": "string", "internalType": "string"}
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AuctionFinalized",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "winner", "type": "address", "internalType": "address"},
            {"indexed": false, "name": "finalPrice", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "platformFeeAmount", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "sellerAmount", "type": "uint256", "internalType": "uint256"}
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "BidPlaced",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "bidder", "type": "address", "internalType": "address"},
            {"indexed": false, "name": "amount", "type": "uint256", "internalType": "uint256"},
            {"indexed": false, "name": "timestamp", "type": "uint256", "internalType": "uint256"}
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NFTClaimed",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "winner", "type": "address", "internalType": "address"},
            {"indexed": false, "name": "amountPaid", "type": "uint256", "internalType": "uint256"}
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NFTReclaimed",
        "inputs": [
            {"indexed": true, "name": "auctionId", "type": "uint256", "internalType": "uint256"},
            {"indexed": true, "name": "seller", "type": "address", "internalType": "address"}
        ],
        "anonymous": false
    }
]

}
