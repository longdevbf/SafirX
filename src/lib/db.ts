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

// Initialize database tables
export const initializeDatabase = async () => {
  try {
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
    
    // Create index on w_address for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_w_address ON users(w_address)
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
  initializeDatabase,
  testConnection,
  closePool
}