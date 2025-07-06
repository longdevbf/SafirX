// filepath: src/lib/contracts/nft-types.ts
export interface NFTMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface MintNFTParams {
  name: string
  description: string
  externalLink?: string
  properties?: Array<{
    trait_type: string
    value: string
  }>
  unlockableContent?: string
  isSensitive?: boolean
  creatorAddress?: string
}

export interface MintResult {
  success: boolean
  tokenId?: number
  tokenIds?: number[]
  transactionHash?: string
  error?: string
}

export const NFT_CONTRACT_CONFIG = {
  address: process.env.NFT_ADDRESS as `0x${string}`,
  maxSupply: 10000,
  maxBatchSize: 20,
} as const