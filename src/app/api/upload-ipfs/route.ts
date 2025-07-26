import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    console.log('📁 File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Validate file type - more permissive for images
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mp3', 'audio/wav', 'audio/ogg'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Check for Pinata credentials
    const PINATA_JWT = process.env.JWT || process.env.NEXT_PUBLIC_JWT
    const PINATA_GATEWAY = process.env.GATEWAY

    console.log('🔍 Checking Pinata config:', {
      hasJWT: !!PINATA_JWT,
      hasGateway: !!PINATA_GATEWAY,
      jwtLength: PINATA_JWT?.length || 0
    })

    if (!PINATA_JWT) {
      console.error('❌ Pinata JWT not found in environment variables')
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

    console.log('📊 Pinata response status:', pinataResponse.status)

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text()
      console.error('❌ Pinata upload failed:', {
        status: pinataResponse.status,
        statusText: pinataResponse.statusText,
        error: errorText
      })
      return NextResponse.json({ 
        error: `Failed to upload to IPFS: ${pinataResponse.status} ${pinataResponse.statusText}`,
        details: errorText
      }, { status: 500 })
    }

    const pinataResult = await pinataResponse.json()
    //console.log('✅ Pinata upload successful:', pinataResult)

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