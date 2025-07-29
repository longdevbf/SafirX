#!/usr/bin/env node

// Test script for claim API
async function testClaimAPI() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Claim API...')
  
  // Test 1: Get claim status for auction 28
  console.log('\n1️⃣ Testing GET claim status...')
  try {
    const response = await fetch(`${baseUrl}/api/auctions/claim?auctionId=28`)
    const data = await response.json()
    console.log('✅ GET Response:', data)
  } catch (error) {
    console.error('❌ GET Error:', error)
  }
  
  // Test 2: Try to claim again (should fail with "already claimed")
  console.log('\n2️⃣ Testing duplicate claim...')
  try {
    const response = await fetch(`${baseUrl}/api/auctions/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auctionId: '28',
        type: 'claim',
        txHash: '0x456',
        winnerAddress: '0xFd9B607441F0ABf95BA4b2acf93559F96Cbd743D'
      })
    })
    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', data)
  } catch (error) {
    console.error('❌ POST Error:', error)
  }
  
  // Test 3: Test with non-finalized auction
  console.log('\n3️⃣ Testing non-finalized auction...')
  try {
    const response = await fetch(`${baseUrl}/api/auctions/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auctionId: '44', // This was not finalized
        type: 'claim',
        txHash: '0x789',
        winnerAddress: '0x123'
      })
    })
    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', data)
  } catch (error) {
    console.error('❌ POST Error:', error)
  }
  
  // Test 4: Test reclaim for auction without winner
  console.log('\n4️⃣ Testing reclaim for auction 45 (no winner)...')
  try {
    const response = await fetch(`${baseUrl}/api/auctions/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auctionId: '45',
        type: 'reclaim',
        txHash: '0xreclaim123'
      })
    })
    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', data)
  } catch (error) {
    console.error('❌ POST Error:', error)
  }
  
  console.log('\n✅ Test completed!')
}

testClaimAPI()