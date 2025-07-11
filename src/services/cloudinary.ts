import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadToCloudinary(
  file: File, 
  fileName: string, 
  isProfile: boolean = false
): Promise<CloudinaryUploadResult> {
  try {
    console.log(`📤 Uploading to Cloudinary: ${fileName} (${(file.size / 1024).toFixed(1)}KB)`)
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary not configured. Please set CLOUDINARY_* environment variables.')
    }

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataURI = `data:${file.type};base64,${base64}`

    // Set upload options
    const uploadOptions = {
      public_id: fileName,
      folder: isProfile ? 'nft-marketplace/profiles' : 'nft-marketplace/banners',
      resource_type: 'image' as const,
      transformation: isProfile 
        ? [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
        : [{ width: 1200, height: 300, crop: 'fill', quality: 'auto' }],
      overwrite: true,
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions)
    
    console.log('✅ Cloudinary upload successful:', result.secure_url)
    
    return {
      success: true,
      url: result.secure_url
    }
    
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Cloudinary error'
    }
  }
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
  )
}