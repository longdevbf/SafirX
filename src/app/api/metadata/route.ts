import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Đọc metadata từ JSON body
    const metadata = await request.json()

    if (!metadata) {
      return NextResponse.json({ error: 'No metadata provided' }, { status: 400 })
    }

    if (!process.env.JWT || !process.env.GATEWAY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Upload metadata lên Pinata
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    })

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text()
      return NextResponse.json({ error: `Pinata upload failed: ${pinataResponse.status}`, details: errorText }, { status: 500 })
    }

    const data = await pinataResponse.json()
    const ipfsUrl = `https://${process.env.GATEWAY}/ipfs/${data.IpfsHash}`

    return NextResponse.json({ ipfsUrl, ipfsHash: data.IpfsHash })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload metadata', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}