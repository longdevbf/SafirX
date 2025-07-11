# Test Collection Auction Metadata Issue

## How to Reproduce the Issue

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Go to profile page** and connect your wallet

3. **Create a collection auction**:
   - Click "Create Collection Auction" button
   - Select a collection contract with at least 2 NFTs
   - Select 2 or more NFTs
   - Choose either "Use first NFT image" or upload custom image
   - Fill in auction details (title, description, prices, duration)
   - Submit the auction

4. **Check the console logs** for debug information:
   - Look for `🔍 DEBUG NFT finding:` logs
   - Look for `🔍 DEBUG final individualNftMetadata:` logs  
   - Look for `🔍 DEBUG individual_nft_metadata:` logs
   - Look for `🔍 DEBUG API finalMetadata construction:` logs

5. **Check the database** to see the saved `nft_metadata`:
   ```sql
   SELECT auction_id, nft_metadata FROM auctions WHERE auction_type = 'COLLECTION' ORDER BY created_at DESC LIMIT 1;
   ```

## Expected Debug Output

### Step 1: NFT Finding
```
🔍 DEBUG NFT finding: {
  tokenId: "1",
  nftContract: "0x...",
  foundNft: { name: "NFT #1", image: "...", description: "..." },
  totalNfts: 10,
  availableTokenIds: ["1", "2", "3", "4", "5"],
  contractMatches: 5
}
```

### Step 2: Individual Metadata Array
```
🔍 DEBUG final individualNftMetadata: {
  count: 2,
  metadata: [
    { tokenId: "1", name: "NFT #1", description: "...", image: "...", attributes: [...], rarity: "Common" },
    { tokenId: "2", name: "NFT #2", description: "...", image: "...", attributes: [...], rarity: "Rare" }
  ]
}
```

### Step 3: Sync Function Processing
```
🔍 DEBUG individual_nft_metadata: {
  is_collection: true,
  individual_nft_metadata: [
    { tokenId: "1", name: "NFT #1", ... },
    { tokenId: "2", name: "NFT #2", ... }
  ],
  individual_count: 2
}
```

### Step 4: API Final Metadata
```
🔍 DEBUG API finalMetadata construction: {
  auctionType: "COLLECTION",
  nftMetadata: { collectionName: "...", collectionDescription: "...", ... },
  individualNftMetadata: [
    { tokenId: "1", name: "NFT #1", ... },
    { tokenId: "2", name: "NFT #2", ... }
  ],
  finalMetadata: {
    collectionName: "...",
    collectionDescription: "...",
    collectionImage: "...",
    nftCount: 2,
    individualNfts: [
      { tokenId: "1", name: "NFT #1", ... },
      { tokenId: "2", name: "NFT #2", ... }
    ]
  },
  individualNftsCount: 2
}
```

## Common Issues to Check

### Issue 1: Contract Address Mismatch
- **Problem**: Contract addresses don't match due to case sensitivity
- **Fix**: Added case-insensitive matching in profile page
- **Debug**: Check `contractMatches` count in logs

### Issue 2: Token ID Type Mismatch  
- **Problem**: Token IDs are strings in one place, numbers in another
- **Fix**: Ensure consistent string comparison
- **Debug**: Check `tokenId` values in logs

### Issue 3: NFT Data Not Loaded
- **Problem**: `nfts` array is empty or incomplete
- **Fix**: Ensure NFT data is properly fetched before creating auction
- **Debug**: Check `totalNfts` and `availableTokenIds` in logs

### Issue 4: Data Lost in Transformation
- **Problem**: Individual metadata gets lost between functions
- **Fix**: Verify each step in the data flow
- **Debug**: Compare counts at each step

## Testing Steps

1. **Test with debug logs enabled** (current state)
2. **Identify where data is lost** by checking each debug step
3. **Fix the specific issue** found
4. **Test the fix** by creating another collection auction
5. **Verify database contains correct data**:
   ```json
   {
     "name": "Collection Name",
     "image": "collection_image_url", 
     "description": "Collection description",
     "collectionName": "Collection Name",
     "individualNfts": [
       { "tokenId": "1", "name": "NFT #1", "description": "...", "image": "...", "attributes": [...], "rarity": "Common" },
       { "tokenId": "2", "name": "NFT #2", "description": "...", "image": "...", "attributes": [...], "rarity": "Rare" }
     ]
   }
   ```
6. **Remove debug logs** after fix is confirmed

## Files with Debug Logs

- `src/app/profile/page.tsx` - NFT finding and individual metadata creation
- `src/utils/syncToDatabase.ts` - Data transformation and sync
- `src/app/api/auctions/route.ts` - Final metadata construction

## Clean Up After Testing

Remember to remove debug logs after the issue is fixed:
```bash
# Search for debug logs
grep -r "🔍 DEBUG" src/

# Remove them manually or with sed
sed -i '/🔍 DEBUG/d' src/app/profile/page.tsx
sed -i '/🔍 DEBUG/d' src/utils/syncToDatabase.ts  
sed -i '/🔍 DEBUG/d' src/app/api/auctions/route.ts
```