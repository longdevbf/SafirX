# Collection Auction Metadata Fix

## Issue Description
When creating collection auctions, the `nft_metadata` field in the database only contains metadata for one NFT (the first one used as collection image) instead of all selected NFTs. The `individualNfts` array is empty.

### Expected Behavior
For collection auctions, `nft_metadata` should contain:
```json
{
  "name": "Collection Name",
  "image": "collection_image_url",
  "description": "Collection description",
  "collectionName": "Collection Name",
  "individualNfts": [
    {
      "tokenId": "1",
      "name": "NFT #1",
      "description": "NFT 1 description",
      "image": "nft1_image_url",
      "attributes": [...],
      "rarity": "Common"
    },
    {
      "tokenId": "2", 
      "name": "NFT #2",
      "description": "NFT 2 description",
      "image": "nft2_image_url",
      "attributes": [...],
      "rarity": "Rare"
    }
  ]
}
```

### Current Behavior
Currently storing only:
```json
{
  "name": "hiii",
  "image": "https://lavender-left-hookworm-315.mypinata.cloud/ipfs/QmbmkxFHwnJMWrEV7xHpHuhLwoJ4i8fCXzR5mKpTeqUWR2",
  "description": "hello world",
  "collectionName": "hiii",
  "individualNfts": []
}
```

## Root Cause Analysis

The issue is in the data flow from profile page → prepareAuctionData → syncAuctionToDatabase → API route:

1. **Profile Page**: Creates `individualNftMetadata` correctly by mapping over `collectionData.tokenIds`
2. **prepareAuctionData**: Passes `individualNftMetadata` as `individual_nft_metadata` 
3. **syncAuctionToDatabase**: Transforms data and creates `nftMetadata` with `individualNfts: data.individual_nft_metadata`
4. **API Route**: Merges `individualNftMetadata` into `finalMetadata.individualNfts`

## Debug Steps Added

### 1. Profile Page Debug
Added logging to see what NFT metadata is being found:
```typescript
console.log('🔍 DEBUG NFT finding:', {
  tokenId,
  nftContract: collectionData.nftContract,
  foundNft: nft ? { name: nft.name, image: nft.image, description: nft.description } : null,
  totalNfts: nfts.length,
  availableTokenIds: nfts.map(n => n.tokenId).slice(0, 5)
})
```

### 2. syncAuctionToDatabase Debug
Added logging to see data transformation:
```typescript
console.log('🔍 DEBUG individual_nft_metadata:', {
  is_collection: data.is_collection,
  individual_nft_metadata: data.individual_nft_metadata,
  individual_count: data.individual_nft_metadata?.length || 0
})
```

### 3. API Route Debug
Added logging to see final metadata construction:
```typescript
console.log('🔍 DEBUG API finalMetadata construction:', {
  auctionType,
  nftMetadata,
  individualNftMetadata,
  finalMetadata,
  individualNftsCount: finalMetadata?.individualNfts?.length || 0
})
```

## Potential Issues to Check

1. **NFT Finding Logic**: The `nfts.find()` might not be finding the correct NFTs due to:
   - Contract address mismatch (case sensitivity)
   - Token ID type mismatch (string vs number)
   - NFT data not loaded properly

2. **Data Transformation**: The data might be lost during transformation between functions

3. **API Processing**: The merge logic in the API route might not be working correctly

## Next Steps

1. Test collection auction creation with debug logs enabled
2. Check console output for each debug step
3. Identify where the individual NFT metadata is being lost
4. Fix the specific issue found
5. Remove debug logs after fix is confirmed

## Files Modified

- `src/app/profile/page.tsx` - Added NFT finding debug logs
- `src/utils/syncToDatabase.ts` - Added data transformation debug logs  
- `src/app/api/auctions/route.ts` - Added final metadata construction debug logs