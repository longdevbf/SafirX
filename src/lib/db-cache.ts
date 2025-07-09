import { Pool, PoolClient } from 'pg';
import { ProcessedNFT } from '@/interfaces/nft';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const client: PoolClient = await pool.connect();
  
  try {
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}` + strings[i + 1];
    }
    
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ✅ Database interfaces
export interface DBListing {
  id: string;
  listing_id: string;
  collection_id?: string;
  name: string;
  contract_address: string;
  token_id: string;
  seller: string;
  price: string;
  collection_name?: string;
  image: string;
  description?: string;
  attributes?: string; // JSON stringified
  is_active: boolean;
  is_bundle: boolean;
  is_from_collection: boolean;
  bundle_token_ids?: string; // JSON stringified
  listing_type: 'single' | 'collection_bundle' | 'collection_individual';
  created_at: Date;
  updated_at: Date;
  blockchain_id: string; // ID from blockchain
  metadata_synced: boolean;
  views: number;
  likes: number;
}

export interface DBAuction {
  id: string;
  auction_id: string;
  name: string;
  contract_address: string;
  token_ids: string; // JSON stringified
  seller: string;
  starting_price: string;
  reserve_price: string;
  current_highest_bid: string;
  image: string;
  description?: string;
  attributes?: string; // JSON stringified
  is_active: boolean;
  is_collection: boolean;
  auction_type: 'single' | 'collection';
  start_time: Date;
  end_time: Date;
  created_at: Date;
  updated_at: Date;
  blockchain_id: string;
  metadata_synced: boolean;
  views: number;
  likes: number;
  bid_count: number;
  allow_public_reveal: boolean;
}

// ✅ Cache Management Functions
export const cacheQueries = {
  // === LISTINGS ===
  
  async upsertListing(listing: Partial<DBListing>) {
    try {
      const result = await sql`
        INSERT INTO cached_listings (
          listing_id, collection_id, name, contract_address, token_id, seller, price,
          collection_name, image, description, attributes, is_active, is_bundle,
          is_from_collection, bundle_token_ids, listing_type, blockchain_id,
          metadata_synced, views, likes
        ) VALUES (
          ${listing.listing_id}, ${listing.collection_id}, ${listing.name},
          ${listing.contract_address}, ${listing.token_id}, ${listing.seller},
          ${listing.price}, ${listing.collection_name}, ${listing.image},
          ${listing.description}, ${listing.attributes}, ${listing.is_active},
          ${listing.is_bundle}, ${listing.is_from_collection}, ${listing.bundle_token_ids},
          ${listing.listing_type}, ${listing.blockchain_id}, ${listing.metadata_synced || false},
          ${listing.views || 0}, ${listing.likes || 0}
        )
        ON CONFLICT (blockchain_id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          image = EXCLUDED.image,
          description = EXCLUDED.description,
          attributes = EXCLUDED.attributes,
          is_active = EXCLUDED.is_active,
          metadata_synced = EXCLUDED.metadata_synced,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error upserting listing:', error);
      throw error;
    }
  },

  async getActiveListings(limit: number = 50, offset: number = 0) {
    try {
      const result = await sql`
        SELECT * FROM cached_listings
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return result;
    } catch (error) {
      console.error('Error fetching active listings:', error);
      throw error;
    }
  },

  async getListingById(blockchainId: string) {
    try {
      const result = await sql`
        SELECT * FROM cached_listings
        WHERE blockchain_id = ${blockchainId}
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching listing by ID:', error);
      throw error;
    }
  },

  async getListingsByCollection(collectionName: string) {
    try {
      const result = await sql`
        SELECT * FROM cached_listings
        WHERE collection_name = ${collectionName} AND is_active = true
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error('Error fetching listings by collection:', error);
      throw error;
    }
  },

  async getListingsBySeller(sellerAddress: string) {
    try {
      const result = await sql`
        SELECT * FROM cached_listings
        WHERE seller = ${sellerAddress}
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error('Error fetching listings by seller:', error);
      throw error;
    }
  },

  async deactivateListing(blockchainId: string) {
    try {
      const result = await sql`
        UPDATE cached_listings 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE blockchain_id = ${blockchainId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error deactivating listing:', error);
      throw error;
    }
  },

  // === AUCTIONS ===

  async upsertAuction(auction: Partial<DBAuction>) {
    try {
      const result = await sql`
        INSERT INTO cached_auctions (
          auction_id, name, contract_address, token_ids, seller, starting_price,
          reserve_price, current_highest_bid, image, description, attributes,
          is_active, is_collection, auction_type, start_time, end_time,
          blockchain_id, metadata_synced, views, likes, bid_count, allow_public_reveal
        ) VALUES (
          ${auction.auction_id}, ${auction.name}, ${auction.contract_address},
          ${auction.token_ids}, ${auction.seller}, ${auction.starting_price},
          ${auction.reserve_price}, ${auction.current_highest_bid}, ${auction.image},
          ${auction.description}, ${auction.attributes}, ${auction.is_active},
          ${auction.is_collection}, ${auction.auction_type}, ${auction.start_time},
          ${auction.end_time}, ${auction.blockchain_id}, ${auction.metadata_synced || false},
          ${auction.views || 0}, ${auction.likes || 0}, ${auction.bid_count || 0},
          ${auction.allow_public_reveal || false}
        )
        ON CONFLICT (blockchain_id) DO UPDATE SET
          name = EXCLUDED.name,
          current_highest_bid = EXCLUDED.current_highest_bid,
          image = EXCLUDED.image,
          description = EXCLUDED.description,
          attributes = EXCLUDED.attributes,
          is_active = EXCLUDED.is_active,
          bid_count = EXCLUDED.bid_count,
          metadata_synced = EXCLUDED.metadata_synced,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error upserting auction:', error);
      throw error;
    }
  },

  async getActiveAuctions(limit: number = 50, offset: number = 0) {
    try {
      const result = await sql`
        SELECT * FROM cached_auctions
        WHERE is_active = true AND end_time > NOW()
        ORDER BY end_time ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return result;
    } catch (error) {
      console.error('Error fetching active auctions:', error);
      throw error;
    }
  },

  async getAuctionById(blockchainId: string) {
    try {
      const result = await sql`
        SELECT * FROM cached_auctions
        WHERE blockchain_id = ${blockchainId}
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching auction by ID:', error);
      throw error;
    }
  },

  async getAuctionsBySeller(sellerAddress: string) {
    try {
      const result = await sql`
        SELECT * FROM cached_auctions
        WHERE seller = ${sellerAddress}
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error('Error fetching auctions by seller:', error);
      throw error;
    }
  },

  async updateAuctionBid(blockchainId: string, newBid: string, bidCount: number) {
    try {
      const result = await sql`
        UPDATE cached_auctions 
        SET current_highest_bid = ${newBid}, bid_count = ${bidCount}, updated_at = CURRENT_TIMESTAMP
        WHERE blockchain_id = ${blockchainId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error updating auction bid:', error);
      throw error;
    }
  },

  async finalizeAuction(blockchainId: string) {
    try {
      const result = await sql`
        UPDATE cached_auctions 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE blockchain_id = ${blockchainId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error finalizing auction:', error);
      throw error;
    }
  },

  // === UTILITY FUNCTIONS ===

  async searchListings(searchTerm: string, limit: number = 50) {
    try {
      const result = await sql`
        SELECT * FROM cached_listings
        WHERE is_active = true AND (
          name ILIKE ${`%${searchTerm}%`} OR
          collection_name ILIKE ${`%${searchTerm}%`} OR
          description ILIKE ${`%${searchTerm}%`}
        )
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return result;
    } catch (error) {
      console.error('Error searching listings:', error);
      throw error;
    }
  },

  async getMarketplaceStats() {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as active_listings,
          COUNT(*) as total_listings,
          COUNT(DISTINCT collection_name) FILTER (WHERE collection_name IS NOT NULL) as total_collections,
          COUNT(*) FILTER (WHERE is_bundle = true AND is_active = true) as active_bundles
        FROM cached_listings
        UNION ALL
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as active_auctions,
          COUNT(*) as total_auctions,
          0 as placeholder1,
          0 as placeholder2
        FROM cached_auctions
      `;
      return result;
    } catch (error) {
      console.error('Error fetching marketplace stats:', error);
      throw error;
    }
  },

  async updateViewsAndLikes(type: 'listing' | 'auction', blockchainId: string, views?: number, likes?: number) {
    try {
      const table = type === 'listing' ? 'cached_listings' : 'cached_auctions';
      const updates = [];
      const values = [];
      
      if (views !== undefined) {
        updates.push(`views = $${values.length + 1}`);
        values.push(views);
      }
      
      if (likes !== undefined) {
        updates.push(`likes = $${values.length + 1}`);
        values.push(likes);
      }
      
      values.push(blockchainId);
      
      if (updates.length === 0) return null;
      
      const query = `
        UPDATE ${table}
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE blockchain_id = $${values.length}
        RETURNING *
      `;
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating views/likes:', error);
      throw error;
    }
  }
};

// ✅ Helper functions to convert between DB and ProcessedNFT
export const dbToProcessedNFT = (dbItem: DBListing | DBAuction): ProcessedNFT => {
  const isAuction = 'auction_id' in dbItem;
  
  if (isAuction) {
    const auction = dbItem as DBAuction;
    return {
      id: `auction-${auction.blockchain_id}`,
      auctionId: auction.auction_id,
      name: auction.name,
      contractAddress: auction.contract_address,
      tokenId: auction.is_collection ? 'collection' : JSON.parse(auction.token_ids)[0],
      seller: auction.seller,
      price: auction.current_highest_bid || auction.starting_price,
      image: auction.image,
      collection: auction.is_collection ? 'collection-auction' : 'single-auction',
      description: auction.description,
      attributes: auction.attributes ? JSON.parse(auction.attributes) : [],
      isActive: auction.is_active,
      isBundle: auction.is_collection,
      isFromCollection: auction.is_collection,
      views: auction.views,
      likes: auction.likes,
      verified: true,
      canPurchase: false, // Auctions can't be purchased directly
      rarity: 'Common',
      // Auction specific fields
      startingPrice: auction.starting_price,
      reservePrice: auction.reserve_price,
      currentBid: auction.current_highest_bid,
      bidCount: auction.bid_count,
      endTime: auction.end_time,
      collectionName: auction.is_collection ? 'Auction Collection' : 'Single Auction',
      bundleTokenIds: auction.is_collection ? JSON.parse(auction.token_ids) : undefined,
    };
  } else {
    const listing = dbItem as DBListing;
    return {
      id: listing.id,
      listingId: listing.listing_id,
      collectionId: listing.collection_id,
      name: listing.name,
      contractAddress: listing.contract_address,
      tokenId: listing.token_id,
      seller: listing.seller,
      price: listing.price,
      collectionName: listing.collection_name || 'Single NFT',
      image: listing.image,
      collection: (listing.collection_name || 'single-nft').toLowerCase().replace(/\s+/g, '-'),
      description: listing.description,
      attributes: listing.attributes ? JSON.parse(listing.attributes) : [],
      isActive: listing.is_active,
      isBundle: listing.is_bundle,
      isFromCollection: listing.is_from_collection,
      views: listing.views,
      likes: listing.likes,
      verified: Boolean(listing.collection_name),
      canPurchase: listing.is_active,
      rarity: 'Common',
      bundleTokenIds: listing.bundle_token_ids ? JSON.parse(listing.bundle_token_ids) : undefined,
    };
  }
};

// ✅ Initialize cache tables
export const initializeCacheTables = async () => {
  try {
    // Create listings cache table
    await sql`
      CREATE TABLE IF NOT EXISTS cached_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id VARCHAR(100),
        collection_id VARCHAR(100),
        name VARCHAR(500) NOT NULL,
        contract_address VARCHAR(100) NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        seller VARCHAR(100) NOT NULL,
        price VARCHAR(100) NOT NULL,
        collection_name VARCHAR(200),
        image TEXT,
        description TEXT,
        attributes TEXT, -- JSON
        is_active BOOLEAN DEFAULT true,
        is_bundle BOOLEAN DEFAULT false,
        is_from_collection BOOLEAN DEFAULT false,
        bundle_token_ids TEXT, -- JSON
        listing_type VARCHAR(50) NOT NULL DEFAULT 'single',
        blockchain_id VARCHAR(100) UNIQUE NOT NULL,
        metadata_synced BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create auctions cache table
    await sql`
      CREATE TABLE IF NOT EXISTS cached_auctions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auction_id VARCHAR(100),
        name VARCHAR(500) NOT NULL,
        contract_address VARCHAR(100) NOT NULL,
        token_ids TEXT NOT NULL, -- JSON array
        seller VARCHAR(100) NOT NULL,
        starting_price VARCHAR(100) NOT NULL,
        reserve_price VARCHAR(100) NOT NULL,
        current_highest_bid VARCHAR(100) DEFAULT '0',
        image TEXT,
        description TEXT,
        attributes TEXT, -- JSON
        is_active BOOLEAN DEFAULT true,
        is_collection BOOLEAN DEFAULT false,
        auction_type VARCHAR(50) NOT NULL DEFAULT 'single',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        blockchain_id VARCHAR(100) UNIQUE NOT NULL,
        metadata_synced BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        bid_count INTEGER DEFAULT 0,
        allow_public_reveal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_listings_active ON cached_listings(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_listings_seller ON cached_listings(seller)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_listings_collection ON cached_listings(collection_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_listings_blockchain_id ON cached_listings(blockchain_id)`;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_auctions_active ON cached_auctions(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auctions_seller ON cached_auctions(seller)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON cached_auctions(end_time)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auctions_blockchain_id ON cached_auctions(blockchain_id)`;

    console.log('Cache tables initialized successfully');
  } catch (error) {
    console.error('Error initializing cache tables:', error);
    throw error;
  }
};

export default {
  cacheQueries,
  dbToProcessedNFT,
  initializeCacheTables,
};