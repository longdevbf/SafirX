import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test upload endpoint called')
    
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    
    console.log('📋 Form data entries:')
    for (const [key, value] of data.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File - name: ${value.name}, type: ${value.type}, size: ${value.size}`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }

    if (!file) {
      console.log('❌ No file found')
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    console.log('✅ File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Check environment variables
    const PINATA_JWT = process.env.JWT || process.env.NEXT_PUBLIC_JWT
    const PINATA_GATEWAY = process.env.GATEWAY

    console.log('🔑 Environment check:', {
      hasJWT: !!PINATA_JWT,
      jwtLength: PINATA_JWT?.length || 0,
      hasGateway: !!PINATA_GATEWAY,
      gateway: PINATA_GATEWAY
    })

    return NextResponse.json({
      success: true,
      message: 'Test successful',
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      envCheck: {
        hasJWT: !!PINATA_JWT,
        hasGateway: !!PINATA_GATEWAY
      }
    })

  } catch (error) {
    console.error('❌ Test upload error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}