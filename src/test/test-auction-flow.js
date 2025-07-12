// Test script for complete auction flow
const testAuctionFlow = async () => {
  console.log('🧪 Testing complete auction flow...')
  
  // Test data
  const testAuctionId = "1"
  const testBidderAddress = "0x1234567890123456789012345678901234567890"
  const testBidAmount = "1.5"
  
  try {
    // Step 1: Test bid count update
    console.log('\n📝 Step 1: Testing bid count update...')
    const bidResponse = await fetch('http://localhost:3000/api/auctions/bids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auctionId: testAuctionId,
        bidderAddress: testBidderAddress,
        bidAmount: testBidAmount
      })
    })
    
    const bidResult = await bidResponse.json()
    console.log('✅ Bid update result:', bidResult)
    
    if (bidResult.success) {
      console.log('🎉 Bid count update successful!')
      console.log('Updated data:', bidResult.data)
    } else {
      console.log('❌ Bid count update failed:', bidResult.error)
    }
    
    // Step 2: Test getting auction data
    console.log('\n📝 Step 2: Testing auction data retrieval...')
    const auctionResponse = await fetch(`http://localhost:3000/api/auctions?auctionId=${testAuctionId}`)
    const auctionResult = await auctionResponse.json()
    console.log('✅ Auction data result:', auctionResult)
    
    // Step 3: Test bid history
    console.log('\n📝 Step 3: Testing bid history...')
    const historyResponse = await fetch(`http://localhost:3000/api/auctions/bids?auctionId=${testAuctionId}`)
    const historyResult = await historyResponse.json()
    console.log('✅ Bid history result:', historyResult)
    
    console.log('\n✅ Complete auction flow test finished!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testAuctionFlow()
}

export { testAuctionFlow } 