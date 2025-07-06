import { userQueries, sql } from '@/lib/db'

async function fixProfileImageUrls() {
  try {
    console.log('Starting profile image URL fix...')
    
    // Get all users with Google Drive URLs
    const users = await sql`SELECT * FROM users WHERE m_img LIKE '%drive.google.com%'`
    
    console.log(`Found ${users.length} users with Google Drive profile images`)
    
    for (const user of users) {
      let needsUpdate = false
      let newProfileImg = user.m_img
      
      // Convert profile image URL from uc?id= to thumbnail format
      if (user.m_img && user.m_img.includes('drive.google.com/uc?id=')) {
        const fileId = user.m_img.split('id=')[1]
        newProfileImg = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
        needsUpdate = true
        console.log(`Converting profile URL for ${user.w_address}:`)
        console.log(`  From: ${user.m_img}`)
        console.log(`  To: ${newProfileImg}`)
      }
      
      if (needsUpdate) {
        await userQueries.updateUser(user.w_address, {
          m_img: newProfileImg
        })
        console.log(`✅ Updated profile URL for user: ${user.w_address}`)
      }
    }
    
    console.log('✅ Profile image URL migration completed')
  } catch (error) {
    console.error('❌ Error fixing profile image URLs:', error)
  }
}

// Export for use
export { fixProfileImageUrls }

// Run if called directly
if (require.main === module) {
  fixProfileImageUrls().then(() => process.exit(0))
}