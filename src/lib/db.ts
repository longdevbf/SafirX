import {Pool, PoolClient} from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

})
export const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const client: PoolClient = await pool.connect()
  
  try {
    // Build the query from template string
    let query = strings[0]
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}` + strings[i + 1]
    }
    
    const result = await client.query(query, values)
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Database helper functions for users table
export const userQueries = {
  // Get user by wallet address
  async getUserByAddress(address: string) {
    try {
      const result = await sql`
        SELECT * FROM users WHERE w_address = ${address}
      `
      return result[0] || null
    } catch (error) {
      console.error('Error getting user by address:', error)
      throw error
    }
  },

  // Create new user
  async createUser(userData: {
    name: string
    description: string
    w_address: string
    m_img?: string
    b_img?: string
  }) {
    try {
      const result = await sql`
        INSERT INTO users (name, description, w_address, m_img, b_img)
        VALUES (${userData.name}, ${userData.description}, ${userData.w_address}, ${userData.m_img || ''}, ${userData.b_img || ''})
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  // Update user (excluding w_address and id)
  async updateUser(address: string, userData: {
    name?: string
    description?: string
    m_img?: string
    b_img?: string
  }) {
    try {
      const updates: string[] = []
      const values: unknown[] = []
      let paramCount = 1

      // Build dynamic update query
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramCount}`)
          values.push(value)
          paramCount++
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(address) // Add address as last parameter

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE w_address = $${paramCount}
        RETURNING *
      `

      const client = await pool.connect()
      try {
        const result = await client.query(query, values)
        return result.rows[0]
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  },

  // Create user if not exists, otherwise update
  async upsertUser(userData: {
    name: string
    description: string
    w_address: string
    m_img?: string
    b_img?: string
  }) {
    try {
      const existingUser = await this.getUserByAddress(userData.w_address)
      
      if (existingUser) {
        return await this.updateUser(userData.w_address, {
          name: userData.name,
          description: userData.description,
          m_img: userData.m_img,
          b_img: userData.b_img
        })
      } else {
        return await this.createUser(userData)
      }
    } catch (error) {
      console.error('Error upserting user:', error)
      throw error
    }
  },

  // Get total user count
  async getUserCount() {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM users
      `
      return parseInt(result[0].count)
    } catch (error) {
      console.error('Error getting user count:', error)
      throw error
    }
  },

  // Get recent users (for admin purposes)
  async getRecentUsers(limit: number = 10) {
    try {
      const result = await sql`
        SELECT id, name, w_address, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `
      return result
    } catch (error) {
      console.error('Error getting recent users:', error)
      throw error
    }
  }
}

// Database helper functions for NFT listings
export const listingQueries = {
  // Create new listing
  async createListing(listingData: {
    listing_id: string
    nft_contract: string
    token_id: string
    seller: string
    price: string
    collection_name?: string
    name: string
    description?: string
    category?: string
    image: string
    attributes?: string
    rarity?: string
    is_bundle: boolean
    bundle_token_ids?: string
    collection_image?: string
    tx_hash: string
  }) {
    try {
      const result = await sql`
        INSERT INTO listings (
          listing_id, nft_contract, token_id, seller, price, collection_name,
          name, description, category, image, attributes, rarity, is_bundle,
          bundle_token_ids, collection_image, tx_hash, likes_count, views_count
        ) VALUES (
          ${listingData.listing_id}, ${listingData.nft_contract}, ${listingData.token_id},
          ${listingData.seller}, ${listingData.price}, ${listingData.collection_name || ''},
          ${listingData.name}, ${listingData.description || ''}, ${listingData.category || ''},
          ${listingData.image}, ${listingData.attributes || ''}, ${listingData.rarity || 'Common'},
          ${listingData.is_bundle}, ${listingData.bundle_token_ids || ''}, ${listingData.collection_image || ''},
          ${listingData.tx_hash}, 0, 0
        ) RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error creating listing:', error)
      throw error
    }
  },

  // Get paginated listings
  async getListings(page: number = 1, limit: number = 20, filters?: {
    category?: string
    collection?: string
    rarity?: string
    priceMin?: number
    priceMax?: number
    search?: string
  }) {
    try {
      const offset = (page - 1) * limit
      let whereClause = 'WHERE is_active = true'
      const values: unknown[] = []
      let paramCount = 1

      if (filters) {
        if (filters.category) {
          whereClause += ` AND category = $${paramCount}`
          values.push(filters.category)
          paramCount++
        }
        if (filters.collection) {
          whereClause += ` AND collection_name = $${paramCount}`
          values.push(filters.collection)
          paramCount++
        }
        if (filters.rarity) {
          whereClause += ` AND rarity = $${paramCount}`
          values.push(filters.rarity)
          paramCount++
        }
        if (filters.priceMin) {
          whereClause += ` AND CAST(price AS DECIMAL) >= $${paramCount}`
          values.push(filters.priceMin)
          paramCount++
        }
        if (filters.priceMax) {
          whereClause += ` AND CAST(price AS DECIMAL) <= $${paramCount}`
          values.push(filters.priceMax)
          paramCount++
        }
        if (filters.search) {
          whereClause += ` AND (name ILIKE $${paramCount} OR collection_name ILIKE $${paramCount})`
          values.push(`%${filters.search}%`)
          paramCount++
        }
      }

      const query = `
        SELECT * FROM listings 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `
      
      values.push(limit, offset)

      const client = await pool.connect()
      try {
        const result = await client.query(query, values)
        return result.rows
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error getting listings:', error)
      throw error
    }
  },

  // Get total listings count
  async getListingsCount(filters?: {
    category?: string
    collection?: string
    rarity?: string
    priceMin?: number
    priceMax?: number
    search?: string
  }) {
    try {
      let whereClause = 'WHERE is_active = true'
      const values: unknown[] = []
      let paramCount = 1

      if (filters) {
        if (filters.category) {
          whereClause += ` AND category = $${paramCount}`
          values.push(filters.category)
          paramCount++
        }
        if (filters.collection) {
          whereClause += ` AND collection_name = $${paramCount}`
          values.push(filters.collection)
          paramCount++
        }
        if (filters.rarity) {
          whereClause += ` AND rarity = $${paramCount}`
          values.push(filters.rarity)
          paramCount++
        }
        if (filters.priceMin) {
          whereClause += ` AND CAST(price AS DECIMAL) >= $${paramCount}`
          values.push(filters.priceMin)
          paramCount++
        }
        if (filters.priceMax) {
          whereClause += ` AND CAST(price AS DECIMAL) <= $${paramCount}`
          values.push(filters.priceMax)
          paramCount++
        }
        if (filters.search) {
          whereClause += ` AND (name ILIKE $${paramCount} OR collection_name ILIKE $${paramCount})`
          values.push(`%${filters.search}%`)
          paramCount++
        }
      }

      const query = `SELECT COUNT(*) as count FROM listings ${whereClause}`
      
      const client = await pool.connect()
      try {
        const result = await client.query(query, values)
        return parseInt(result.rows[0].count)
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error getting listings count:', error)
      throw error
    }
  },

  // Update listing status
  async updateListingStatus(listingId: string, isActive: boolean) {
    try {
      const result = await sql`
        UPDATE listings 
        SET is_active = ${isActive}, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ${listingId}
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error updating listing status:', error)
      throw error
    }
  },

  // Increment likes
  async incrementLikes(listingId: string) {
    try {
      const result = await sql`
        UPDATE listings 
        SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ${listingId}
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error incrementing likes:', error)
      throw error
    }
  },

  // Increment views
  async incrementViews(listingId: string) {
    try {
      const result = await sql`
        UPDATE listings 
        SET views_count = views_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ${listingId}
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error incrementing views:', error)
      throw error
    }
  },

  // Get collections summary
  async getCollectionsSummary() {
    try {
      const result = await sql`
        SELECT 
          collection_name,
          COUNT(*) as total_items,
          MIN(CAST(price AS DECIMAL)) as floor_price,
          MAX(CAST(price AS DECIMAL)) as ceiling_price,
          AVG(CAST(price AS DECIMAL)) as avg_price,
          SUM(likes_count) as total_likes,
          SUM(views_count) as total_views,
          MAX(collection_image) as collection_image
        FROM listings 
        WHERE is_active = true AND collection_name != '' AND collection_name IS NOT NULL
        GROUP BY collection_name
        ORDER BY total_items DESC
      `
      return result
    } catch (error) {
      console.error('Error getting collections summary:', error)
      throw error
    }
  }
}

// Database helper functions for auctions
export const auctionQueries = {
  // Create new auction
  async createAuction(auctionData: {
    auction_id: string
    nft_contract: string
    token_id: string
    seller: string
    starting_price: string
    reserve_price: string
    end_time: Date
    collection_name?: string
    name: string
    description?: string
    category?: string
    image: string
    attributes?: string
    is_collection: boolean
    collection_token_ids?: string
    collection_image?: string
    tx_hash: string
  }) {
    try {
      const result = await sql`
        INSERT INTO auctions (
          auction_id, nft_contract, token_id, seller, starting_price, reserve_price,
          end_time, collection_name, name, description, category, image, attributes,
          is_collection, collection_token_ids, collection_image, tx_hash, likes_count, views_count
        ) VALUES (
          ${auctionData.auction_id}, ${auctionData.nft_contract}, ${auctionData.token_id},
          ${auctionData.seller}, ${auctionData.starting_price}, ${auctionData.reserve_price},
          ${auctionData.end_time}, ${auctionData.collection_name || ''}, ${auctionData.name},
          ${auctionData.description || ''}, ${auctionData.category || ''}, ${auctionData.image},
          ${auctionData.attributes || ''}, ${auctionData.is_collection}, ${auctionData.collection_token_ids || ''},
          ${auctionData.collection_image || ''}, ${auctionData.tx_hash}, 0, 0
        ) RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Error creating auction:', error)
      throw error
    }
  },

  // Get paginated auctions
  async getAuctions(page: number = 1, limit: number = 20, filters?: {
    category?: string
    collection?: string
    status?: 'active' | 'ended'
    search?: string
  }) {
    try {
      const offset = (page - 1) * limit
      let whereClause = 'WHERE is_active = true'
      const values: unknown[] = []
      let paramCount = 1

      if (filters) {
        if (filters.category) {
          whereClause += ` AND category = $${paramCount}`
          values.push(filters.category)
          paramCount++
        }
        if (filters.collection) {
          whereClause += ` AND collection_name = $${paramCount}`
          values.push(filters.collection)
          paramCount++
        }
        if (filters.status === 'active') {
          whereClause += ` AND end_time > CURRENT_TIMESTAMP`
        } else if (filters.status === 'ended') {
          whereClause += ` AND end_time <= CURRENT_TIMESTAMP`
        }
        if (filters.search) {
          whereClause += ` AND (name ILIKE $${paramCount} OR collection_name ILIKE $${paramCount})`
          values.push(`%${filters.search}%`)
          paramCount++
        }
      }

      const query = `
        SELECT * FROM auctions 
        ${whereClause}
        ORDER BY end_time ASC 
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `
      
      values.push(limit, offset)

      const client = await pool.connect()
      try {
        const result = await client.query(query, values)
        return result.rows
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error getting auctions:', error)
      throw error
    }
  }
}

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description VARCHAR(500),
        w_address VARCHAR(200) UNIQUE NOT NULL,
        m_img VARCHAR(200) DEFAULT '',
        b_img VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    // Create listings table
    await sql`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        listing_id VARCHAR(100) UNIQUE NOT NULL,
        nft_contract VARCHAR(100) NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        seller VARCHAR(100) NOT NULL,
        price VARCHAR(100) NOT NULL,
        collection_name VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        image VARCHAR(500) NOT NULL,
        attributes TEXT DEFAULT '',
        rarity VARCHAR(50) DEFAULT 'Common',
        is_bundle BOOLEAN DEFAULT FALSE,
        bundle_token_ids TEXT DEFAULT '',
        collection_image VARCHAR(500) DEFAULT '',
        tx_hash VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create auctions table
    await sql`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        auction_id VARCHAR(100) UNIQUE NOT NULL,
        nft_contract VARCHAR(100) NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        seller VARCHAR(100) NOT NULL,
        starting_price VARCHAR(100) NOT NULL,
        reserve_price VARCHAR(100) NOT NULL,
        current_bid VARCHAR(100) DEFAULT '0',
        highest_bidder VARCHAR(100) DEFAULT '',
        end_time TIMESTAMP NOT NULL,
        collection_name VARCHAR(200) DEFAULT '',
        name VARCHAR(200) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        image VARCHAR(500) NOT NULL,
        attributes TEXT DEFAULT '',
        is_collection BOOLEAN DEFAULT FALSE,
        collection_token_ids TEXT DEFAULT '',
        collection_image VARCHAR(500) DEFAULT '',
        tx_hash VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_w_address ON users(w_address)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listings_listing_id ON listings(listing_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listings_collection ON listings(collection_name)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_auctions_auction_id ON auctions(auction_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_auctions_active ON auctions(is_active)
    `
    
    console.log('Database tables initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Test database connection
export const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW() as current_time`
    console.log('Database connection successful:', result[0].current_time)
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Close database pool (for cleanup)
export const closePool = async () => {
  await pool.end()
}

// Export pool for advanced usage
export { pool }

// Default export
export default {
  sql,
  userQueries,
  listingQueries,
  auctionQueries,
  initializeDatabase,
  testConnection,
  closePool
}