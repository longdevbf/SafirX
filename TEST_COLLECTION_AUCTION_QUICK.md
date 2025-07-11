# Quick Test: Collection Auction Metadata

## Test Steps

1. **Open browser console** (F12)
2. **Go to profile page** and connect wallet
3. **Create collection auction**:
   - Click "Create Collection Auction"
   - Select 2+ NFTs from same collection
   - Fill in auction details
   - Submit

## Debug Logs to Check

### 1. Profile Page - NFT Finding
```
🔍 DEBUG contract NFTs: {
  contractAddress: "0x...",
  totalContractNfts: 14,
  selectedTokenIds: ["30", "31"],
  contractNftTokenIds: ["1", "2", "3", ...]
}

🔍 DEBUG NFT finding: {
  tokenId: "30",
  foundNft: { name: "dog nft", image: "...", description: "..." },
  contractMatches: 14
}

🔍 DEBUG final individualNftMetadata: {
  count: 2,
  metadata: [
    { tokenId: "30", name: "dog nft", ... },
    { tokenId: "31", name: "cosmic apes", ... }
  ]
}
```

### 2. PrepareAuctionData Function
```
🔍 DEBUG prepareAuctionData: {
  auctionType: "COLLECTION",
  individualNftMetadata: [
    { tokenId: "30", name: "dog nft", ... },
    { tokenId: "31", name: "cosmic apes", ... }
  ],
  individualCount: 2
}
```

### 3. SyncAuctionToDatabase Function
```
🔍 DEBUG individual_nft_metadata: {
  is_collection: true,
  individual_nft_metadata: [
    { tokenId: "30", name: "dog nft", ... },
    { tokenId: "31", name: "cosmic apes", ... }
  ],
  individual_count: 2,
  first_item: { tokenId: "30", name: "dog nft", ... }
}
```

### 4. API Route Final Metadata
```
🔍 DEBUG API finalMetadata construction: {
  auctionType: "COLLECTION",
  individualNftMetadata: [
    { tokenId: "30", name: "dog nft", ... },
    { tokenId: "31", name: "cosmic apes", ... }
  ],
  individualNftMetadataLength: 2,
  finalMetadata: {
    collectionName: "...",
    individualNfts: [
      { tokenId: "30", name: "dog nft", ... },
      { tokenId: "31", name: "cosmic apes", ... }
    ]
  },
  individualNftsCount: 2
}
```

## Expected vs Actual

### Expected Database Result
```json
{
  "name": "metamask #1 Collection",
  "image": "https://...",
  "description": "123",
  "collectionName": "metamask #1 Collection",
  "individualNfts": [
    {
      "tokenId": "30",
      "name": "dog nft",
      "description": "dog nft",
      "image": "https://...",
      "attributes": [],
      "rarity": "Common"
    },
    {
      "tokenId": "31", 
      "name": "cosmic apes",
      "description": "cosmic apes",
      "image": "https://...",
      "attributes": [],
      "rarity": "Common"
    }
  ]
}
```

### Current Database Result (BROKEN)
```json
{
  "name": "metamask #1 Collection",
  "image": "https://...",
  "description": "123", 
  "collectionName": "metamask #1 Collection",
  "individualNfts": []
}
```

## Debugging Questions

1. **Does prepareAuctionData log show correct data?**
   - If NO → Issue is in profile page NFT finding
   - If YES → Continue to next step

2. **Does syncAuctionToDatabase log show correct data?**
   - If NO → Issue is in prepareAuctionData function
   - If YES → Continue to next step

3. **Does API log show correct individualNftMetadata?**
   - If NO → Issue is in data transmission to API
   - If YES → Issue is in API processing

4. **Does API log show correct finalMetadata?**
   - If NO → Issue is in API metadata construction
   - If YES → Issue is in database saving

## Quick Fix to Test

If all logs show correct data but database is still wrong, try this manual fix:

```sql
-- Check current auction data
SELECT auction_id, nft_metadata FROM auctions WHERE auction_type = 'COLLECTION' ORDER BY created_at DESC LIMIT 1;

-- Manual update for testing (replace with actual data)
UPDATE auctions 
SET nft_metadata = '{
  "name": "metamask #1 Collection",
  "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmQBHELpB8xmSM2iZoo3uRrZpsvuvb4e2CnFqwdLtFQYNu",
  "description": "123",
  "collectionName": "metamask #1 Collection", 
  "individualNfts": [
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
  ]
}'::jsonb
WHERE auction_id = 7;
```

This will help identify exactly where the data is being lost.