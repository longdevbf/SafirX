import { readContract } from 'wagmi/actions';
import { config } from '@/components/config/wagmiConfig';
import { NFT_MARKET_CONFIG, ERC721_ABI } from '@/abis/MarketABI';
import { SEALED_BID_AUCTION_CONFIG } from '@/abis/AuctionSealedBid';
import { cacheQueries } from '@/lib/db-cache';
import { formatEther } from 'viem';

class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly SYNC_INTERVAL = 60000; // 1 minute
  private readonly BATCH_SIZE = 20;

  async start() {
    if (this.isRunning) {
      console.log('Background sync already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting background sync service');

    // Run initial sync
    await this.performSync();

    // Schedule periodic syncs
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, this.SYNC_INTERVAL);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Background sync service stopped');
  }

  private async performSync() {
    try {
      console.log('🔄 Starting background sync...');
      
      // Sync marketplace listings
      await this.syncMarketplaceListings();
      
      // Sync auctions
      await this.syncAuctions();
      
      console.log('✅ Background sync completed');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  private async syncMarketplaceListings() {
    try {
      // Get all available NFT IDs from blockchain
      const allAvailableIds = await readContract(config, {
        address: NFT_MARKET_CONFIG.address,
        abi: NFT_MARKET_CONFIG.abi,
        functionName: 'getAllAvailableNFTs',
      }) as bigint[];

      if (!allAvailableIds || allAvailableIds.length === 0) {
        console.log('No active listings found on blockchain');
        return;
      }

      console.log(`Found ${allAvailableIds.length} active listings on blockchain`);

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < allAvailableIds.length; i += this.BATCH_SIZE) {
        const batch = allAvailableIds.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(batch);
        
        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error syncing marketplace listings:', error);
    }
  }

  private async processBatch(ids: bigint[]) {
    const promises = ids.map(id => this.syncSingleListing(id));
    await Promise.allSettled(promises);
  }

  private async syncSingleListing(id: bigint) {
    try {
      // Get listing info from blockchain
      const listingInfo = await readContract(config, {
        address: NFT_MARKET_CONFIG.address,
        abi: NFT_MARKET_CONFIG.abi,
        functionName: 'getListingInfo',
        args: [id]
      }) as [boolean, bigint, string, string, bigint, boolean, string, bigint[]];

      const [isBundle, tokenId, nftContract, seller, price, isActive, collectionName, tokenIds] = listingInfo;

      if (!isActive) {
        // Mark as inactive in cache
        await cacheQueries.deactivateListing(id.toString());
        return;
      }

      // Check if already in cache and up to date
      const cachedListing = await cacheQueries.getListingById(id.toString());
      if (cachedListing && cachedListing.metadata_synced) {
        // Just update the price if it changed
        const currentPrice = formatEther(price);
        if (cachedListing.price !== currentPrice) {
          await cacheQueries.upsertListing({
            blockchain_id: id.toString(),
            price: currentPrice,
            is_active: isActive
          });
        }
        return;
      }

      // Fetch metadata for new or unsynced listings
      let metadata;
      let name = '';
      let description = '';
      let image = '/placeholder.svg';
      let attributes = '[]';

      if (isBundle && tokenIds && tokenIds.length > 0) {
        // For bundle, get metadata from first NFT
        metadata = await this.fetchNFTMetadata(nftContract, tokenIds[0].toString());
        name = `${collectionName || 'Bundle Collection'} (${tokenIds.length} items)`;
        description = `Bundle of ${tokenIds.length} NFTs. ${metadata.description}`;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      } else {
        // For single NFT
        metadata = await this.fetchNFTMetadata(nftContract, tokenId.toString());
        name = metadata.name;
        description = metadata.description;
        image = metadata.image;
        attributes = JSON.stringify(metadata.attributes);
      }

      // Upsert to cache
      await cacheQueries.upsertListing({
        listing_id: id.toString(),
        name,
        contract_address: nftContract,
        token_id: tokenId.toString() || 'bundle',
        seller,
        price: formatEther(price),
        collection_name: collectionName || (isBundle ? 'Bundle Collection' : 'Single NFT'),
        image,
        description,
        attributes,
        is_active: isActive,
        is_bundle: isBundle,
        is_from_collection: Boolean(collectionName),
        bundle_token_ids: isBundle ? JSON.stringify(tokenIds.map(id => id.toString())) : undefined,
        listing_type: isBundle ? 'collection_bundle' : 'single',
        blockchain_id: id.toString(),
        metadata_synced: true,
        views: 0,
        likes: 0
      });

    } catch (error) {
      console.error(`Error syncing listing ${id}:`, error);
    }
  }

  private async syncAuctions() {
    try {
      // Get active auctions from blockchain
      // This would depend on your auction contract's getter functions
      const auctionStats = await readContract(config, {
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuctionCount',
      }) as bigint;

      const totalAuctions = Number(auctionStats);
      if (totalAuctions === 0) return;

      console.log(`Found ${totalAuctions} auctions on blockchain`);

      // Process auctions in batches
      for (let i = 0; i < totalAuctions; i += this.BATCH_SIZE) {
        const batch = [];
        for (let j = i; j < Math.min(i + this.BATCH_SIZE, totalAuctions); j++) {
          batch.push(BigInt(j));
        }
        await this.processAuctionBatch(batch);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error syncing auctions:', error);
    }
  }

  private async processAuctionBatch(ids: bigint[]) {
    const promises = ids.map(id => this.syncSingleAuction(id));
    await Promise.allSettled(promises);
  }

  private async syncSingleAuction(id: bigint) {
    try {
      // Get auction info from blockchain
      const auction = await readContract(config, {
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuction',
        args: [id]
      }) as {
        state: number;
        highestBid: bigint;
        bidCount: number;
        seller: string;
        startTime: bigint;
        endTime: bigint;
        allowPublicReveal: boolean;
      };

      if (!auction || auction.state !== 0) { // Assuming 0 is ACTIVE state
        // Mark as inactive in cache
        await cacheQueries.finalizeAuction(id.toString());
        return;
      }

      // Check if already in cache and up to date
      const cachedAuction = await cacheQueries.getAuctionById(id.toString());
      if (cachedAuction && cachedAuction.metadata_synced) {
        // Just update the current bid if it changed
        const currentBid = formatEther(auction.highestBid);
        if (cachedAuction.current_highest_bid !== currentBid) {
          await cacheQueries.updateAuctionBid(id.toString(), currentBid, auction.bidCount);
        }
        return;
      }

      // Process new auction (similar to listing sync)
      // This would involve fetching metadata and upserting to cache
      // Implementation depends on your auction structure

    } catch (error) {
      console.error(`Error syncing auction ${id}:`, error);
    }
  }

  private async fetchNFTMetadata(nftContract: string, tokenId: string) {
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

  // Method to manually trigger sync
  async triggerSync() {
    if (this.isRunning) {
      await this.performSync();
    } else {
      console.log('Background sync is not running');
    }
  }

  // Method to get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.SYNC_INTERVAL,
      batchSize: this.BATCH_SIZE
    };
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncService();

// Utility function to start sync in API route
export async function initializeBackgroundSync() {
  if (typeof window === 'undefined') {
    // Only run on server side
    await backgroundSync.start();
  }
}

// Utility function to stop sync
export async function stopBackgroundSync() {
  backgroundSync.stop();
}