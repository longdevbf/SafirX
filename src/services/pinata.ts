import { MintNFTParams } from "@/lib/contracts/nft-types"

export class UploadService {
  private static async uploadToPinata(file: File): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Upload API response:', response.status, errorData)
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('File upload successful:', data)
      return data.ipfsUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  private static async uploadMetadata(metadata: any): Promise<string> {
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