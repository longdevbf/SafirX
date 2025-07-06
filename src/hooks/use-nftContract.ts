import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { NFT_CONTRACT_CONFIG, NFT_ABI } from '@/abis/NFTABI'

export function useNFTContract() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read contract data
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_CONFIG.address,
    abi: NFT_ABI,
    functionName: 'getTotalNFT',
  })

  const { data: remainingSupply } = useReadContract({
    address: NFT_CONTRACT_CONFIG.address,
    abi: NFT_ABI,
    functionName: 'getRemainingSupply',
  })

  // Mint single NFT cho chính mình
  const mintNFT = async (metadataURI: string): Promise<void> => {
    try {
      console.log('🚀 Calling mintNFT with:', {
        address: NFT_CONTRACT_CONFIG.address,
        metadataURI
      })
      
      await writeContract({
        address: NFT_CONTRACT_CONFIG.address,
        abi: NFT_ABI,
        functionName: 'mintNFT',
        args: [metadataURI],
      })
    } catch (error) {
      console.error('❌ Error minting NFT:', error)
      throw error
    }
  }

  // Mint NFT to specific address
  const mintSingleNFT = async (toAddress: string, metadataURI: string): Promise<void> => {
    try {
      console.log('🚀 Calling mintSingleNFT with:', {
        address: NFT_CONTRACT_CONFIG.address,
        toAddress,
        metadataURI
      })
      
      await writeContract({
        address: NFT_CONTRACT_CONFIG.address,
        abi: NFT_ABI,
        functionName: 'mintSingleNFT',
        args: [toAddress as `0x${string}`, metadataURI],
      })
    } catch (error) {
      console.error('❌ Error minting single NFT:', error)
      throw error
    }
  }

  // Mint collection
  const mintCollection = async (metadataURIs: string[]): Promise<void> => {
    try {
      console.log('🚀 Calling mintMyCollection with:', {
        address: NFT_CONTRACT_CONFIG.address,
        metadataURIs
      })
      
      await writeContract({
        address: NFT_CONTRACT_CONFIG.address,
        abi: NFT_ABI,
        functionName: 'mintMyCollection',
        args: [metadataURIs],
      })
    } catch (error) {
      console.error('❌ Error minting collection:', error)
      throw error
    }
  }

  return {
    // Write functions
    mintNFT,
    mintSingleNFT,
    mintCollection,
    
    // Transaction state
    hash,
    error: error as Error | null,
    isPending,
    isConfirming,
    isConfirmed,
    
    // Contract data
    totalSupply: totalSupply ? Number(totalSupply) : 0,
    remainingSupply: remainingSupply ? Number(remainingSupply) : 0,
  }
}