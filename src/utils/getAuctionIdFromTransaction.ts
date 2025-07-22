/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ Sửa - dùng getPublicClient từ wagmi
import { getPublicClient } from 'wagmi/actions'
import { keccak256, toHex } from 'viem'
import { config } from '@/components/config/wagmiConfig'

export async function getAuctionIdFromTransaction(txHash: string): Promise<string | null> {
  console.log(' Getting auction ID from transaction:', txHash)
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const publicClient = getPublicClient(config)
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
      
      if (!receipt || !receipt.logs) {
        console.log(`❌ No receipt or logs found (attempt ${attempt})`)
        if (attempt < 10) {
          // ✅ Tăng delay theo số lần thử
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }
        return null
      }

      const auctionCreatedTopic = keccak256(toHex('AuctionCreated(uint256,address,address,uint8,uint256,uint256[],uint256,uint256,string)'))
      
      for (const log of receipt.logs) {
        if (log.topics[0] === auctionCreatedTopic && log.topics[1]) {
          const auctionId = parseInt(log.topics[1], 16)
          console.log('✅ Found auction ID:', auctionId)
          return auctionId.toString()
        }
      }

      console.log('❌ No AuctionCreated event found')
      return null

    } catch (error: any) {
      console.log(`❌ Error getting auction ID (attempt ${attempt}):`, error.message)
      
      if (error.message.includes('TransactionReceiptNotFound')) {
        // ✅ Transaction chưa confirm - chờ lâu hơn
        if (attempt < 10) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000))
          continue
        }
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        // ✅ Rate limit - chờ lâu hơn
        if (attempt < 10) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 3000))
          continue
        }
      } else {
        console.error('❌ Unexpected error:', error)
        return null
      }
    }
  }
  
  console.log('❌ Failed to get auction ID after 10 attempts')
  return null
}