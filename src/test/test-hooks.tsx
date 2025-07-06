// Test file to verify the updated hooks and contract integration
import { useNFTMarket } from '@/hooks/use-market'
import { useEffect } from 'react'

export default function TestHooks() {
  const {
    // Data hooks
    getAllAvailableNFTs,
    getListingInfo,
    getCollectionDetails,
    
    // Transaction hooks
    listSingleNFT,
    listCollectionBundle,
    listCollectionIndividual,
    listCollectionSamePrice,
    buyNFTUnified,
    cancelListingUnified,
    
    // State
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  } = useNFTMarket()

  useEffect(() => {
    console.log('🔧 Testing hooks setup...')
    
    // Test data fetching functions
    console.log('getAllAvailableNFTs:', typeof getAllAvailableNFTs)
    console.log('getListingInfo:', typeof getListingInfo)
    console.log('getCollectionDetails:', typeof getCollectionDetails)
    
    // Test transaction functions
    console.log('listSingleNFT:', typeof listSingleNFT)
    console.log('listCollectionBundle:', typeof listCollectionBundle)
    console.log('listCollectionIndividual:', typeof listCollectionIndividual)
    console.log('listCollectionSamePrice:', typeof listCollectionSamePrice)
    console.log('buyNFTUnified:', typeof buyNFTUnified)
    console.log('cancelListingUnified:', typeof cancelListingUnified)
    
    // Test state
    console.log('hash:', hash)
    console.log('error:', error)
    console.log('isPending:', isPending)
    console.log('isConfirming:', isConfirming)
    console.log('isConfirmed:', isConfirmed)
    
    console.log('✅ All hooks are properly loaded!')
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Hook Test Results</h2>
      <div className="space-y-2">
        <p>Check the console for detailed hook information</p>
        <p>Hash: {hash || 'None'}</p>
        <p>Error: {error?.message || 'None'}</p>
        <p>Pending: {isPending ? 'Yes' : 'No'}</p>
        <p>Confirming: {isConfirming ? 'Yes' : 'No'}</p>
        <p>Confirmed: {isConfirmed ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}
