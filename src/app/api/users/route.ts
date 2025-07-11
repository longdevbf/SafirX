// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { userQueries } from '@/lib/db' // Uncomment this

// Google Drive setup with better error handling
let drive: ReturnType<typeof google.drive> | null = null // Fix: Replace 'any' with proper type
let driveConfigured = false

try {
  if (process.env.GOOGLE_DRIVE_CLIENT_EMAIL && 
      process.env.GOOGLE_DRIVE_PRIVATE_KEY && 
      process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    drive = google.drive({ version: 'v3', auth })
    driveConfigured = true
    console.log('Google Drive configured successfully')
  } else {
    console.warn('Google Drive environment variables not set')
  }
} catch (error) {
  console.error('Error configuring Google Drive:', error)
}

// Helper function to convert buffer to stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}

// Remove the unused function or add this comment if you plan to use it later
// Test Google Drive connection and folder access
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function testGoogleDriveAccess(): Promise<boolean> {
  if (!driveConfigured || !drive) return false
  
  try {
    // Test if we can access the folder
    const folder = await drive.files.get({
      fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      fields: 'id, name, permissions'
    })
    
    console.log('Google Drive folder accessed successfully:', folder.data.name)
    return true
  } catch (error) {
    console.error('Cannot access Google Drive folder:', error)
    return false
  }
}

// Enhanced upload function with better error handling and fallback
async function uploadImageWithFallback(file: File, fileName: string, isProfile: boolean = false): Promise<string> {
  console.log(`Processing image upload: ${fileName} (${(file.size / 1024).toFixed(1)}KB)`)
  
  // Try Google Drive first (with shared drive support)
  if (driveConfigured && drive) {
    try {
      const imageUrl = await uploadToGoogleDrive(file, fileName, isProfile)
      console.log('✅ Google Drive upload successful:', imageUrl)
      return imageUrl
    } catch (error) {
      console.error('❌ Google Drive upload failed:', error)
      
      // If it's a Service Account quota issue, suggest solutions
      if (error.message.includes('Service Accounts do not have storage quota')) {
        console.log('💡 Service Account quota issue detected. Consider using shared drives or OAuth delegation.')
      }
    }
  }
  
  // Fallback 1: Try converting to base64 only if image is very small (< 100KB)
  // This prevents database issues with overly long base64 strings
  if (file.size < 100 * 1024) {
    try {
      console.log('🔄 Trying base64 conversion fallback...')
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'
      const dataUrl = `data:${mimeType};base64,${base64}`
      
      // Additional check: ensure the base64 URL isn't too long for practical use
      if (dataUrl.length < 50000) {
        console.log('✅ Base64 conversion successful')
        return dataUrl
      } else {
        console.log('⚠️ Base64 string too long, using placeholder instead')
      }
    } catch (base64Error) {
      console.error('❌ Base64 conversion failed:', base64Error)
    }
  } else {
    console.log('⚠️ Image too large for base64 fallback (>100KB)')
  }
  
  // Fallback 2: Use placeholder image
  const placeholderUrl = isProfile 
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${fileName}&size=400&backgroundColor=random`
    : `https://via.placeholder.com/1200x300/6366f1/ffffff?text=Banner+Image`
  
  console.log('🔄 Using placeholder image as final fallback:', placeholderUrl)
  return placeholderUrl
}

// Upload to Google Drive with Shared Drive support
async function uploadToGoogleDrive(file: File, fileName: string, isProfile: boolean = false): Promise<string> {
  if (!drive) {
    throw new Error('Google Drive not configured')
  }

  try {
    console.log(`Uploading file to Google Drive: ${fileName}`)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = bufferToStream(buffer)
    
    const fileMetadata = {
      name: `${fileName}_${Date.now()}.${file.name.split('.').pop()}`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    }
    
    // If using shared drive, add supportsAllDrives parameter
    const createParams = {
      requestBody: fileMetadata,
      media: {
        mimeType: file.type,
        body: stream,
      },
      // Add support for shared drives
      supportsAllDrives: true,
    }
    
    const response = await drive.files.create(createParams)

    if (!response.data.id) {
      throw new Error('Failed to get file ID from Google Drive response')
    }

    console.log(`File uploaded successfully with ID: ${response.data.id}`)

    // Make file publicly viewable with shared drive support
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true, // Add this for shared drive support
    })

    console.log('File permissions updated to public')

    // Return different formats for profile images vs banners
    if (isProfile) {
      // For profile images, use a smaller thumbnail size
      return `https://drive.google.com/thumbnail?id=${response.data.id}&sz=w400`
    } else {
      // For banner images, use larger size
      return `https://drive.google.com/thumbnail?id=${response.data.id}&sz=w1200`
    }
  } catch (error) {
    console.error('Error uploading to Google Drive:', error)
    throw error
  }
}

