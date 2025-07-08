"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Lock, 
  Eye, 
  Users, 
  Star, 
  Clock, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Timer,
  Gavel,

  Loader2,
  ExternalLink,
  
  RefreshCw,

 
  Crown,

  Wallet,
  X,
  AlertCircle,
  Shield,
  Zap
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatEther, parseEther } from "viem"
import { useWallet } from "@/context/walletContext"
import { 
  useSealedBidAuction, 
  ProcessedAuction
} from "@/hooks/use-auction"
import { useAuction } from "@/context/auctionContext"
import { toast } from "@/hooks/use-toast"
//import { AuctionState } from "@/abis/AuctionSealedBid"
import { BidHistoryDialog } from "@/components/BidHistoryDialog"

export default function AuctionsPage() {
  const [selectedAuction, setSelectedAuction] = useState<ProcessedAuction | null>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [isUpdatingBid, setIsUpdatingBid] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  const [showBidHistory, setShowBidHistory] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { groupedAuctions, loading, error, refetch, auctions } = useAuction()
  const { address, isConnected } = useWallet()// ✅ Fetch ALL auctions (active + ended + finalized)
  
  const {
    placeBid,
    finalizeAuction,
    revealMyBid,
    enablePublicBidHistory,
    cancelAuction,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: transactionError
  } = useSealedBidAuction()
  console.log(isUpdatingBid);

  // ✅ Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      toast({
        title: "✅ Transaction Successful!",
        description: (
          <div className="space-y-2">
            <p>Your transaction has been confirmed!</p>
            <a 
              href={`https://testnet.explorer.sapphire.oasis.dev/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View on Explorer
            </a>
          </div>
        ),
        duration: 8000,
      })
      
      // Reset form and refresh data
      setSelectedAuction(null)
      setBidAmount("")
      setIsUpdatingBid(false)
      setShowCancelDialog(null)
      setCancelReason("")
      setExpandedCollection(null)
      
      // Refresh auctions after 2 seconds
      setTimeout(() => {
        refetch()
      }, 2000)
    }
  }, [isConfirmed, hash, refetch])

  // ✅ Handle transaction error
  useEffect(() => {
    if (transactionError) {
      toast({
        title: "❌ Transaction Failed",
        description: transactionError.message || "Transaction failed. Please try again.",
        variant: "destructive"
      })
    }
  }, [transactionError])

  // ✅ Handle place/update bid
  const handlePlaceBid = async () => {
    if (!selectedAuction || !bidAmount || !isConnected) return

    try {
      const bidAmountWei = parseEther(bidAmount)
      const startingPriceWei = selectedAuction.startingPrice
      const currentBidWei = selectedAuction.userBid?.amount || BigInt(0)

      // Validation
      if (bidAmountWei < startingPriceWei) {
        toast({
          title: "Invalid Bid",
          description: `Bid must be at least ${formatEther(startingPriceWei)} ROSE`,
          variant: "destructive"
        })
        return
      }

      if (selectedAuction.userBid && bidAmountWei <= currentBidWei) {
        toast({
          title: "Invalid Bid",
          description: `New bid must be higher than your current bid of ${formatEther(currentBidWei)} ROSE`,
          variant: "destructive"
        })
        return
      }

      await placeBid(selectedAuction.auctionId.toString(), bidAmount)
      
      toast({
        title: "🔒 Sealed Bid Submitted",
        description: "Your bid has been submitted and will remain hidden until the auction ends.",
      })

    } catch (error) {
      console.error('Bid placement error:', error)
    }
  }

  // ✅ Handle cancel auction
  const handleCancelAuction = async (auctionId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancelling the auction.",
        variant: "destructive"
      })
      return
    }

    try {
      await cancelAuction(auctionId, reason)
      
      toast({
        title: "🚫 Cancelling Auction",
        description: "Processing auction cancellation and refunding all bidders...",
      })
    } catch (error) {
      console.error('Cancellation error:', error)
    }
  }

  // ✅ Handle finalize auction
  const handleFinalizeAuction = async (auctionId: string) => {
    try {
      await finalizeAuction(auctionId)
      
      toast({
        title: "🎯 Finalizing Auction",
        description: "Processing auction finalization...",
      })
    } catch (error) {
      console.error('Finalization error:', error)
    }
  }

  // ✅ Handle reveal bid
  const handleRevealBid = async (auctionId: string) => {
    try {
      await revealMyBid(auctionId)
      
      toast({
        title: "👁️ Revealing Your Bid",
        description: "Making your bid public...",
      })
    } catch (error) {
      console.error('Reveal error:', error)
    }
  }

  // ✅ Handle enable public bid history
  const handleEnablePublicHistory = async (auctionId: string) => {
    try {
      await enablePublicBidHistory(auctionId)
      
      toast({
        title: "📊 Enabling Public Bid History",
        description: "Making all bid history public...",
      })
    } catch (error) {
      console.error('Enable public history error:', error)
    }
  }

  // ✅ Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Ended"
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  // ✅ Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const isUserSeller = (auction: ProcessedAuction) => {
    return address && auction.seller.toLowerCase() === address.toLowerCase()
  }

  // ✅ Check if auction can be cancelled
  const canCancelAuction = (auction: ProcessedAuction) => {
    // Seller can cancel if auction is active
    // Contract logic: if totalBids > 0, only owner can cancel (not seller)
    return isUserSeller(auction) && auction.isActive && auction.totalBids === BigInt(0)
  }

  // ✅ Render cancel auction dialog
  const renderCancelDialog = (auction: ProcessedAuction) => {
    return (
      <Dialog open={showCancelDialog === auction.auctionId.toString()} onOpenChange={(open) => {
        if (!open) {
          setShowCancelDialog(null)
          setCancelReason("")
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="destructive"
            className="w-full" 
            onClick={() => {
              setShowCancelDialog(auction.auctionId.toString())
              setCancelReason("")
            }}
            disabled={!canCancelAuction(auction) || !isConnected}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Auction
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancel Auction</DialogTitle>
            <DialogDescription>
              This action will cancel the auction and refund all bidders. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* NFT Info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-16 h-16 relative">
                <Image
                  src={auction.nftMetadata?.image || '/placeholder.svg'}
                  alt={auction.title}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{auction.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Starting: {formatEther(auction.startingPrice)} ROSE
                </p>
                <p className="text-sm text-muted-foreground">
                  Bidders: {auction.uniqueBidders.toString()}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Warning</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {auction.totalBids > 0 ? (
                      <>
                        <li>• This auction has {auction.totalBids.toString()} active bid(s)</li>
                        <li>• Only the platform owner can cancel auctions with bids</li>
                        <li>• All bidders will be automatically refunded</li>
                      </>
                    ) : (
                      <>
                        <li>• This will permanently cancel your auction</li>
                        <li>• No bidders will be affected since there are no bids yet</li>
                        <li>• You can create a new auction with the same NFT later</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Can't cancel warning */}
            {auction.totalBids > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You cannot cancel this auction because it has active bids. Only the platform administrator can cancel auctions with bids.
                </AlertDescription>
              </Alert>
            )}

            {/* Reason input - only show if can cancel */}
            {canCancelAuction(auction) && (
              <div>
                <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Please explain why you're cancelling this auction..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isPending || isConfirming}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reason will be recorded on the blockchain and visible to all users.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {canCancelAuction(auction) ? (
                <Button
                  variant="destructive"
                  onClick={() => handleCancelAuction(auction.auctionId.toString(), cancelReason)}
                  disabled={
                    !cancelReason.trim() || 
                    isPending || 
                    isConfirming
                  }
                  className="flex-1"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {isPending ? "Confirm in Wallet..." : "Cancelling..."}
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Auction
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  disabled
                  className="flex-1"
                >
                  Cannot Cancel (Has Bids)
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(null)
                  setCancelReason("")
                }}
                className="flex-1"
              >
                Keep Auction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ✅ Render bid dialog (for regular bidders)
  const renderBidDialog = (auction: ProcessedAuction) => {
    const hasUserBid = Boolean(auction.userBid && auction.userBid.amount > 0)
    const userBidAmount = hasUserBid ? formatEther(auction.userBid!.amount) : "0"
    
    return (
      <Dialog open={selectedAuction?.auctionId.toString() === auction.auctionId.toString()} onOpenChange={(open) => {
        if (!open) {
          setSelectedAuction(null)
          setBidAmount("")
          setIsUpdatingBid(false)
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            className="w-full" 
            onClick={() => {
              setSelectedAuction(auction)
              setBidAmount("")
              setIsUpdatingBid(hasUserBid)
            }}
            disabled={!auction.userCanBid || !isConnected || !!isUserSeller(auction)}
          >
            <Lock className="w-4 h-4 mr-2" />
            {hasUserBid ? "Update Sealed Bid" : "Submit Sealed Bid"}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasUserBid ? "Update" : "Submit"} Sealed Bid
            </DialogTitle>
            <DialogDescription>
              Your bid will be hidden until the auction ends. {hasUserBid && "You can increase your bid anytime."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* NFT Info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-16 h-16 relative">
                <Image
                  src={auction.nftMetadata?.image || '/placeholder.svg'}
                  alt={auction.title}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{auction.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Starting: {formatEther(auction.startingPrice)} ROSE
                </p>
                <p className="text-sm text-muted-foreground">
                  Time left: {formatTimeRemaining(auction.timeRemaining)}
                </p>
              </div>
            </div>

            {/* Current bid info */}
            {hasUserBid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Your Current Bid</span>
                </div>
                <div className="text-lg font-bold text-blue-900">{userBidAmount} ROSE</div>
                <p className="text-xs text-blue-700">This bid is hidden from other participants</p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Your bid amount will remain completely hidden</li>
                    <li>• You can update your bid anytime before auction ends</li>
                    <li>• Only pay if you win (deposits are automatically refunded)</li>
                    <li>• Winner pays their exact bid amount</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bid input */}
            <div>
              <Label htmlFor="bid-amount">
                {hasUserBid ? "New Bid Amount (ROSE)" : "Your Bid Amount (ROSE)"}
              </Label>
              <Input
                id="bid-amount"
                type="number"
                step="0.001"
                placeholder={hasUserBid ? `Higher than ${userBidAmount}` : "Enter your bid"}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                disabled={isPending || isConfirming}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {formatEther(auction.startingPrice)} ROSE
                {hasUserBid && ` | Must be higher than ${userBidAmount} ROSE`}
              </p>
            </div>

            {/* Auction stats */}
            <div className="bg-muted rounded-lg p-3">
              <h4 className="font-medium mb-2">Auction Stats</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Bids:</span>
                  <div className="font-semibold">{auction.totalBids.toString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bidders:</span>
                  <div className="font-semibold">{auction.uniqueBidders.toString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Left:</span>
                  <div className="font-semibold text-orange-600">
                    {formatTimeRemaining(auction.timeRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePlaceBid}
                disabled={
                  !bidAmount || 
                  parseFloat(bidAmount) <= 0 || 
                  isPending || 
                  isConfirming ||
                  (hasUserBid && parseFloat(bidAmount) <= parseFloat(userBidAmount))
                }
                className="flex-1"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isPending ? "Confirm in Wallet..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {hasUserBid ? "Update Bid" : "Submit Bid"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAuction(null)
                  setBidAmount("")
                  setIsUpdatingBid(false)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ✅ Render collection details dialog
  const renderCollectionDetailsDialog = (auction: ProcessedAuction) => {
    if (!auction.isCollection) return null
    
    return (
      <Dialog open={expandedCollection === auction.auctionId.toString()} onOpenChange={(open) => {
        if (!open) setExpandedCollection(null)
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExpandedCollection(auction.auctionId.toString())}
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            View All {auction.nftCount} NFTs
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{auction.title} - Full Collection</DialogTitle>
            <DialogDescription>
              Collection of {auction.nftCount} NFTs from {auction.nftMetadata?.name || 'Unknown Collection'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Collection Info */}
            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Starting Price:</span>
                  <div className="font-semibold">{formatEther(auction.startingPrice)} ROSE</div>
                </div>
                <div>
                  <span className="text-muted-foreground">NFT Count:</span>
                  <div className="font-semibold">{auction.nftCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Bidders:</span>
                  <div className="font-semibold">{auction.uniqueBidders.toString()}</div>
                </div>
              </div>
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {auction.tokenIdsList.map((tokenId) => (
                <div key={tokenId.toString()} className="border rounded-lg overflow-hidden">
                  <div className="aspect-square relative">
                    <Image
                      src={auction.nftMetadata?.image || '/placeholder.svg'}
                      alt={`${auction.title} #${tokenId.toString()}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        #{tokenId.toString()}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium truncate">
                      {auction.nftMetadata?.name || auction.title} #{tokenId.toString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Token ID: {tokenId.toString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Collection Auction Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Collection Auction Rules</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Winner receives ALL {auction.nftCount} NFTs in this collection</li>
                    <li>• Single bid amount for the entire collection</li>
                    <li>• Sealed bidding - all bids remain hidden until finalization</li>
                    <li>• Highest bidder wins the complete collection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ✅ Render auction card
  const renderAuctionCard = (auction: ProcessedAuction, type: 'active' | 'ended' | 'finalized') => {
    const hasUserBid = Boolean(auction.userBid && auction.userBid.amount > 0)
    const isWinner = auction.isFinalized && auction.highestBidder?.toLowerCase() === address?.toLowerCase()
    const isSeller = isUserSeller(auction)
    
    return (
      <Card key={auction.auctionId.toString()} className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-square relative">
          <Image 
            src={auction.nftMetadata?.image || "/placeholder.svg"} 
            alt={auction.title} 
            fill 
            className="object-cover" 
          />
          
          {/* Collection indicator */}
          {auction.isCollection && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {auction.nftCount} NFTs
              </Badge>
            </div>
          )}
          
          {/* Status badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Badge className={`flex items-center gap-1 ${
              type === 'active' ? 'bg-purple-100 text-purple-800' :
              type === 'ended' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {type === 'active' && <><Lock className="w-3 h-3" /> Active</>}
              {type === 'ended' && <><Clock className="w-3 h-3" /> Ended</>}
              {type === 'finalized' && <><CheckCircle className="w-3 h-3" /> Finalized</>}
            </Badge>
            
            {isWinner && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Crown className="w-3 h-3 mr-1" />
                Winner
              </Badge>
            )}
            
            {isSeller && (
              <Badge className="bg-blue-100 text-blue-800">
                <Star className="w-3 h-3 mr-1" />
                Your Auction
              </Badge>
            )}
          </div>
          
          {/* Time remaining */}
          <div className="absolute bottom-3 left-3">
            <Badge variant={type === 'active' ? "destructive" : "secondary"} 
                   className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeRemaining(auction.timeRemaining)}
            </Badge>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="mb-3">
            <h3 className="font-semibold mb-1 truncate">
              {auction.title}
              {auction.isCollection && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({auction.nftCount} items)
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{auction.description}</p>
          </div>

          {/* Auction stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {type === 'finalized' ? 'Final Price' : 'Starting Price'}
                </div>
                <div className="font-bold text-lg">
                  {type === 'finalized' && auction.finalPrice 
                    ? `${auction.finalPrice} ROSE`
                    : `${formatEther(auction.startingPrice)} ROSE`
                  }
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Bidders</div>
                <div className="font-semibold flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {auction.uniqueBidders.toString()}
                </div>
              </div>
            </div>

            {/* User bid status */}
            {hasUserBid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Your Bid</span>
                  </div>
                                    <div className="font-bold text-blue-900">
                    {formatEther(auction.userBid!.amount)} ROSE
                  </div>
                </div>
                {isWinner && (
                  <div className="mt-2 text-sm font-medium text-green-700">
                    🎉 Congratulations! You won this auction!
                  </div>
                )}
              </div>
            )}

            {/* Reserve status */}
            {type === 'finalized' && (
              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  Winner: {formatAddress(auction.highestBidder || '')}
                </div>
                <div className="text-sm text-muted-foreground">
                  Reserve Price: {formatEther(auction.reservePrice)} ROSE
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Collection details button for collection auctions */}
              {auction.isCollection && (
                <>
                  {renderCollectionDetailsDialog(auction)}
                </>
              )}

              {type === 'active' && (
                <>
                  {/* Show Cancel button for seller, Bid button for others */}
                  {isSeller ? (
                    <>
                      {renderCancelDialog(auction)}
                      <div className="text-center text-sm text-muted-foreground">
                        {canCancelAuction(auction) 
                          ? "You can cancel this auction" 
                          : auction.totalBids > 0 
                            ? "Cannot cancel - auction has bids"
                            : "Auction is active"
                        }
                      </div>
                    </>
                  ) : (
                    <>
                      {renderBidDialog(auction)}
                      <div className="text-center text-sm text-muted-foreground">
                        Bidding ends in {formatTimeRemaining(auction.timeRemaining)}
                      </div>
                    </>
                  )}
                </>
              )}

              {type === 'ended' && (
                <Button 
                  className="w-full" 
                  onClick={() => handleFinalizeAuction(auction.auctionId.toString())}
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <Gavel className="w-4 h-4 mr-2" />
                      Finalize Auction
                    </>
                  )}
                </Button>
              )}

              {type === 'finalized' && (
                <div className="space-y-2">
                  <BidHistoryDialog
                    auction={auction}
                    isOpen={showBidHistory === auction.auctionId.toString()}
                    onOpenChange={(open) => {
                      if (!open) setShowBidHistory(null)
                    }}
                    onTrigger={() => setShowBidHistory(auction.auctionId.toString())}
                    onEnablePublicHistory={handleEnablePublicHistory}
                    isPending={isPending}
                    isConfirming={isConfirming}
                    userAddress={address}
                  />
                  
                  {hasUserBid && !isWinner && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRevealBid(auction.auctionId.toString())}
                      disabled={isPending || isConfirming}
                      className="w-full"
                    >
                      {isPending || isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Revealing...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Reveal My Bid
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sealed Bid Auctions</h1>
              <p className="text-muted-foreground">
                Private bidding where all bids remain hidden until finalization
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              How Sealed Bid Auctions Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Sealed Bidding</h4>
                  <p className="text-sm text-blue-700">
                    Submit hidden bids that remain completely private until auction ends.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Auto-Finalization</h4>
                  <p className="text-sm text-blue-700">
                    When auction ends, anyone can trigger automatic NFT transfer and refunds.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Winner Takes All</h4>
                  <p className="text-sm text-blue-700">
                    Highest bidder wins and pays their exact bid. All others get automatic refunds.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Required */}
        {!isConnected && (
          <Alert className="mb-8">
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to participate in sealed bid auctions.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Active ({groupedAuctions.active.length})
            </TabsTrigger>
            <TabsTrigger value="ended" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ended ({groupedAuctions.ended.length})
            </TabsTrigger>
            <TabsTrigger value="finalized" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Finalized ({groupedAuctions.finalized.length})
            </TabsTrigger>
          </TabsList>

          {/* Loading state */}
          {loading && (
            <div className="space-y-6 mt-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="font-semibold">Loading auctions...</div>
                  <div className="text-sm text-muted-foreground">
                    Fetching auction data from the blockchain. This may take a moment.
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}


          {/* Active Bidding Phase */}
          <TabsContent value="active" className="space-y-6">
            {groupedAuctions.active.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAuctions.active.map((auction) => 
                  renderAuctionCard(auction, 'active')
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Timer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
                <p className="text-muted-foreground">
                  There are currently no active sealed bid auctions.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Ended Auctions (Awaiting Finalization) */}
          <TabsContent value="ended" className="space-y-6">
            {groupedAuctions.ended.length > 0 && (
              <Alert className="mb-6">
                <Gavel className="h-4 w-4" />
                <AlertDescription>
                  These auctions have ended and need finalization. Anyone can trigger the finalization process to transfer the NFT and process refunds.
                </AlertDescription>
              </Alert>
            )}
            
            {groupedAuctions.ended.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAuctions.ended.map((auction) => 
                  renderAuctionCard(auction, 'ended')
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Auctions Awaiting Finalization</h3>
                <p className="text-muted-foreground">
                  All ended auctions have been finalized.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Finalized Auctions */}
          <TabsContent value="finalized" className="space-y-6">
            {groupedAuctions.finalized.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAuctions.finalized.map((auction) => 
                  renderAuctionCard(auction, 'finalized')
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Finalized Auctions</h3>
                <p className="text-muted-foreground">
                  Completed auctions will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>



        {/* Create Sealed Auction CTA */}
        <div className="mt-12">
          <Card className="relative overflow-hidden border-0 shadow-2xl">
            {/* Background with gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-900">
              <div className="absolute inset-0 bg-[url('/assets/bottom_b.jpg')] bg-cover bg-center opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-r to-blue-600/20"></div>
              {/* Animated grid overlay */}
              <div className="absolute inset-0 opacity-20">
                <div className="h-full w-full bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            <CardContent className="relative z-10 p-8 text-center">
              <div className="relative">
                {/* Glowing effect behind icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-purple-500/30 rounded-full blur-xl"></div>
                <Lock className="w-12 h-12 mx-auto mb-4 text-purple-300 relative z-10" />
              </div>
              
              <h3 className="text-3xl font-bold mb-3 text-white bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                Create Your Own Sealed Auction
              </h3>
              
              <p className="text-gray-200 mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
                Launch a private auction where bidders compete without seeing each other bids. 
                Experience the thrill of sealed bidding with complete transparency and fairness.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <Link href="/profile" className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Create Sealed Auction
                  </Link>
                </Button>
                
                <Button variant="outline" size="lg" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  <Link href="/marketplace" className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Browse Marketplace
                  </Link>
                </Button>
              </div>
              
              {/* Feature highlights */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>Private Bidding</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Secure & Fair</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Auto-Finalization</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}