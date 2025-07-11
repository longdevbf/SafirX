-- Add nft_metadata_individuals column to auctions table
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS nft_metadata_individuals JSONB;

-- Add comment for documentation
COMMENT ON COLUMN auctions.nft_metadata_individuals IS 'Individual NFT metadata for collection auctions - stores detailed info for each NFT';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_nft_metadata_individuals 
ON auctions USING GIN (nft_metadata_individuals);

-- Check the table structure
\d auctions;
