/* eslint-disable @typescript-eslint/no-unused-vars */
// ✅ Sửa import - xóa useAuctionDetail
import { ProcessedAuction } from "@/types/auction"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { formatEther } from "viem"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useCallback, useState } from "react"
import { usePublicClient } from "wagmi"
import { SEALED_BID_AUCTION_CONFIG } from "@/abis/AuctionSealedBid"

import { History, Crown, Eye, Loader2, Lock, AlertCircle, CheckCircle, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useClaimStatus } from "@/hooks/use-claim-status"
import { useWallet } from "@/context/walletContext"
import useSealedBidAuction from "@/hooks/use-auction"
import { DebugClaimStatus } from "./DebugClaimStatus"

interface PublicBid {
  bidder: string
  amount: bigint
  timestamp: bigint
  bidNumber: bigint
}

// ✅ Sửa BidHistoryDialog để thêm nút Claim NFT
interface BidHistoryDialogProps {
  auction: ProcessedAuction
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTrigger: () => void
  onEnablePublicHistory?: (auctionId: string) => void
  onClaimNFT?: (auctionId: string, remainingAmount: string) => void // ✅ Thêm prop
  isPending?: boolean
  isConfirming?: boolean
  userAddress?: string
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function BidHistoryDialog({ 
  auction, 
  isOpen, 
  onOpenChange, 
  onTrigger,
  onEnablePublicHistory,
  onClaimNFT, // ✅ Thêm prop
  isPending = false,
  isConfirming = false,
  userAddress
}: BidHistoryDialogProps) {
  const publicClient = usePublicClient()
  
  // ✅ Sửa - xóa useAuctionDetail và tạo state đơn giản
  const [publicBids, setPublicBids] = useState<PublicBid[]>([])
  const [loadingBids, setLoadingBids] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)

  // ✅ Tạo function để fetch bid history
  const refetchBids = useCallback(async () => {
    if (!publicClient || !auction.isFinalized) return
    
    try {
      setLoadingBids(true)
      setBidError(null)
      
      // ✅ Gọi contract để lấy bid history
      const bids = await publicClient.readContract({
        address: SEALED_BID_AUCTION_CONFIG.address,
        abi: SEALED_BID_AUCTION_CONFIG.abi,
        functionName: 'getAuctionBids',
        args: [BigInt(auction.auctionId)]
      })
      
      console.log('📊 Bid history from contract:', bids)
      setPublicBids(bids as PublicBid[])
      
    } catch (error) {
      console.error('❌ Failed to fetch bid history:', error)
      setBidError(error instanceof Error ? error.message : 'Failed to fetch bid history')
    } finally {
      setLoadingBids(false)
    }
  }, [publicClient, auction.auctionId, auction.isFinalized])

  useEffect(() => {
    if (isOpen && auction.isFinalized) {
      refetchBids()
    }
  }, [isOpen, auction.isFinalized, refetchBids])

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
  
  // ✅ Thêm state để track enable public history
  const [isEnablingPublicHistory, setIsEnablingPublicHistory] = useState(false)

  // ✅ Handle enable public history
  const handleEnablePublicHistory = async (auctionId: string) => {
    if (!onEnablePublicHistory) return
    
    try {
      setIsEnablingPublicHistory(true)
      await onEnablePublicHistory(auctionId)
      
      // ✅ Refetch bids after enabling
      await refetchBids()
      
      toast({ 
        title: "✅ Public History Enabled", 
        description: "All bids are now visible to everyone." 
      })
    } catch (error) {
      console.error('Error enabling public history:', error)
      toast({ 
        title: "❌ Failed", 
        description: "Failed to enable public history.", 
        variant: "destructive" 
      })
    } finally {
      setIsEnablingPublicHistory(false)
    }
  }
  
  // ✅ Thêm function để check winner từ bid history
  const checkIfUserIsWinner = useCallback(() => {
    if (!publicBids || publicBids.length === 0 || !userAddress) return false
    
    // Sắp xếp theo amount cao nhất
    const sortedBids = [...publicBids].sort((a, b) => 
      Number(b.amount) - Number(a.amount)
    )
    
    const highestBid = sortedBids[0]
    return highestBid.bidder.toLowerCase() === userAddress.toLowerCase()
  }, [publicBids, userAddress])

