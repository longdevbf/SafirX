/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
    Clock,
    Gavel,
    Users,
    Eye,
    Lock,
    AlertTriangle,
    Crown,
    Star,
    CheckCircle,
    Loader2,
    X,
    RefreshCw,
    Info,
    Activity,
    Target,
    AlertCircle,
    ArrowLeft,
    Share2,
    Copy
} from "lucide-react"
import Image from "next/image"
import { formatEther, parseEther } from "viem"
import { useWallet } from "@/context/walletContext"
import { useAuctionDatabase } from "@/context/auctionDatabaseContext"
import { toast } from "@/hooks/use-toast"
import { BidHistoryDialog } from "@/components/BidHistoryDialog"
import CountdownTimer from "@/components/CountdownTimer"
import useSealedBidAuction from "@/hooks/use-auction"
import { ProcessedAuction } from "@/types/auction"
import { getPublicClient } from "wagmi/actions"
import { config } from "@/components/config/wagmiConfig"
import { SEALED_BID_AUCTION_CONFIG } from "@/abis/AuctionSealedBid"

export default function AuctionDetailPage() {
    const params = useParams()
    const router = useRouter()
    const auctionId = params.auctionId as string
    
    const [auction, setAuction] = useState<ProcessedAuction | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedAuction, setSelectedAuction] = useState<ProcessedAuction | null>(null)
    const [bidAmount, setBidAmount] = useState("")
    const [showBidHistory, setShowBidHistory] = useState<string | null>(null)
    const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null)
    const [cancelReason, setCancelReason] = useState("")
    const [finalizingAuctions, setFinalizingAuctions] = useState<Set<string>>(new Set())
    const [isWinner, setIsWinner] = useState(false)
    const [isLoadingWinner, setIsLoadingWinner] = useState(false)

    const { address, isConnected } = useWallet()
    const { groupedAuctions, loading: dbLoading, refetch } = useAuctionDatabase()
    
    const {
        placeBid,
        cancelAuction,
        finalizeAuction,
        claimNFT,
        reclaimNFT,
        hash,
        error,
        isPending,
        isConfirming,
        isConfirmed
    } = useSealedBidAuction()

    // ✅ Load auction data
    useEffect(() => {
        if (!dbLoading && groupedAuctions) {
            const allAuctions = [
                ...groupedAuctions.active,
                ...groupedAuctions.ended,
                ...groupedAuctions.finalized
            ]
            
            const foundAuction = allAuctions.find(
                a => a.auction_id.toString() === auctionId
            )
            
            if (foundAuction) {
                // Convert to ProcessedAuction format
                const processedAuction: ProcessedAuction = {
                    auctionId: BigInt(foundAuction.auction_id),
                    seller: foundAuction.seller_address,
                    nftContract: foundAuction.nft_contract,
                    tokenId: foundAuction.token_id ? BigInt(foundAuction.token_id) : BigInt(0),
                    isCancelled: foundAuction.isCancelled ?? false,
                    auctionType: Number(foundAuction.auction_type ?? 0),
                    state: Number(foundAuction.state ?? 0),
                    tokenIds: (foundAuction.token_ids || []).map((id: string | number) => BigInt(id)),
                    tokenIdsList: (foundAuction.token_ids || []).map((id: string | number) => BigInt(id)),
                    startingPrice: parseEther(foundAuction.starting_price),
                    reservePrice: parseEther(foundAuction.reserve_price),
                    minBidIncrement: parseEther(foundAuction.min_bid_increment),
                    startTime: BigInt(Math.floor(new Date(foundAuction.start_time).getTime() / 1000)),
                    endTime: BigInt(Math.floor(new Date(foundAuction.end_time).getTime() / 1000)),
                    bidExtensionTime: BigInt(600),
                    isActive: foundAuction.isActive,
                    isFinalized: foundAuction.isFinalized,
                    totalBids: BigInt(foundAuction.total_bids),
                    uniqueBidders: BigInt(foundAuction.unique_bidders),
                    highestBidder: foundAuction.winner_address || '0x0000000000000000000000000000000000000000',
                    highestBid: foundAuction.final_price ? parseEther(foundAuction.final_price) : BigInt(0),
                    allowPublicReveal: foundAuction.allow_public_reveal,
                    title: foundAuction.title,
                    description: foundAuction.description ?? undefined,
                    timeRemaining: foundAuction.timeRemaining,
                    finalPrice: foundAuction.final_price ?? undefined,
                    nftCount: foundAuction.nft_count,
                    isCollection: foundAuction.isCollection,
                    userCanBid: foundAuction.isActive && !foundAuction.isEnded,
                    userBid: undefined,
                    nftMetadata: foundAuction.nft_metadata || {
                        name: foundAuction.title,
                        description: foundAuction.description,
                        image: foundAuction.collection_image_url || '/placeholder.svg'
                    },
                    individualNftMetadata: Array.isArray(foundAuction.nft_metadata_individuals)
                        ? foundAuction.nft_metadata_individuals
                        : []
                }
                
                setAuction(processedAuction)
            } else {
                toast({
                    title: "❌ Auction Not Found",
                    description: "The auction you're looking for doesn't exist.",
                    variant: "destructive"
                })
                router.push('/auctions')
            }
            setLoading(false)
        }
    }, [auctionId, dbLoading, groupedAuctions, router])

    // ✅ Check if user is winner
    const checkWinnerFromContract = async () => {
        if (!auction?.isFinalized || !address) return
        
        try {
            setIsLoadingWinner(true)
            const publicClient = getPublicClient(config)
            
            const bids = await publicClient.readContract({
                address: SEALED_BID_AUCTION_CONFIG.address,
                abi: SEALED_BID_AUCTION_CONFIG.abi,
                functionName: 'getAuctionBids',
                args: [BigInt(auction.auctionId)]
            })
            
            if (bids && Array.isArray(bids) && bids.length > 0) {
                const sortedBids = bids.sort((a: any, b: any) => 
                    Number(b.amount) - Number(a.amount)
                )
                
                const highestBid = sortedBids[0]
                const isUserWinner = highestBid.bidder.toLowerCase() === address.toLowerCase()
                setIsWinner(isUserWinner)
            }
        } catch (error) {
            console.error('❌ Error checking winner:', error)
        } finally {
            setIsLoadingWinner(false)
        }
    }

    useEffect(() => {
        if (auction?.isFinalized) {
            checkWinnerFromContract()
        }
    }, [auction?.isFinalized, address])

    // ✅ Share auction link
    const shareAuction = async () => {
        const url = `${window.location.origin}/auctions/${auctionId}`
        try {
            await navigator.clipboard.writeText(url)
            toast({
                title: "✅ Link Copied",
                description: "Auction link has been copied to clipboard.",
            })
        } catch (error) {
            console.error('Failed to copy link:', error)
        }
    }

    // ✅ Handle functions (same as auctions page)
    const handlePlaceBid = async() => {
        if (!auction || !bidAmount || !address) return

        try {
            const bidAmountWei = parseEther(bidAmount)
            if (bidAmountWei < auction.startingPrice) {
                toast({title: "❌ Invalid Bid", description: "Bid amount must be at least the starting price.", variant: "destructive"})
                return
            }

            const txHash = await placeBid(
                parseInt(auction.auctionId.toString()), 
                bidAmount,
                formatEther(auction.startingPrice)
            )

            toast({title: "🔒 Sealed Bid Submitted", description: "Your bid has been submitted and will remain hidden until the auction ends."})
        } catch (error) {
            console.error("Error placing bid:", error)
            toast({title: "❌ Bid Failed", description: "Failed to place bid. Please try again.", variant: "destructive"})
        }
    }

    const handleFinalizeAuction = async() => {
        if (!address || !auction) return

        try {
            setFinalizingAuctions(prev => new Set(prev).add(auction.auctionId.toString()))
            const txHash = await finalizeAuction(parseInt(auction.auctionId.toString()))
            
            toast({
                title: "⏳ Finalizing Auction",
                description: "Transaction submitted. Please wait for confirmation...",
            })

            // Wait for confirmation
            let confirmed = false
            const maxAttempts = 30
            let attempts = 0
            
            while (!confirmed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                attempts++
                if (isConfirmed) confirmed = true
            }

            if (confirmed) {
                toast({
                    title: "✅ Auction Finalized",
                    description: "The auction has been successfully finalized.",
                })
                refetch()
            }
        } catch (error) {
            console.error('❌ Error finalizing auction:', error)
            toast({
                title: "❌ Finalization Failed",
                description: error instanceof Error ? error.message : "Failed to finalize auction",
                variant: "destructive"
            })
        } finally {
            setFinalizingAuctions(prev => {
                const newSet = new Set(prev)
                newSet.delete(auction.auctionId.toString())
                return newSet
            })
        }
    }

    const handleClaimNFT = async(auctionId: string, remainingAmount: string) => {
        try {
            const txHash = await claimNFT(parseInt(auctionId), remainingAmount)
            
            toast({
                title: "⏳ Claiming NFT",
                description: "Transaction submitted. Please wait for confirmation...",
            })
            
            let confirmed = false
            const maxAttempts = 30
            let attempts = 0
            
            while (!confirmed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                attempts++
                if (isConfirmed) confirmed = true
            }

            if (confirmed) {
                toast({
                    title: "✅ NFT Claimed",
                    description: "You have successfully claimed your NFT!",
                })
                refetch()
            }
        } catch (error) {
            console.error('❌ Error claiming NFT:', error)
            toast({
                title: "❌ Claim Failed",
                description: error instanceof Error ? error.message : "Failed to claim NFT",
                variant: "destructive"
            })
        }
    }

    const handleReclaimNFT = async() => {
        if (!auction) return
        
        try {
            const txHash = await reclaimNFT(parseInt(auction.auctionId.toString()))
            
            toast({
                title: "⏳ Reclaiming NFT",
                description: "Transaction submitted. Please wait for confirmation...",
            })
            
            let confirmed = false
            const maxAttempts = 30
            let attempts = 0
            
            while (!confirmed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                attempts++
                if (isConfirmed) confirmed = true
            }

            if (confirmed) {
                toast({
                    title: "✅ NFT Reclaimed",
                    description: "You have successfully reclaimed your NFT!",
                })
                refetch()
            }
        } catch (error) {
            console.error('❌ Error reclaiming NFT:', error)
            toast({
                title: "❌ Reclaim Failed",
                description: error instanceof Error ? error.message : "Failed to reclaim NFT",
                variant: "destructive"
            })
        }
    }

    const isUserSeller = (auction: ProcessedAuction) => {
        return address && auction.seller.toLowerCase() === address.toLowerCase()
    }

    const canCancelAuction = (auction: ProcessedAuction) => {
        return isUserSeller(auction) && auction.isActive && auction.totalBids === BigInt(0)
    }

    const formatTimeRemaining = (seconds: number) => {
        if (seconds <= 0) return "Ended"
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        if (days > 0) return `${days}d ${hours}h ${minutes}m`
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    const formatAddress = (address: string) => {
        if (!address) return "Unknown"
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Skeleton className="aspect-square w-full" />
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!auction) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Auction Not Found</h3>
                        <p className="text-muted-foreground mb-4">
                            The auction you're looking for doesn't exist.
                        </p>
                        <Button onClick={() => router.push('/auctions')}>
                            Back to Auctions
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const auctionType = auction.isCollection ? 'Collection' : 'Single NFT'
    const auctionState = auction.isFinalized ? 'Finalized' : auction.isActive ? 'Active' : 'Ended'

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={shareAuction}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                            <Button variant="outline" onClick={shareAuction}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Link
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* NFT Image */}
                    <div className="space-y-4">
                        <div className="aspect-square relative rounded-lg overflow-hidden">
                            <Image
                                src={auction.nftMetadata?.image || "/placeholder.svg"}
                                alt={auction.title}
                                fill
                                className="object-cover"
                            />
                            
                            {/* Status badges */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                <Badge className={`flex items-center gap-1 ${
                                    auctionState === 'Active' ? 'bg-purple-100 text-purple-800' :
                                    auctionState === 'Ended' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {auctionState === 'Active' && <Activity className="w-3 h-3" />}
                                    {auctionState === 'Ended' && <Clock className="w-3 h-3" />}
                                    {auctionState === 'Finalized' && <CheckCircle className="w-3 h-3" />}
                                    {auctionState}
                                </Badge>

                                {auction.isCollection && (
                                    <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> {auction.nftCount} NFTs
                                    </Badge>
                                )}

                                {isWinner && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                        <Crown className="w-3 h-3 mr-1" />
                                        Winner
                                    </Badge>
                                )}

                                {isUserSeller(auction) && (
                                    <Badge className="bg-blue-100 text-blue-800">
                                        <Star className="w-3 h-3 mr-1" />
                                        Your Auction
                                    </Badge>
                                )}
                            </div>

                            {/* Time remaining */}
                            <div className="absolute bottom-4 left-4">
                                <CountdownTimer
                                    endTime={new Date(Number(auction.endTime) * 1000).toISOString()}
                                    variant={auctionState === 'Active' ? "destructive" : "secondary"}
                                />
                            </div>
                        </div>

                        {/* Collection NFTs Grid (if collection) */}
                        {auction.isCollection && auction.individualNftMetadata && auction.individualNftMetadata.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Collection NFTs</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {auction.individualNftMetadata.map((nft, idx) => (
                                        <div key={idx} className="aspect-square relative rounded-lg overflow-hidden">
                                            <Image
                                                src={nft.image || auction.nftMetadata?.image || '/placeholder.svg'}
                                                alt={nft.name || `NFT ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute top-1 right-1">
                                                <Badge variant="secondary" className="text-xs">
                                                    #{idx + 1}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Auction Details */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
                            <p className="text-muted-foreground mb-4">{auction.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Auction #{auction.auctionId.toString()}</span>
                                <span>•</span>
                                <span>{auctionType}</span>
                                <span>•</span>
                                <span>By {formatAddress(auction.seller)}</span>
                            </div>
                        </div>

                        {/* Auction Stats */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Starting Price</div>
                                        <div className="text-2xl font-bold">{formatEther(auction.startingPrice)} ROSE</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Reserve Price</div>
                                        <div className="text-2xl font-bold">{formatEther(auction.reservePrice)} ROSE</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Total Bids</div>
                                        <div className="text-xl font-semibold flex items-center gap-1">
                                            <Target className="w-4 h-4" /> {auction.totalBids.toString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Unique Bidders</div>
                                        <div className="text-xl font-semibold flex items-center gap-1">
                                            <Users className="w-4 h-4" /> {auction.uniqueBidders.toString()}
                                        </div>
                                    </div>
                                </div>

                                {auctionState === 'Finalized' && auction.highestBidder && auction.highestBid > 0 && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-4 h-4 text-green-600" />
                                                <span className="font-medium text-green-900">Winner</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-900">
                                                    {formatEther(auction.highestBid)} ROSE
                                                </div>
                                                <div className="text-sm text-green-700">
                                                    {formatAddress(auction.highestBidder)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="space-y-4">
                            {auctionState === 'Active' && (
                                <div className="space-y-4">
                                    {isUserSeller(auction) ? (
                                        <div className="space-y-2">
                                            {canCancelAuction(auction) && (
                                                <Button
                                                    variant="destructive"
                                                    className="w-full"
                                                    onClick={() => setShowCancelDialog(auction.auctionId.toString())}
                                                    disabled={!isConnected}>
                                                    <X className="w-4 h-4 mr-2" />
                                                    Cancel Auction
                                                </Button>
                                            )}
                                            <div className="text-center text-sm text-muted-foreground">
                                                {canCancelAuction(auction)
                                                    ? "You can cancel this auction"
                                                    : auction.totalBids > BigInt(0)
                                                        ? "Cannot cancel - auction has bids"
                                                        : "Auction is active"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bid-amount">Your Bid Amount (ROSE)</Label>
                                                <Input
                                                    id="bid-amount"
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="Enter your bid"
                                                    value={bidAmount}
                                                    onChange={(e) => setBidAmount(e.target.value)}
                                                    disabled={isPending || isConfirming}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Minimum: {formatEther(auction.startingPrice)} ROSE
                                                </p>
                                            </div>
                                            <Button
                                                onClick={handlePlaceBid}
                                                disabled={!bidAmount || parseFloat(bidAmount) <= 0 || isPending || isConfirming}
                                                className="w-full">
                                                {isPending || isConfirming ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        {isPending ? "Confirm in Wallet..." : "Processing..."}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="w-4 h-4 mr-2" />
                                                        Submit Sealed Bid
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {auctionState === 'Ended' && (
                                <Button
                                    className="w-full"
                                    onClick={handleFinalizeAuction}
                                    disabled={finalizingAuctions.has(auction.auctionId.toString())}>
                                    {finalizingAuctions.has(auction.auctionId.toString())
                                        ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Finalizing ...
                                            </>
                                        )
                                        : (
                                            <>
                                                <Gavel className="w-4 h-4 mr-2" />
                                                Finalize Auction
                                            </>
                                        )}
                                </Button>
                            )}

                            {auctionState === 'Finalized' && (
                                <div className="space-y-4">
                                    <BidHistoryDialog
                                        auction={auction}
                                        isOpen={showBidHistory === auction.auctionId.toString()}
                                        onOpenChange={(open) => {
                                            if (!open) setShowBidHistory(null)
                                        }}
                                        onTrigger={() => setShowBidHistory(auction.auctionId.toString())}
                                        onClaimNFT={handleClaimNFT}
                                        isPending={isPending}
                                        isConfirming={isConfirming}
                                        userAddress={address}
                                    />
                                    
                                    {isWinner && (
                                        <Button
                                            onClick={() => {
                                                const remainingAmount = formatEther(auction.highestBid - auction.startingPrice)
                                                handleClaimNFT(auction.auctionId.toString(), remainingAmount)
                                            }}
                                            disabled={isPending || isConfirming}
                                            className="w-full">
                                            {isPending || isConfirming ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Claiming...
                                                </>
                                            ) : (
                                                <>
                                                    <Crown className="w-4 h-4 mr-2" />
                                                    Claim NFT
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    
                                    {isUserSeller(auction) && !isWinner && (
                                        <Button
                                            variant="outline"
                                            onClick={handleReclaimNFT}
                                            disabled={isPending || isConfirming}
                                            className="w-full">
                                            {isPending || isConfirming ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Reclaiming...
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-4 h-4 mr-2" />
                                                    Reclaim NFT
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
