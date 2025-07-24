/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ProcessedAuction {
    auctionId: bigint;
    seller: string;
    nftContract: string;
    tokenId: bigint;
    isCancelled: boolean;
    auctionType: number;
    state: number;
    tokenIds: bigint[];
    tokenIdsList: bigint[];
    startingPrice: bigint;
    reservePrice: bigint;
    minBidIncrement: bigint;
    startTime: bigint;
    endTime: bigint;
    bidExtensionTime: bigint;
    isActive: boolean;
    isFinalized: boolean;
    totalBids: bigint;
    uniqueBidders: bigint;
    highestBidder: string;
    highestBid: bigint;
    allowPublicReveal: boolean;
    title: string;
    description?: string;
    timeRemaining: number;
    finalPrice?: string;
    nftCount: number;
    isCollection: boolean;
    userCanBid: boolean;
    userBid?: {
        [x: string]: number;
        amount: bigint;
        timestamp: bigint;
    };
    nftMetadata?: {
        name?: string;
        description?: string;
        image?: string;
        attributes?: any[];
    };
    individualNftMetadata?: any[];
} 