  const isUserWinner = checkIfUserIsWinner()

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
          {auction.userBid && Number(auction.userBid.amount) > 0 && (
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
                    {formatEther(BigInt(auction.userBid.amount))} ROSE
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {Number(auction.userBid.visibility) === 1 ? "Revealed" : "Sealed"}
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

          {/* ✅ Claim NFT section with database status */}
          <ClaimNFTSection 
            auction={auction}
            isUserWinner={isUserWinner}
            publicBids={publicBids}
          />

          {/* 🐛 Debug component - remove in production */}
          <DebugClaimStatus auction={auction} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ✅ Separate component for Claim NFT functionality
interface ClaimNFTSectionProps {
  auction: ProcessedAuction;
  isUserWinner: boolean;
  publicBids: PublicBid[] | null;
}

function ClaimNFTSection({ auction, isUserWinner, publicBids }: ClaimNFTSectionProps) {
  const { address } = useWallet();
  const { claimNFT } = useSealedBidAuction();
  const { 
    updateClaimStatus,
    isNftClaimed,
    claimTxHash,
    loading: claimLoading
  } = useClaimStatus(auction.auctionId.toString());

  const [isProcessing, setIsProcessing] = useState(false);

  const handleClaimNFT = async () => {
    if (!address) {
      toast({
        title: "❌ Wallet Not Connected",
        description: "Please connect your wallet to claim NFT.",
        variant: "destructive"
      });
      return;
    }

    if (!auction.isFinalized) {
      toast({
        title: "❌ Auction Not Finalized",
        description: "This auction must be finalized before you can claim the NFT.",
        variant: "destructive"
      });
      return;
    }

    if (isNftClaimed) {
      toast({
        title: "✅ NFT Already Claimed",
        description: `You have successfully claimed this NFT! Transaction: ${claimTxHash}`,
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Calculate remaining amount from highest bid
      const highestBid = publicBids?.sort((a, b) => 
        Number(b.amount) - Number(a.amount)
      )[0];
      
      if (!highestBid) {
        throw new Error("No bid found");
      }

      const remainingAmount = formatEther(highestBid.amount - auction.startingPrice);
      const txHash = await claimNFT(parseInt(auction.auctionId.toString()), remainingAmount);
      
      toast({
        title: "⏳ Claiming NFT",
        description: "Transaction submitted. Please wait for confirmation...",
      });

      // Update database with claim status
      const success = await updateClaimStatus('claim', txHash, address);
      
      if (success) {
        toast({
          title: "✅ NFT Claimed Successfully!",
          description: (
            <div className="flex flex-col gap-2">
              <span>Your NFT has been claimed successfully!</span>
              <a 
                href={`https://explorer.oasis.io/mainnet/sapphire/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
              >
                View Transaction <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ),
        });
      }
      
    } catch (error) {
      console.error('❌ Error claiming NFT:', error);
      toast({
        title: "❌ Claim Failed",
        description: error instanceof Error ? error.message : "Failed to claim NFT",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!auction.isFinalized || !isUserWinner) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-900">🎉 You Won This Auction!</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-green-700">
          {isNftClaimed 
            ? "You have successfully claimed your NFT!" 
            : "Congratulations! You are the highest bidder. You can now claim your NFT."
          }
        </p>
        
        {isNftClaimed && claimTxHash && (
          <div className="text-sm">
            <a 
              href={`https://explorer.oasis.io/mainnet/sapphire/tx/${claimTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
            >
              View Claim Transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        
        <Button
          onClick={handleClaimNFT}
          disabled={isProcessing || claimLoading || isNftClaimed}
          className={`w-full ${isNftClaimed ? 'bg-green-100 border-green-500 text-green-700' : ''}`}
          variant={isNftClaimed ? "outline" : "default"}
        >
          {isProcessing || claimLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {isNftClaimed ? 'Claimed' : 'Claiming...'}
            </>
          ) : isNftClaimed ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              NFT Claimed
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Claim NFT
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default BidHistoryDialog;