import { useState, useEffect, useCallback } from 'react'

export interface ClaimStatus {
  nft_claimed: boolean
  nft_reclaimed: boolean
  claim_tx_hash: string | null
  reclaim_tx_hash: string | null
  claimed_at: string | null
  reclaimed_at: string | null
  winner_address: string | null
}

export function useClaimStatus(auctionId: string | number) {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch claim status from database
  const fetchClaimStatus = useCallback(async () => {
    if (!auctionId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/auctions/claim?auctionId=${auctionId}`)
      const data = await response.json()

      if (data.success) {
        setClaimStatus(data.data)
      } else {
        const errorMsg = data.error || 'Failed to fetch claim status'
        console.error('❌ API Error:', errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error fetching claim status:', err)
      setError('Failed to fetch claim status')
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  // Update claim status in database
  const updateClaimStatus = useCallback(async (
    type: 'claim' | 'reclaim',
    txHash: string,
    winnerAddress?: string
  ) => {
    if (!auctionId) return false

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auctions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auctionId,
          type,
          txHash,
          winnerAddress,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setClaimStatus(prev => {
          if (!prev) return prev
          
          if (type === 'claim') {
            return {
              ...prev,
              nft_claimed: true,
              claim_tx_hash: txHash,
              claimed_at: new Date().toISOString(),
            }
          } else {
            return {
              ...prev,
              nft_reclaimed: true,
              reclaim_tx_hash: txHash,
              reclaimed_at: new Date().toISOString(),
            }
          }
        })
        return true
      } else {
        const errorMsg = data.error || 'Failed to update claim status'
        console.error('❌ Update Claim Status Error:', errorMsg, 'Response:', data)
        setError(errorMsg)
        return false
      }
    } catch (err) {
      console.error('Error updating claim status:', err)
      setError('Failed to update claim status')
      return false
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  // Fetch claim status on mount and when auctionId changes
  useEffect(() => {
    fetchClaimStatus()
  }, [fetchClaimStatus])

  return {
    claimStatus,
    loading,
    error,
    fetchClaimStatus,
    updateClaimStatus,
    // Helper getters
    isNftClaimed: claimStatus?.nft_claimed || false,
    isNftReclaimed: claimStatus?.nft_reclaimed || false,
    claimTxHash: claimStatus?.claim_tx_hash,
    reclaimTxHash: claimStatus?.reclaim_tx_hash,
  }
}