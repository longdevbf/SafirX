-- Add nft_metadata_individuals column to auctions table
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS nft_metadata_individuals JSONB;

-- Add comment for documentation
COMMENT ON COLUMN auctions.nft_metadata_individuals IS 'Individual NFT metadata for collection auctions - stores detailed info for each NFT';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_nft_metadata_individuals 
ON auctions USING GIN (nft_metadata_individuals);

-- Update existing collection auction (auction_id = 7) with individual NFT metadata
UPDATE auctions 
SET nft_metadata_individuals = '[
  {
    "tokenId": "30",
    "name": "dog nft",
    "description": "dog nft", 
    "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmQBHELpB8xmSM2iZoo3uRrZpsvuvb4e2CnFqwdLtFQYNu",
    "attributes": [],
    "rarity": "Common"
  },
  {
    "tokenId": "31",
    "name": "cosmic apes",
    "description": "cosmic apes",
    "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmSgBnP4DHdCd7z6KQb886NtXnrCw7ZGR6Sme1Pt9NVa4y", 
    "attributes": [],
    "rarity": "Common"
  }
]'::jsonb
WHERE auction_id = 7 AND auction_type = 'COLLECTION';

-- Also update the main nft_metadata to include individualNfts
UPDATE auctions 
SET nft_metadata = nft_metadata || '{"individualNfts": [
  {
    "tokenId": "30",
    "name": "dog nft",
    "description": "dog nft",
    "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmQBHELpB8xmSM2iZoo3uRrZpsvuvb4e2CnFqwdLtFQYNu",
    "attributes": [],
    "rarity": "Common"
  },
  {
    "tokenId": "31", 
    "name": "cosmic apes",
    "description": "cosmic apes",
    "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmSgBnP4DHdCd7z6KQb886NtXnrCw7ZGR6Sme1Pt9NVa4y",
    "attributes": [],
    "rarity": "Common"
  }
]}'::jsonb
WHERE auction_id = 7 AND auction_type = 'COLLECTION';

-- Check the updated data
SELECT 
  auction_id,
  auction_type,
  nft_metadata,
  nft_metadata_individuals
FROM auctions 
WHERE auction_id = 7;