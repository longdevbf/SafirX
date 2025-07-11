# Auction Collection Fixes - Updated

## Issues Fixed

### 1. Image Upload API Error (400 Bad Request)
**Problem**: The component was sending `image` field but the API expects `file` field
**Location**: `src/components/AuctionCollectionSelector.tsx:173`
**Fix**: 
- Changed `formData.append('image', ...)` to `formData.append('file', ...)`
- Updated response handling to use `result.ipfsUrl` and `result.ipfsHash` instead of `result.url` and `result.driveId`

### 2. Missing NFT Metadata in Collection Auctions
**Problem**: Collection auctions didn't store individual NFT metadata, so users couldn't see which NFTs were in the collection
**Location**: Multiple files in the sync pipeline
**Fix**: 
- Added `individual_nft_metadata` field to `SyncAuctionData` interface
- Updated `prepareAuctionData` function to accept and pass individual NFT metadata
- Modified profile page to collect individual NFT metadata from the user's NFT collection
- Updated auction API to merge individual NFT metadata into the main `nft_metadata` field

## Changes Made

### Files Modified:

1. **`src/components/AuctionCollectionSelector.tsx`**
   - Fixed FormData field name from `image` to `file`
   - Updated response handling for IPFS upload

2. **`src/utils/syncToDatabase.ts`**
   - Added `individual_nft_metadata` field to `SyncAuctionData` interface
   - Updated `prepareAuctionData` function signature to accept `individualNftMetadata`
   - Modified `syncAuctionToDatabase` to pass individual NFT metadata to API

3. **`src/app/profile/page.tsx`**
   - Added code to collect individual NFT metadata for collection auctions
   - Updated `prepareAuctionData` call to include NFT metadata

4. **`src/app/api/auctions/route.ts`**
   - Added `individualNftMetadata` field to `CreateAuctionData` interface
   - Updated auction creation to merge individual NFT metadata into main metadata field

## Technical Details

### Data Structure:
For collection auctions, the `nft_metadata` field now contains:
```json
{
  "collectionName": "Collection Name",
  "collectionDescription": "Description",
  "collectionImage": "https://ipfs.../image.jpg",
  "nftCount": 5,
  "individualNfts": [
    {
      "tokenId": "123",
      "name": "NFT Name",
      "description": "NFT Description", 
      "image": "https://ipfs.../nft.jpg",
      "attributes": [...],
      "rarity": "Rare"
    },
    ...
  ]
}
```

### Data Flow:
1. **Collection Selection**: User selects NFTs from their collection
2. **Metadata Collection**: System gathers individual NFT metadata for each selected token
3. **Image Upload**: Custom image uploaded to IPFS with correct field name
4. **Blockchain Transaction**: Creates collection auction on smart contract
5. **Database Sync**: Syncs auction data including individual NFT metadata to database
6. **UI Display**: Users can now see which specific NFTs are in each collection auction

### Key Improvements:
- **Complete NFT Information**: Collection auctions now show all individual NFT details
- **Better UX**: Users can see exactly what they're bidding on
- **Proper IPFS Integration**: Image uploads now work correctly with Pinata
- **Data Consistency**: All NFT metadata is properly stored and retrievable

## Testing Scenarios

1. **✅ Collection Auction with Default Image**: Uses first NFT image, includes all NFT metadata
2. **✅ Collection Auction with Custom Image**: Uploads to IPFS correctly, includes all NFT metadata  
3. **✅ Database Verification**: Individual NFT metadata is stored and retrievable
4. **✅ Auction Display**: Users can see all NFTs in the collection when viewing auctions

## Status: ✅ FULLY RESOLVED

Both major issues have been completely fixed:
- ✅ Image upload API endpoint and data format corrected
- ✅ Individual NFT metadata now stored and accessible for collection auctions
- ✅ Collection auction creation works for both image scenarios
- ✅ Database sync includes complete NFT information
- ✅ Users can see exactly which NFTs are in each collection auction