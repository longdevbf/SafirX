import { MintNFTParams } from "@/lib/contracts/nft-types"
interface NFTMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes: Array<{
    trait_type: string
    value: string
  }>
  unlockable_content?: string
  explicit_content?: boolean
}
/**
 * Pinata IPFS Upload Service
 * Using existing NEXT_PUBLIC_JWT and gateway from .env
 */

export interface PinataUploadResult {
  success: boolean
  url?: string
  ipfsHash?: string
  error?: string
}

export async function uploadToPinata(
  file: File, 
  fileName: string,
  isProfile: boolean = false
): Promise<PinataUploadResult> {
  try {
    console.log(`📤 Uploading to Pinata IPFS: ${fileName} (${(file.size / 1024).toFixed(1)}KB)`)
    
    // Check if Pinata NEXT_PUBLIC_JWT is configured
    if (!process.env.NEXT_PUBLIC_JWT) {
      throw new Error('Pinata NEXT_PUBLIC_JWT not configured')
    }

    // Create form data for Pinata API
    const formData = new FormData()
    formData.append('file', file)
    
    // Add metadata
    const metadata = {
      name: fileName,
      keyvalues: {
        type: isProfile ? 'profile' : 'banner',
        uploadedAt: new Date().toISOString(),
        size: file.size.toString()
      }
    }
    formData.append('pinataMetadata', JSON.stringify(metadata))
    
    // Add pinning options
    const pinataOptions = {
      cidVersion: 1,
      customPinPolicy: {
        regions: [
          { id: 'FRA1', desiredReplicationCount: 1 },
          { id: 'NYC1', desiredReplicationCount: 1 }
        ]
      }
    }
    formData.append('pinataOptions', JSON.stringify(pinataOptions))

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JWT}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Pinata upload failed: ${response.status} ${errorData}`)
    }

    const result = await response.json()
    
    // Use custom gateway if available, otherwise use default
    // Fix typo in gateway URL if present
    let gateway = process.env.GATEWAY || 'gateway.pinata.cloud'
    if (gateway.endsWith('.clouda')) {
      gateway = gateway.replace('.clouda', '.cloud')
    }
    const imageUrl = `https://${gateway}/ipfs/${result.IpfsHash}`
    
    console.log('✅ Pinata upload successful:', imageUrl)
    
    return {
      success: true,
      url: imageUrl,
      ipfsHash: result.IpfsHash
    }
    
  } catch (error) {
    console.error('❌ Pinata upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Pinata error'
    }
  }
}

export function isPinataConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_JWT
}

export async function testPinataConnection(): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_JWT) return false
    
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JWT}`
      }
    })
    
    return response.ok
  } catch (error) {
    console.error('Pinata connection test failed:', error)
    return false
  }
}

export class UploadService {
  // Use the new uploadToPinata function directly
  private static async uploadToPinata(file: File): Promise<string> {
    const result = await uploadToPinata(file, file.name, false)
    if (result.success && result.url) {
      return result.url
    }
    throw new Error(result.error || 'Upload failed')
  }

  // Public method để upload file lên IPFS
  static async uploadFileToIPFS(file: File): Promise<string> {
    return this.uploadToPinata(file)
  }

  private static async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    try {
      // FIX: Sử dụng /api/metadata thay vì /api/upload/metadata
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Metadata upload API response:', response.status, errorData)
        throw new Error(`Metadata upload failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Metadata upload successful:', data)
      return data.ipfsUrl
    } catch (error) {
      console.error('Metadata upload error:', error)
      throw error
    }
  }

  static async prepareNFTForMinting(
    file: File,
    params: MintNFTParams
  ): Promise<string> {
    try {
      console.log('Starting NFT preparation...')
      
      // 1. Upload file to IPFS
      console.log('Uploading file to IPFS...')
      const imageUrl = await this.uploadToPinata(file)
      console.log('File uploaded successfully:', imageUrl)

      // 2. Prepare metadata
      const metadata = {
        name: params.name,
        description: params.description,
        image: imageUrl,
        external_url: params.externalLink || '',
        attributes: params.properties?.map(prop => ({
          trait_type: prop.trait_type,
          value: prop.value
        })) || [],
        ...(params.unlockableContent && {
          unlockable_content: params.unlockableContent
        }),
        ...(params.isSensitive && {
          explicit_content: true
        })
      }

      console.log('Prepared metadata:', metadata)

      // 3. Upload metadata to IPFS
      console.log('Uploading metadata to IPFS...')
      const metadataUrl = await this.uploadMetadata(metadata)
      console.log('Metadata uploaded successfully:', metadataUrl)

      return metadataUrl
    } catch (error) {
      console.error('Error preparing NFT for minting:', error)
      throw error
    }
  }
}