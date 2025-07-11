/**
 * Image compression utilities for reducing file size before base64 conversion
 */

export interface CompressionResult {
  success: boolean
  compressedFile?: File
  originalSize: number
  compressedSize: number
  error?: string
}

export async function compressImage(
  file: File,
  maxSizeKB: number = 30,
  quality: number = 0.7
): Promise<CompressionResult> {
  try {
    console.log(`🔄 Compressing image: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Cannot create canvas context')
    }

    // Create image element
    const img = new Image()
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Calculate new dimensions (maintain aspect ratio)
        const maxDimension = 400 // Max width or height
        let { width, height } = img
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                success: false,
                originalSize: file.size,
                compressedSize: 0,
                error: 'Failed to compress image'
              })
              return
            }

            // Check if compressed size is acceptable
            if (blob.size <= maxSizeKB * 1024) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              
              console.log(`✅ Compression successful: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`)
              
              resolve({
                success: true,
                compressedFile,
                originalSize: file.size,
                compressedSize: blob.size
              })
            } else {
              resolve({
                success: false,
                originalSize: file.size,
                compressedSize: blob.size,
                error: `Compressed size still too large: ${(blob.size / 1024).toFixed(1)}KB`
              })
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        resolve({
          success: false,
          originalSize: file.size,
          compressedSize: 0,
          error: 'Failed to load image for compression'
        })
      }

      // Load the image
      img.src = URL.createObjectURL(file)
    })
  } catch (error) {
    console.error('❌ Image compression error:', error)
    return {
      success: false,
      originalSize: file.size,
      compressedSize: 0,
      error: error instanceof Error ? error.message : 'Unknown compression error'
    }
  }
}

export async function convertToBase64WithCompression(
  file: File,
  maxSizeKB: number = 30
): Promise<string | null> {
  try {
    // Try compression first
    const compressionResult = await compressImage(file, maxSizeKB, 0.7)
    
    if (compressionResult.success && compressionResult.compressedFile) {
      // Convert compressed file to base64
      const buffer = Buffer.from(await compressionResult.compressedFile.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'
      const dataUrl = `data:${mimeType};base64,${base64}`
      
      console.log(`✅ Base64 conversion successful: ${dataUrl.length} characters`)
      return dataUrl
    } else {
      console.log(`❌ Compression failed: ${compressionResult.error}`)
      return null
    }
  } catch (error) {
    console.error('❌ Base64 conversion with compression failed:', error)
    return null
  }
}