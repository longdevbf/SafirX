import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mp3']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Check for Pinata credentials
    const PINATA_JWT = process.env.JWT
    const PINATA_GATEWAY = process.env.GATEWAY

    if (!PINATA_JWT) {
      return NextResponse.json({ error: 'Pinata configuration not found' }, { status: 500 })
    }

    // Upload to Pinata
    const pinataData = new FormData()
    pinataData.append('file', file)
    
    const pinataMetadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        fileType: file.type,
        size: file.size.toString()
      }
    })
    pinataData.append('pinataMetadata', pinataMetadata)

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    })
    pinataData.append('pinataOptions', pinataOptions)

    console.log('📤 Uploading to Pinata...')
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: pinataData,
    })

    if (!pinataResponse.ok) {
      const errorData = await pinataResponse.json()
      console.error('Pinata upload failed:', errorData)
      return NextResponse.json({ error: 'Failed to upload to IPFS' }, { status: 500 })
    }

    const pinataResult = await pinataResponse.json()
    console.log('✅ Pinata upload successful:', pinataResult)

    // Construct IPFS URL
    const ipfsHash = pinataResult.IpfsHash
    let ipfsUrl: string
    
    if (PINATA_GATEWAY) {
      // Ensure PINATA_GATEWAY has https:// prefix
      const gateway = PINATA_GATEWAY.startsWith('http') 
        ? PINATA_GATEWAY 
        : `https://${PINATA_GATEWAY}`
      ipfsUrl = `${gateway}/ipfs/${ipfsHash}`
    } else {
      ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    }

    console.log('🔗 IPFS URL:', ipfsUrl)

    return NextResponse.json({
      success: true,
      ipfsUrl: ipfsUrl,
      ipfsHash: ipfsHash,
      filename: file.name,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('IPFS upload error:', error)
    return NextResponse.json(
      { error: 'IPFS upload failed' },
      { status: 500 }
    )
  }
} 