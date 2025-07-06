import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('File upload API called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('No file provided in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Check environment variables
    if (!process.env.JWT) {
      console.error('PINATA_JWT not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!process.env.GATEWAY) {
      console.error('GATEWAY not configured')  
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Upload to Pinata
    const pinataFormData = new FormData()
    pinataFormData.append('file', file)

    console.log('Uploading to Pinata...')
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JWT}`,
      },
      body: pinataFormData,
    })

    console.log('Pinata response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Pinata upload failed: ${response.status}`,
        details: errorText
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('Pinata response data:', data)
    
    const ipfsUrl = `https://${process.env.GATEWAY}/ipfs/${data.IpfsHash}`
    console.log('Generated IPFS URL:', ipfsUrl)

    return NextResponse.json({ 
      ipfsUrl, 
      ipfsHash: data.IpfsHash 
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}