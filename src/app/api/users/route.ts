// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { userQueries } from '@/lib/db' // Uncomment this

// Google Drive setup with better error handling
let drive: any = null
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

// Test Google Drive connection and folder access
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

// Upload to Google Drive with better error handling
async function uploadToGoogleDrive(file: File, fileName: string, isProfile: boolean = false): Promise<string> {
  try {
    console.log(`Uploading file to Google Drive: ${fileName}`)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = bufferToStream(buffer)
    
    const response = await drive.files.create({
      requestBody: {
        name: `${fileName}_${Date.now()}.${file.name.split('.').pop()}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
    })

    if (!response.data.id) {
      throw new Error('Failed to get file ID from Google Drive response')
    }

    console.log(`File uploaded successfully with ID: ${response.data.id}`)

    // Make file publicly viewable
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
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

    // Upload profile image
    if (profileImage) {
      if (driveConfigured) {
        try {
          console.log('Uploading profile image...')
          profileImageUrl = await uploadToGoogleDrive(profileImage, `profile_${address}`, true) // Pass true for profile
          console.log('Profile image uploaded:', profileImageUrl)
        } catch (error) {
          console.error('Failed to upload profile image:', error)
          // Keep existing image or use default
        }
      } else {
        console.log('Google Drive not configured, using placeholder for profile image')
        profileImageUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}_${Date.now()}`
      }
    }

    // Upload banner image
    if (bannerImage) {
      if (driveConfigured) {
        try {
          console.log('Uploading banner image...')
          bannerImageUrl = await uploadToGoogleDrive(bannerImage, `banner_${address}`, false) // Pass false for banner
          console.log('Banner image uploaded:', bannerImageUrl)
        } catch (error) {
          console.error('Failed to upload banner image:', error)
          // Keep existing image
        }
      } else {
        console.log('Google Drive not configured, using placeholder for banner image')
        bannerImageUrl = `https://via.placeholder.com/1200x300/6366f1/ffffff?text=Banner`
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