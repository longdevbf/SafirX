// Test script for bid count update
const testBidUpdate = async () => {
  const testData = {
    auctionId: "1", // Test auction ID
    bidderAddress: "0x1234567890123456789012345678901234567890",
    bidAmount: "1.5"
  }

  try {
    console.log('🧪 Testing bid count update...')
    console.log('Test data:', testData)
    
    const response = await fetch('http://localhost:3000/api/auctions/bids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    console.log('✅ Response:', result)
    
    if (result.success) {
      console.log('🎉 Bid count update successful!')
      console.log('Updated data:', result.data)
    } else {
      console.log('❌ Bid count update failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testBidUpdate()
}

export { testBidUpdate } 