// ...rest of the code remains the same...
// GET - Get user by wallet address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    console.log('GET /api/users called with address:', address)

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    try {
      // Try to get user from database
      const user = await userQueries.getUserByAddress(address)
      
      if (user) {
        console.log('User found in database:', user)
        return NextResponse.json(user)
      }
    } catch (dbError) {
      console.error('Database error, using fallback:', dbError)
    }

    // If user not found or database error, create default user
    const defaultUser = {
      id: Date.now(),
      name: 'User',
      description: 'Digital art enthusiast and NFT collector',
      w_address: address,
      m_img: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
      b_img: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try to save to database
    try {
      const savedUser = await userQueries.createUser({
        name: defaultUser.name,
        description: defaultUser.description,
        w_address: address,
        m_img: defaultUser.m_img,
        b_img: defaultUser.b_img
      })
      console.log('Default user created in database:', savedUser)
      return NextResponse.json(savedUser)
    } catch (dbError) {
      console.error('Could not save to database:', dbError)
      return NextResponse.json(defaultUser)
    }
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create or update user
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/users called')
    
    const formData = await request.formData()
    const uploadType = formData.get('uploadType') as string
    
    // Handle collection image upload separately
    if (uploadType === 'collection') {
      console.log('🖼️ Handling collection image upload...')
      
      const collectionImage = formData.get('collectionImage') as File | null
      
      if (!collectionImage) {
        return NextResponse.json({ error: 'No collection image provided' }, { status: 400 })
      }
      
      try {
        console.log('📤 Uploading collection image...')
        const imageUrl = await uploadImageWithFallback(collectionImage, `collection_cover`, false)
        console.log('✅ Collection image processed:', imageUrl)
        
        return NextResponse.json({ 
          collection_image: imageUrl,
          success: true 
        })
      } catch (error) {
        console.error('❌ Failed to process collection image:', error)
        return NextResponse.json({ 
          error: 'Failed to process collection image',
          details: error.message 
        }, { status: 500 })
      }
    }
    
    // Original user profile logic continues below...
    const address = formData.get('address') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const profileImage = formData.get('profileImage') as File | null
    const bannerImage = formData.get('bannerImage') as File | null

    console.log('Received data:', {
      address,
      name,
      description,
      hasProfileImage: !!profileImage,
      hasBannerImage: !!bannerImage,
      profileImageSize: profileImage?.size,
      bannerImageSize: bannerImage?.size
    })

    // Validation
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get existing user data first
    let existingUser = null
    try {
      existingUser = await userQueries.getUserByAddress(address)
      console.log('Existing user found:', existingUser)
    } catch (dbError) {
      console.log('No existing user found or database error:', dbError)
    }

    let profileImageUrl = existingUser?.m_img || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`
    let bannerImageUrl = existingUser?.b_img || ''

    // Upload profile image with enhanced fallback
    if (profileImage) {
      try {
        console.log('Uploading profile image...')
        profileImageUrl = await uploadImageWithFallback(profileImage, `profile_${address}`, true)
        console.log('Profile image uploaded:', profileImageUrl)
      } catch (error) {
        console.error('Failed to upload profile image:', error)
        // Keep existing image or use default
      }
    }

    // Upload banner image with enhanced fallback
    if (bannerImage) {
      try {
        console.log('Uploading banner image...')
        bannerImageUrl = await uploadImageWithFallback(bannerImage, `banner_${address}`, false)
        console.log('Banner image uploaded:', bannerImageUrl)
      } catch (error) {
        console.error('Failed to upload banner image:', error)
        // Keep existing image
      }
    }

    // Save to database
    let updatedUser
    try {
      if (existingUser) {
        updatedUser = await userQueries.updateUser(address, {
          name: name.trim(),
          description: description.trim(),
          m_img: profileImageUrl,
          b_img: bannerImageUrl
        })
        console.log('User updated in database:', updatedUser)
      } else {
        updatedUser = await userQueries.createUser({
          name: name.trim(),
          description: description.trim(),
          w_address: address,
          m_img: profileImageUrl,
          b_img: bannerImageUrl
        })
        console.log('User created in database:', updatedUser)
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      // Return mock data if database fails
      updatedUser = {
        id: existingUser?.id || Date.now(),
        name: name.trim(),
        description: description.trim(),
        w_address: address,
        m_img: profileImageUrl,
        b_img: bannerImageUrl,
        created_at: existingUser?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    console.log('Returning updated user:', updatedUser)
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}