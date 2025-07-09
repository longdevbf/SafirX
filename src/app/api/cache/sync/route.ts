import { NextRequest, NextResponse } from 'next/server';
import { cacheQueries, initializeCacheTables } from '@/lib/db-cache';
import { readContract } from 'wagmi/actions';
import { config } from '@/components/config/wagmiConfig';
import { ERC721_ABI } from '@/abis/MarketABI';
import { formatEther } from 'viem';

// Initialize database tables on first run
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initializeCacheTables();
      dbInitialized = true;
    } catch (error) {
      console.log('Database tables might already exist:', error);
      dbInitialized = true; // Prevent repeated attempts
    }
  }
}

async function fetchNFTMetadata(nftContract: string, tokenId: string) {
  try {
    const tokenURI = await readContract(config, {
      address: nftContract as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    if (!tokenURI) {
      return {
        name: `NFT #${tokenId}`,
        description: '',
        image: '/placeholder.svg',
        attributes: []
      };
    }

    const ipfsUrl = tokenURI.startsWith('ipfs://') 
      ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/') 
      : tokenURI;

    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const metadata = await response.json();
    return {
      name: metadata.name || `NFT #${tokenId}`,
      description: metadata.description || '',
      image: metadata.image?.startsWith('ipfs://') 
        ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') 
        : metadata.image || '/placeholder.svg',
      attributes: metadata.attributes || []
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      name: `NFT #${tokenId}`,
      description: '',
      image: '/placeholder.svg',
      attributes: []
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const { type, blockchainId, data } = await request.json();

    if (type === 'listing') {
      // Sync listing data
      const { nftContract, tokenId, tokenIds, seller, price, collectionName, isBundle, listingType } = data;
      
      let metadata;
      let name = '';
      let description = '';
      let image = '/placeholder.svg';
      let attributes = '[]';

      if (isBundle && tokenIds && tokenIds.length > 0) {
        // For bundle, get metadata from first NFT
        metadata = await fetchNFTMetadata(nftContract, tokenIds[0]);
        name = `${collectionName || 'Bundle Collection'} (${tokenIds.length} items)`;
        description = `Bundle of ${tokenIds.length} NFTs. ${metadata.description}`;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      } else {
        // For single NFT
        metadata = await fetchNFTMetadata(nftContract, tokenId);
        name = metadata.name;
        description = metadata.description;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      }

      const listing = {
        listing_id: blockchainId,
        name,
        contract_address: nftContract,
        token_id: tokenId || 'bundle',
        seller,
        price: formatEther(BigInt(price)),
        collection_name: collectionName || (isBundle ? 'Bundle Collection' : 'Single NFT'),
        image,
        description,
        attributes,
        is_active: true,
        is_bundle: isBundle,
        is_from_collection: Boolean(collectionName),
        bundle_token_ids: isBundle ? JSON.stringify(tokenIds) : undefined,
        listing_type: (listingType || 'single') as 'single' | 'collection_bundle' | 'collection_individual',
        blockchain_id: blockchainId,
        metadata_synced: true,
        views: 0,
        likes: 0
      };

      await cacheQueries.upsertListing(listing);

      return NextResponse.json({
        success: true,
        message: 'Listing synced successfully',
        data: listing
      });

    } else if (type === 'auction') {
      // Sync auction data
      const { nftContract, tokenIds, seller, startingPrice, reservePrice, currentHighestBid, title, description: auctionDescription, isCollection, startTime, endTime, allowPublicReveal } = data;
      
      let metadata;
      let name = title || '';
      let description = auctionDescription || '';
      let image = '/placeholder.svg';
      let attributes = '[]';

      if (isCollection && tokenIds && tokenIds.length > 0) {
        // For collection auction, get metadata from first NFT
        metadata = await fetchNFTMetadata(nftContract, tokenIds[0]);
        name = title || `${metadata.name} Collection (${tokenIds.length} items)`;
        description = auctionDescription || `Collection auction of ${tokenIds.length} NFTs. ${metadata.description}`;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      } else if (tokenIds && tokenIds.length > 0) {
        // For single NFT auction
        metadata = await fetchNFTMetadata(nftContract, tokenIds[0]);
        name = title || metadata.name;
        description = auctionDescription || metadata.description;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      }

      const auction = {
        auction_id: blockchainId,
        name,
        contract_address: nftContract,
        token_ids: JSON.stringify(tokenIds),
        seller,
        starting_price: formatEther(BigInt(startingPrice)),
        reserve_price: formatEther(BigInt(reservePrice)),
        current_highest_bid: currentHighestBid ? formatEther(BigInt(currentHighestBid)) : '0',
        image,
        description,
        attributes,
        is_active: true,
        is_collection: isCollection,
        auction_type: (isCollection ? 'collection' : 'single') as 'single' | 'collection',
        start_time: new Date(startTime * 1000),
        end_time: new Date(endTime * 1000),
        blockchain_id: blockchainId,
        metadata_synced: true,
        views: 0,
        likes: 0,
        bid_count: 0,
        allow_public_reveal: allowPublicReveal
      };

      await cacheQueries.upsertAuction(auction);

      return NextResponse.json({
        success: true,
        message: 'Auction synced successfully',
        data: auction
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid sync type'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync data'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const { type, blockchainId, updates } = await request.json();

    if (type === 'listing') {
      if (updates.deactivate) {
        await cacheQueries.deactivateListing(blockchainId);
      } else {
        // Update listing (e.g., price change)
        await cacheQueries.upsertListing({ 
          blockchain_id: blockchainId, 
          ...updates 
        });
      }
    } else if (type === 'auction') {
      if (updates.finalize) {
        await cacheQueries.finalizeAuction(blockchainId);
      } else if (updates.newBid) {
        await cacheQueries.updateAuctionBid(blockchainId, updates.newBid, updates.bidCount);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data updated successfully'
    });

  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update data'
    }, { status: 500 });
  }
}