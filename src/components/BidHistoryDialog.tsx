import { ProcessedAuction, useAuctionDetail } from "@/hooks/use-auction"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
//import { History, Crown, ExternalLink, Copy, Eye, Loader2, Lock, AlertCircle } from "lucide-react"
import { formatEther } from "viem"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useCallback } from "react"
import { usePublicClient } from "wagmi"
import { SEALED_BID_AUCTION_CONFIG } from "@/abis/AuctionSealedBid"
//import { Button } from "@/components/ui/button"

import { History, Crown, Eye, Loader2, Lock, AlertCircle } from "lucide-react"
//import { formatEther } from "viem"
//import { Alert, AlertDescription } from "@/components/ui/alert"
//import { useEffect, useCallback } from "react"
interface PublicBid {
  bidder: string
  amount: bigint
  timestamp: bigint
  bidNumber: bigint
}

interface BidHistoryDialogProps {
  auction: ProcessedAuction
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTrigger: () => void
  onEnablePublicHistory?: (auctionId: string) => void
  isPending?: boolean
  isConfirming?: boolean
  userAddress?: string
}

// Helper function to format address
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function BidHistoryDialog({ 
  auction, 
  isOpen, 
  onOpenChange, 
  onTrigger,
  onEnablePublicHistory,
  isPending = false,
  isConfirming = false,
  userAddress
}: BidHistoryDialogProps) {
  const publicClient = usePublicClient()
  
  // ✅ Hook is called at the top level of this component
  const { 
    auction: auctionDetail, 
    publicBids, 
    loading: loadingBids, 
    error: bidError,
    refetchBids 
  } = useAuctionDetail(auction.auctionId.toString())
  console.log(auctionDetail);
  // ✅ Refresh bid history when dialog opens for finalized auctions
  useEffect(() => {
    if (isOpen && (auction.isFinalized || (!auction.isActive && auction.state !== 2))) {
      console.log(`🔄 Dialog opened for auction ${auction.auctionId}, refreshing bid history...`)
      console.log(`📊 Current auction state:`, {
        auctionId: auction.auctionId.toString(),
        state: auction.state,
        isFinalized: auction.isFinalized,
        isActive: auction.isActive,
        allowPublicReveal: auction.allowPublicReveal,
        totalBids: auction.totalBids?.toString(),
        uniqueBidders: auction.uniqueBidders?.toString(),
        seller: auction.seller
      })
      refetchBids()
    }
  }, [isOpen, auction.isFinalized, auction.isActive, auction.state, auction.auctionId, refetchBids])
  
  // ✅ Log public bids whenever they change
  useEffect(() => {
    console.log(`📈 Public bids updated for auction ${auction.auctionId}:`, {
      bidsCount: publicBids?.length || 0,
      bids: publicBids,
      loadingBids,
      bidError
    })
  }, [publicBids, loadingBids, bidError, auction.auctionId])
  
  // ✅ Helper function to debug auction state
  const debugAuctionState = useCallback(async () => {
    if (!publicClient) {
      console.log('❌ No public client found')
      return
    }
    
    try {
      console.log('🧪 Starting manual auction state debug...')
      
      // Get auction data directly from contract
      const auctionData = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuction',
        args: [BigInt(auction.auctionId)]
      })
      console.log('📋 Direct auction data from contract:', auctionData)
      
      // Try to call the contract directly for public bid history
      const debugBids = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getPublicBidHistory',
        args: [BigInt(auction.auctionId)]
      })
      
      console.log('📊 Direct contract call result for public bids:', debugBids)
      
    } catch (error) {
      console.error('❌ Debug failed:', error)
    }
  }, [publicClient, auction.auctionId])
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onTrigger}
          className="w-full"
        >
          <History className="w-4 h-4 mr-2" />
          Bid History
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Bid History - {auction.title}
          </DialogTitle>
          <DialogDescription>
            {auction.isFinalized ? (
              "Final bid results for completed auction"
            ) : auction.state === 1 ? (
              "Auction has ended - finalizing bid results"
            ) : (
              "This auction's bids are sealed until finalization"
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Loading state */}
          {loadingBids && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p className="text-muted-foreground">Loading bid history...</p>
            </div>
          )}

          {/* Error state */}
          {bidError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load bid history: {bidError}
                <Button 
                  onClick={() => refetchBids()} 
                  size="sm" 
                  variant="outline" 
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Auction Statistics */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium mb-2">Auction Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Bids:</span>
                <div className="font-semibold">{auction.totalBids?.toString() || '0'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Unique Bidders:</span>
                <div className="font-semibold">{auction.uniqueBidders?.toString() || '0'}</div>
              </div>
              {/* Only show reserve price when auction is finalized */}
              {auction.isFinalized && (
                <div>
                  <span className="text-muted-foreground">Reserve Price:</span>
                  <div className="font-semibold">{formatEther(auction.reservePrice)} ROSE</div>
                </div>
              )}
              {auction.highestBid && auction.highestBid > 0 && (
                <div className="md:col-span-3">
                  <span className="text-muted-foreground">Winning Bid:</span>
                  <div className="font-semibold text-green-600">
                    {formatEther(auction.highestBid)} ROSE
                  </div>
                </div>
              )}
            </div>
            
            {/* Debug info */}
            <div className="mt-4 pt-3 border-t">
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  🔧 Debug Info (Click to expand)
                </summary>
                <div className="mt-2 space-y-1 font-mono text-xs bg-muted-foreground/10 p-2 rounded">
                  <div>Auction ID: {auction.auctionId.toString()}</div>
                  <div>State: {auction.state} ({auction.state === 0 ? 'ACTIVE' : auction.state === 1 ? 'FINALIZED' : 'CANCELLED'})</div>
                  <div>Is Finalized: {auction.isFinalized.toString()}</div>
                  <div>Is Active: {auction.isActive.toString()}</div>
                  <div>Allow Public Reveal: {auction.allowPublicReveal.toString()}</div>
                  <div>Seller: {auction.seller}</div>
                  <div>Current User: {userAddress || 'Not connected'}</div>
                  <div>Is User Seller: {(auction.seller.toLowerCase() === userAddress?.toLowerCase()).toString()}</div>
                  <div>Loading Bids: {loadingBids.toString()}</div>
                  <div>Public Bids Count: {publicBids?.length || 0}</div>
                  <div>Bid Error: {bidError || 'None'}</div>
                </div>
              </details>
            </div>
          </div>

          {/* Public Bid History */}
          {!loadingBids && (
            <>
              {publicBids && publicBids.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Public Bid History ({publicBids.length} bids)
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {publicBids
                      .sort((a: PublicBid, b: PublicBid) => Number(b.amount) - Number(a.amount))
                      .map((bid: PublicBid, index: number) => (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-2">
                            {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {formatAddress(bid.bidder)}
                                {bid.bidder.toLowerCase() === userAddress?.toLowerCase() && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(Number(bid.timestamp) * 1000).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${index === 0 ? 'text-yellow-600' : ''}`}>
                              {formatEther(bid.amount)} ROSE
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Bid #{bid.bidNumber?.toString() || (index + 1)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  {auction.isFinalized ? (
                    <div className="space-y-2">
                      <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <h4 className="font-medium">Bid History Not Public</h4>
                      <p className="text-muted-foreground text-sm">
                        The seller has not made the bid history public for this auction.
                      </p>
                      {auction.totalBids && auction.totalBids > 0 && (
                        <p className="text-sm text-muted-foreground">
                          This auction had {auction.totalBids.toString()} bid(s) from {auction.uniqueBidders?.toString() || '0'} bidder(s).
                        </p>
                      )}
                      {/* Add refresh button for finalized auctions */}
                      <div className="mt-4 space-y-2">
                        <Button 
                          onClick={() => refetchBids()} 
                          size="sm" 
                          variant="outline"
                          className="gap-2 w-full"
                        >
                          <History className="w-4 h-4" />
                          Check for Public Bids
                        </Button>
                        
                        {/* Debug button for testing */}
                        <Button 
                          onClick={debugAuctionState} 
                          size="sm" 
                          variant="ghost"
                          className="gap-2 w-full text-xs"
                        >
                          🔧 Debug Contract Call
                        </Button>
                      </div>
                    </div>
                  ) : auction.state === 1 ? (
                    <div className="space-y-2">
                      <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <h4 className="font-medium">Auction Ended - Finalizing</h4>
                      <p className="text-muted-foreground text-sm">
                        This auction has ended and is being finalized. 
                        Bid history may become available once finalization is complete.
                      </p>
                      <div className="mt-4 space-y-2">
                        <Button 
                          onClick={() => refetchBids()} 
                          size="sm" 
                          variant="outline"
                          className="gap-2 w-full"
                        >
                          <History className="w-4 h-4" />
                          Check for Public Bids
                        </Button>
                        <Button 
                          onClick={debugAuctionState} 
                          size="sm" 
                          variant="ghost"
                          className="gap-2 w-full text-xs"
                        >
                          🔧 Debug Contract Call
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <h4 className="font-medium">Sealed Bidding in Progress</h4>
                      <p className="text-muted-foreground text-sm">
                        Bid history will be available after the auction is finalized.
                        All bids remain hidden until then.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Actions for seller to enable public history */}
          {auction.isFinalized && 
           auction.seller.toLowerCase() === userAddress?.toLowerCase() && 
           auction.allowPublicReveal && 
           onEnablePublicHistory &&
           (!publicBids || publicBids.length === 0) && 
           auction.totalBids && auction.totalBids > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Eye className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Make Bid History Public</p>
                  <p className="text-sm">
                    As the seller, you can make all bid history public for transparency.
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => onEnablePublicHistory(auction.auctionId.toString())}
                      disabled={isPending || isConfirming}
                      size="sm"
                    >
                      {isPending || isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Enabling...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Make All Bids Public
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={() => refetchBids()} 
                      size="sm" 
                      variant="outline"
                      className="gap-2"
                    >
                      <History className="w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Show enable button even if no condition above (for debugging) */}
          {auction.isFinalized && 
           auction.seller.toLowerCase() === userAddress?.toLowerCase() && 
           auction.allowPublicReveal && 
           onEnablePublicHistory &&
           auction.totalBids && auction.totalBids > 0 && 
           (!publicBids || publicBids.length === 0) && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-yellow-900">Debug: Seller Actions Available</p>
                  <p className="text-sm text-yellow-700">
                    You are the seller and can enable public bid history. 
                    Current bids found: {publicBids?.length || 0} / {auction.totalBids.toString()}
                  </p>
                  <Button 
                    onClick={() => {
                      console.log('🔧 Force enabling public bid history...')
                      onEnablePublicHistory(auction.auctionId.toString())
                    }}
                    disabled={isPending || isConfirming}
                    size="sm"
                    variant="outline"
                  >
                    🔧 Force Enable Public History
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* User's Bid Information */}
          {auction.userBid && auction.userBid.amount > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Your Bid</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {auction.isFinalized ? "Final amount" : "Sealed until finalization"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-900 dark:text-blue-100">
                    {formatEther(auction.userBid.amount)} ROSE
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {auction.userBid.visibility === 1 ? "Revealed" : "Sealed"}
                  </div>
                </div>
              </div>
              {auction.isFinalized && auction.highestBidder?.toLowerCase() === userAddress?.toLowerCase() && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    🎉 Congratulations! You won this auction!
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
