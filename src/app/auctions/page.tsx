/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    AlertCircle
} from "lucide-react";
import Image from "next/image";
import { formatEther, parseEther } from "viem";
import { useWallet } from "@/context/walletContext";
import { useAuctionDatabase, DatabaseAuction } from "@/context/auctionDatabaseContext";
import { toast } from "@/hooks/use-toast";
import { BidHistoryDialog } from "@/components/BidHistoryDialog";
import CountdownTimer from "@/components/CountdownTimer";
import { useSealedBidAuction, ProcessedAuction } from "@/hooks/use-auction";
import { AuctionType, AuctionState } from "@/abis/AuctionSealedBid";
import { updateAuctionState as updateAuctionStateDb } from "@/utils/syncAuctionToDatabase";
import React from "react";

const convertDatabaseToProcessedAuction = (dbAuction: DatabaseAuction): ProcessedAuction => {
    return {
        auctionId: BigInt(dbAuction.auction_id),
        seller: dbAuction.seller_address,
        nftContract: dbAuction.nft_contract,
        tokenId: dbAuction.token_id ? BigInt(dbAuction.token_id) : BigInt(0),
        isCancelled: dbAuction.isCancelled ?? false,
        auctionType: Number(dbAuction.auction_type ?? 0) as AuctionType,
        state: Number(dbAuction.state ?? 0) as AuctionState,
        tokenIds: (dbAuction.token_ids || []).map(id => BigInt(id)),
        tokenIdsList: (dbAuction.token_ids || []).map(id => BigInt(id)),
        startingPrice: parseEther(dbAuction.starting_price),
        reservePrice: parseEther(dbAuction.reserve_price),
        minBidIncrement: parseEther(dbAuction.min_bid_increment),
        startTime: BigInt(Math.floor(new Date(dbAuction.start_time).getTime() / 1000)),
        endTime: BigInt(Math.floor(new Date(dbAuction.end_time).getTime() / 1000)),
        bidExtensionTime: BigInt(600),
        isActive: dbAuction.isActive,
        isFinalized: dbAuction.isFinalized,
        totalBids: BigInt(dbAuction.total_bids),
        uniqueBidders: BigInt(dbAuction.unique_bidders),
        highestBidder: dbAuction.winner_address || '0x0000000000000000000000000000000000000000',
        highestBid: dbAuction.final_price ? parseEther(dbAuction.final_price) : BigInt(0),
        allowPublicReveal: dbAuction.allow_public_reveal,
        title: dbAuction.title,
        description: dbAuction.description ?? undefined,
        timeRemaining: dbAuction.timeRemaining,
        finalPrice: dbAuction.final_price ?? undefined,
        nftCount: dbAuction.nft_count,
        isCollection: dbAuction.isCollection,
        userCanBid: dbAuction.isActive && !dbAuction.isEnded,
        userBid: undefined,
        nftMetadata: dbAuction.nft_metadata || {
            name: dbAuction.title,
            description: dbAuction.description,
            image: dbAuction.collection_image_url || '/placeholder.svg'
        },
        individualNftMetadata: Array.isArray(dbAuction.nft_metadata_individuals)
            ? dbAuction.nft_metadata_individuals
            : []
    };
};

export default function AuctionsPage() {
    const [activeTab,
        setActiveTab] = useState < "active" | "ended" | "finalized" > ("active")
    const [selectedAuction,
        setSelectedAuction] = useState < ProcessedAuction | null > (null)
    const [bidAmount,
        setBidAmount] = useState("")
    const [isUpdatingBid,
        setIsUpdatingBid] = useState(false)
    const [showBidHistory,
        setShowBidHistory] = useState < string | null > (null)
    const [showCancelDialog,
        setShowCancelDialog] = useState < string | null > (null)
    const [cancelReason,
        setCancelReason] = useState("")
    const [expandedCollection,
        setExpandedCollection] = useState < string | null > (null)
    const processedCancelTx = React.useRef < Set < string >> (new Set())
    const pendingCancelRef = React.useRef < {
        auctionId: string;
        txHash: string
    } | null > (null)
    const processedConfirmTx = React.useRef < Set < string >> (new Set())
    // ✅ Add pending bid tracking
    const pendingBidRef = React.useRef < {
        auctionId: string;
        bidAmount: string;
        bidderAddress: string;
        txHash: string
    } | null > (null)

    // ✅ Add state để track finalizing auctions
    const [finalizingAuctions, setFinalizingAuctions] = useState<Set<string>>(new Set())

    // ✅ Use database context instead of blockchain context for fast loading
    const {groupedAuctions, loading, refetch} = useAuctionDatabase()
    const {address, isConnected} = useWallet()

    const {
        placeBid,
        cancelAuction,
        finalizeAuction,
        revealMyBid,
        enablePublicBidHistory,
        hash,
        error,
        isPending,
        isConfirming,
        isConfirmed
    } = useSealedBidAuction()

    // ✅ Convert database auctions to processed format
    const processedGroupedAuctions = {
        active: groupedAuctions
            .active
            .map(convertDatabaseToProcessedAuction),
        ended: groupedAuctions
            .ended
            .map(convertDatabaseToProcessedAuction),
        finalized: groupedAuctions
            .finalized
            .map(convertDatabaseToProcessedAuction)
    }

    // ✅ Handle successful transactions
    useEffect(() => {
        if (isConfirmed && hash && !processedConfirmTx.current.has(hash)) {
            processedConfirmTx
                .current
                .add(hash)

            toast({title: "✅ Transaction Successful", description: "Your transaction has been confirmed on the blockchain."})

            // Refresh auction data once
            refetch()

            // Reset states
            setSelectedAuction(null)
            setBidAmount("")
            setShowCancelDialog(null)
            setCancelReason("")
        }
    }, [isConfirmed, hash, refetch])

    // ✅ Handle errors
    useEffect(() => {
        if (error) {
            toast({
                title: "❌ Transaction Failed",
                description: error.message || "An error occurred during the transaction.",
                variant: "destructive"
            })
        }
    }, [error])

    // Effect: on transaction confirmation, handle pending cancel sync
    useEffect(() => {
        if (isConfirmed && hash && pendingCancelRef.current && pendingCancelRef.current.txHash === hash) {
            const {auctionId, txHash} = pendingCancelRef.current
            // Avoid duplicate DB calls
            if (!processedCancelTx.current.has(txHash)) {
                processedCancelTx
                    .current
                    .add(txHash)
                updateAuctionStateDb(auctionId, 'CANCELLED', txHash).then(() => {
                    pendingCancelRef.current = null
                })
            }
        }
    }, [isConfirmed, hash])

    // ✅ Effect: on transaction confirmation, handle pending bid sync
    useEffect(() => {
        // ✅ DEBUG: Log useEffect conditions
        // ('🔍 useEffect triggered:', {
        //     isConfirmed,
        //     hasPendingBid: !!pendingBidRef.current,
        //     pendingBidData: pendingBidRef.current
        // })

        // ✅ FIXED: Chỉ cần isConfirmed và pendingBidRef, không cần hash
        if (!isConfirmed || !pendingBidRef.current) {
         //   ('❌ useEffect early return:', { isConfirmed, hasPendingBid: !!pendingBidRef.current })
            return;
        }

        const {auctionId, bidAmount, bidderAddress, txHash} = pendingBidRef.current

        // ✅ FIXED: Use auctionId instead of txHash for duplicate check
        if (processedConfirmTx.current.has(auctionId)) {
         //   ('❌ Auction already processed:', auctionId)
            return;
        }

      //  ('✅ Processing confirmed bid transaction:', {auctionId, bidAmount, bidderAddress, txHash})

        // Mark as processed immediately to prevent re-execution
        processedConfirmTx.current.add(auctionId)

        // Update bid counts in database
       // ('📤 Calling API to update bid counts:', {auctionId, bidderAddress, bidAmount})

        fetch('/api/auctions/bids', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({auctionId, bidderAddress, bidAmount})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
             //   ('✅ Bid counts updated:', data.data)
                // Refresh auction data to show updated counts
                refetch()

                // ✅ Reset dialog state after successful bid
                setSelectedAuction(null)
                setBidAmount("")
                setIsUpdatingBid(false)

                toast({title: "✅ Bid Counts Updated", description: `Total bids: ${data.data.totalBids}, Unique bidders: ${data.data.uniqueBidders}`})
            } else {
                console.error('❌ Failed to update bid counts:', data.error)
                toast({title: "⚠️ Warning", description: "Bid submitted but counts may not be updated immediately.", variant: "destructive"})
            }
        })
        .catch(error => {
            console.error('❌ Error updating bid counts:', error)
        })
        .finally(() => {
            pendingBidRef.current = null
        })
    }, [isConfirmed]) // ✅ Bỏ refetch khỏi dependencies

    // ✅ DEBUG: Monitor pendingBidRef changes
    useEffect(() => {
      //  ('🔍 pendingBidRef changed:', pendingBidRef.current)
    }, [pendingBidRef.current])

    // ✅ DEBUG: Monitor isConfirmed changes  
    useEffect(() => {
     //   ('🔍 isConfirmed changed:', isConfirmed)
    }, [isConfirmed])

    // ✅ Reset processed transactions on component mount
    useEffect(() => {
        processedConfirmTx.current.clear()
    //   ('🔄 Reset processedConfirmTx')
    }, [])

    // ✅ Handle bid placement
    const handlePlaceBid = async() => {
        if (!selectedAuction || !bidAmount || !address) 
            return

        try {
            const bidAmountWei = parseEther(bidAmount)

            // Validate bid amount
            if (bidAmountWei < selectedAuction.startingPrice) {
                toast({title: "❌ Invalid Bid", description: "Bid amount must be at least the starting price.", variant: "destructive"})
                return
            }

            // ('🔍 Placing bid for auction:', {
            //     auctionId: selectedAuction
            //         .auctionId
            //         .toString(),
            //     bidAmount,
            //     address
            // })

            // ✅ FIXED: Use auctionId instead of auction_id
            const txHash = await placeBid(selectedAuction.auctionId.toString(), bidAmount)

          //  ('✅ Bid transaction hash:', txHash)

            // ✅ Track pending bid for database update
            pendingBidRef.current = {
                auctionId: selectedAuction
                    .auctionId
                    .toString(),
                bidAmount,
                bidderAddress: address,
                txHash
            }

            // ✅ FIXED: Reset processedConfirmTx for new bid
            processedConfirmTx.current.clear()
            //        console.log('🔄 Reset processedConfirmTx for new bid')



           

            toast({title: "🔒 Sealed Bid Submitted", description: "Your bid has been submitted and will remain hidden until the auction ends."})

        } catch (error) {
            console.error("Error placing bid:", error)
            toast({title: "❌ Bid Failed", description: "Failed to place bid. Please try again.", variant: "destructive"})
        }
    }

    // ✅ Handle auction cancellation
    const handleCancelAuction = async(auctionId : string, reason : string) => {
        if (!reason.trim()) {
            toast({title: "❌ Cancellation Failed", description: "Please provide a reason for cancellation.", variant: "destructive"})
            return
        }

        try {
            const txHash = await cancelAuction(auctionId, reason)
            pendingCancelRef.current = {
                auctionId,
                txHash
            }
        } catch (error) {
            console.error("Error canceling auction:", error)
        }
    }

    // ✅ Fix handleFinalizeAuction để update database
    const handleFinalizeAuction = async(auctionId: string) => {
        if (!address) {
            toast({
                title: "❌ Wallet Not Connected",
                description: "Please connect your wallet to finalize auctions.",
                variant: "destructive"
            })
            return
        }

        try {
            // Add to finalizing set
            setFinalizingAuctions(prev => new Set(prev).add(auctionId))

            // Call smart contract
            const txHash = await finalizeAuction(auctionId)
            
            toast({
                title: "⏳ Finalizing Auction",
                description: "Transaction submitted. Please wait for confirmation...",
            })

            // ✅ FIX: Wait for transaction confirmation properly with timeout
            let confirmed = false
            const maxAttempts = 30 // 60 seconds max wait
            let attempts = 0
            
            while (!confirmed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
                attempts++
                
                // Check if transaction is confirmed
                if (isConfirmed) {
                    confirmed = true
                }
            }

            if (confirmed) {
                // ✅ FIX: Update database with finalization details
                try {
                    const auction = processedGroupedAuctions.ended.find(
                        a => a.auctionId.toString() === auctionId
                    )
                    
                    if (auction) {
                        console.log('🔄 Updating database for auction:', auctionId)
                        
                        const response = await fetch('/api/auctions/finalize', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                auctionId: parseInt(auctionId),
                                txHash,
                                winnerAddress: auction.highestBidder,
                                finalPrice: auction.finalPrice?.toString()
                            })
                        })
                        
                        if (!response.ok) {
                            const errorData = await response.text()
                            console.error('❌ Database update failed:', errorData)
                            throw new Error(`Database update failed: ${response.status}`)
                        }
                        
                        const result = await response.json()
                        console.log('✅ Database updated successfully:', result)
                    } else {
                        console.warn('⚠️ Auction not found in ended list:', auctionId)
                    }
                } catch (dbError) {
                    console.error('❌ Failed to update database:', dbError)
                    toast({
                        title: "⚠️ Database Update Failed",
                        description: "Auction finalized on blockchain but database update failed. Please refresh the page.",
                        variant: "destructive"
                    })
                }

                toast({
                    title: "✅ Auction Finalized",
                    description: "The auction has been successfully finalized on the blockchain.",
                })

                // Refresh auction data
                refetch()
            } else {
                toast({
                    title: "⚠️ Transaction Pending",
                    description: "Transaction submitted but confirmation is taking longer than expected. Please check your wallet.",
                })
            }

        } catch (error) {
            console.error('❌ Error finalizing auction:', error)
            toast({
                title: "❌ Finalization Failed",
                description: error instanceof Error ? error.message : "Failed to finalize auction",
                variant: "destructive"
            })
        } finally {
            // Remove from finalizing set
            setFinalizingAuctions(prev => {
                const newSet = new Set(prev)
                newSet.delete(auctionId)
                return newSet
            })
        }
    }

    // ✅ Handle bid reveal
    const handleRevealBid = async(auctionId : string) => {
        try {
            await revealMyBid(auctionId)
        } catch (error) {
            console.error("Error revealing bid:", error)
        }
    }

    // ✅ Handle public bid history
    const handleEnablePublicHistory = async(auctionId : string) => {
        try {
            const txHash = await enablePublicBidHistory(auctionId)
        //    ('✅ Enable public history transaction:', txHash)
            
            toast({ 
                title: "🔓 Enabling Public History", 
                description: "Transaction submitted. Bids will be visible once confirmed." 
            })
        } catch (error) {
            console.error('Error enabling public history:', error)
            toast({ 
                title: "❌ Failed", 
                description: "Failed to enable public history.", 
                variant: "destructive" 
            })
        }
    }

    // ✅ Format time remaining
    const formatTimeRemaining = (seconds : number) => {
        if (seconds <= 0) 
            return "Ended"

        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (days > 0) 
            return `${days}d ${hours}h ${minutes}m`
        if (hours > 0) 
            return `${hours}h ${minutes}m ${secs}s`
        if (minutes > 0) 
            return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    // ✅ Format address
    const formatAddress = (address : string) => {
        if (!address) 
            return "Unknown"
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    // ✅ Check if user is seller
    const isUserSeller = (auction : ProcessedAuction) => {
        return address && auction
            .seller
            .toLowerCase() === address.toLowerCase()
    }

    // ✅ Check if auction can be cancelled
    const canCancelAuction = (auction : ProcessedAuction) => {
        return isUserSeller(auction) && auction.isActive && auction.totalBids === BigInt(0)
    }

    // ✅ Render cancel auction dialog
    const renderCancelDialog = (auction : ProcessedAuction) => {
        return (
            <Dialog
                open={showCancelDialog === auction
                .auctionId
                .toString()}
                onOpenChange={(open) => {
                if (!open) {
                    setShowCancelDialog(null);
                    setCancelReason("");
                }
            }}>
                <DialogTrigger asChild>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                        setShowCancelDialog(auction.auctionId.toString());
                        setCancelReason("");
                    }}
                        disabled={!canCancelAuction(auction) || !isConnected}>
                        <X className="w-4 h-4 mr-2"/>
                        Cancel Auction
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Cancel Auction #{auction
                                .auctionId
                                .toString()}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this auction? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Auction info */}
                        <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 relative">
                                    <Image
                                        src={auction.nftMetadata
                                        ?.image || '/placeholder.svg'}
                                        alt={auction.title}
                                        fill
                                        className="object-cover rounded"/>
                                </div>
                                <div>
                                    <div className="font-medium">{auction.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {auction.isCollection
                                            ? `${auction.nftCount} NFTs`
                                            : 'Single NFT'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <Alert>
                            <AlertTriangle className="h-4 w-4"/>
                            <AlertDescription>
                                {canCancelAuction(auction)
                                    ? ("This auction has no bids and can be safely cancelled.")
                                    : ("This auction cannot be cancelled because it has active bids.")}
                            </AlertDescription>
                        </Alert>

                        {/* Reason input */}
                        <div className="space-y-2">
                            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
                            <Textarea
                                id="cancel-reason"
                                placeholder="Please provide a reason for cancelling this auction..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                disabled={isPending || isConfirming}
                                rows={3}/>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                setShowCancelDialog(null);
                                setCancelReason("");
                            }}
                                className="flex-1"
                                disabled={isPending || isConfirming}>
                                Keep Auction
                            </Button>

                            {canCancelAuction(auction)
                                ? (
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleCancelAuction(auction.auctionId.toString(), cancelReason)}
                                        disabled={!cancelReason.trim() || isPending || isConfirming}
                                        className="flex-1">
                                        {isPending || isConfirming
                                            ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                                    Cancelling ...
                                                </>
                                            )
                                            : (
                                                <>
                                                    <X className="w-4 h-4 mr-2"/>
                                                    Cancel Auction
                                                </>
                                            )}
                                    </Button>
                                )
                                : (
                                    <Button variant="destructive" disabled={true} className="flex-1">
                                        Cannot Cancel
                                    </Button>
                                )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // ✅ Render bid dialog (for regular bidders)
    const renderBidDialog = (auction : ProcessedAuction) => {
        const hasUserBid = Boolean(auction.userBid && auction.userBid.amount > 0)
        const userBidAmount = hasUserBid
            ? formatEther(auction.userBid !.amount)
            : "0"

        return (
            <Dialog
                open={selectedAuction?.auctionId.toString() === auction.auctionId.toString()}
                onOpenChange={(open) => {
                if (!open) {
                    setSelectedAuction(null);
                    setBidAmount("");
                    setIsUpdatingBid(false);
                }
            }}>
                <DialogTrigger asChild>
                    <Button
                        className="w-full"
                        onClick={() => {
                        setSelectedAuction(auction);
                        setBidAmount("");
                        setIsUpdatingBid(hasUserBid);
                    }}
                        disabled={!auction.userCanBid || !isConnected || !!isUserSeller(auction)}>
                        <Lock className="w-4 h-4 mr-2"/> {hasUserBid
                            ? "Update Sealed Bid"
                            : "Submit Sealed Bid"}
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {hasUserBid
                                ? "Update"
                                : "Submit"}
                            Sealed Bid
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
                                    src={auction.nftMetadata
                                    ?.image || '/placeholder.svg'}
                                    alt={auction.title}
                                    fill
                                    className="object-cover rounded"/>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">{auction.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Starting: {formatEther(auction.startingPrice)}
                                    ROSE
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
                                    <Lock className="w-4 h-4 text-blue-600"/>
                                    <span className="font-medium text-blue-900">Your Current Bid</span>
                                </div>
                                <div className="text-lg font-bold text-blue-900">{userBidAmount}
                                    ROSE</div>
                                <p className="text-xs text-blue-700">This bid is hidden from other participants</p>
                            </div>
                        )}

                        {/* Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"/>
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
                                {hasUserBid
                                    ? "New Bid Amount (ROSE)"
                                    : "Your Bid Amount (ROSE)"}
                            </Label>
                            <Input
                                id="bid-amount"
                                type="number"
                                step="0.001"
                                placeholder={hasUserBid
                                ? `Higher than ${userBidAmount}`
                                : "Enter your bid"}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                disabled={isPending || isConfirming}/>
                            <p className="text-xs text-muted-foreground mt-1">
                                Minimum: {formatEther(auction.startingPrice)}
                                ROSE {hasUserBid && ` | Must be higher than ${userBidAmount} ROSE`}
                            </p>
                        </div>

                        {/* Auction stats */}
                        <div className="bg-muted rounded-lg p-3">
                            <h4 className="font-medium mb-2">Auction Stats</h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Total Bids:</span>
                                    <div className="font-semibold">{auction
                                            .totalBids
                                            .toString()}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Bidders:</span>
                                    <div className="font-semibold">{auction
                                            .uniqueBidders
                                            .toString()}</div>
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
                                disabled={!bidAmount || parseFloat(bidAmount) <= 0 || isPending || isConfirming || (hasUserBid && parseFloat(bidAmount) <= parseFloat(userBidAmount))}
                                className="flex-1">
                                {isPending || isConfirming
                                    ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                            {isPending ? "Confirm in Wallet..." : "Processing..."}
                                        </>
                                    )
                                    : (
                                        <>
                                            <Lock className="w-4 h-4 mr-2"/>
                                            {hasUserBid ? "Update Bid" : "Submit Bid"}
                                        </>
                                    )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                setSelectedAuction(null);
                                setBidAmount("");
                                setIsUpdatingBid(false);
                            }}
                                className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // ✅ Render collection details dialog
    const renderCollectionDetailsDialog = (auction : ProcessedAuction) => {
        if (!auction.isCollection) 
            return null

        return (
            <Dialog
                open={expandedCollection === auction
                .auctionId
                .toString()}
                onOpenChange={(open) => {
                if (!open) 
                    setExpandedCollection(null)
            }}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedCollection(auction.auctionId.toString())}
                        className="w-full">
                        <Eye className="w-4 h-4 mr-2"/>
                        View All {auction.nftCount}
                        NFTs
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{auction.title}
                            - Full Collection</DialogTitle>
                        <DialogDescription>
                            Collection of {auction.nftCount}
                            NFTs from {auction.nftMetadata
                                ?.name || 'Unknown Collection'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Collection Info */}
                        <div className="bg-muted rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Starting Price:</span>
                                    <div className="font-semibold">{formatEther(auction.startingPrice)}
                                        ROSE</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">NFT Count:</span>
                                    <div className="font-semibold">{auction.nftCount}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total Bids:</span>
                                    <div className="font-semibold">{auction
                                            .totalBids
                                            .toString()}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Unique Bidders:</span>
                                    <div className="font-semibold">{auction
                                            .uniqueBidders
                                            .toString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* NFT Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* ✅ FIXED: Handle individualNftMetadata properly */}
                            {(Array.isArray(auction.individualNftMetadata) && auction.individualNftMetadata.length > 0
                                ? auction.individualNftMetadata
                                : auction.tokenIdsList.map(id => ({tokenId: id}))).map((item : {
                                tokenId?: bigint;
                                image?: string;
                                name?: string
                            }, idx : number) => {
                                const tokenId = item.tokenId || auction.tokenIdsList[idx] || BigInt(0)
                                return (
                                    <div key={tokenId.toString()} className="border rounded-lg overflow-hidden">
                                        <div className="aspect-square relative">
                                            <Image
                                                src={item.image || auction.nftMetadata
                                                ?.image || '/placeholder.svg'}
                                                alt={`${item.name || auction
                                                .title} #${tokenId
                                                .toString()}`}
                                                fill
                                                className="object-cover"/>
                                            <div className="absolute top-2 right-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    #{tokenId.toString()}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <div className="text-sm font-medium truncate">
                                                {item.name || `${auction
                                                    .title} #${tokenId
                                                    .toString()}`}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Token ID: {tokenId.toString()}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Collection Auction Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"/>
                                <div>
                                    <h4 className="font-medium text-blue-900 mb-1">Collection Auction Rules</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Winner receives ALL {auction.nftCount}
                                            NFTs in this collection</li>
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
        const isWinner = auction.isFinalized && auction.highestBidder
            ?.toLowerCase() === address?.toLowerCase()
        const isSeller = isUserSeller(auction)

        return (
            <Card
                key={auction.auctionId.toString()}
                className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                    <Image
                        src={auction.nftMetadata?.image || "/placeholder.svg"}
                        alt={auction.title}
                        fill
                        className="object-cover"/>
                    
                    {/* Collection indicator */}
                    {auction.isCollection && (
                        <div className="absolute top-3 left-3">
                            <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                                <Users className="w-3 h-3"/> {auction.nftCount} NFTs
                            </Badge>
                        </div>
                    )}

                    {/* Status badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <Badge
                            className={`flex items-center gap-1 ${type === 'active'
                            ? 'bg-purple-100 text-purple-800'
                            : type === 'ended'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'}`}>
                            {type === 'active' && (
                                <>
                                    <Lock className="w-3 h-3"/>
                                    Active
                                </>
                            )}
                            {type === 'ended' && (
                                <>
                                    <Clock className="w-3 h-3"/>
                                    Ended
                                </>
                            )}
                            {type === 'finalized' && (
                                <>
                                    <CheckCircle className="w-3 h-3"/>
                                    Finalized
                                </>
                            )}
                        </Badge>

                        {isWinner && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                                <Crown className="w-3 h-3 mr-1"/>
                                Winner
                            </Badge>
                        )}

                        {isSeller && (
                            <Badge className="bg-blue-100 text-blue-800">
                                <Star className="w-3 h-3 mr-1"/>
                                Your Auction
                            </Badge>
                        )}
                    </div>

                    {/* Time remaining */}
                    <div className="absolute bottom-3 left-3">
                        <CountdownTimer
                            endTime={new Date(Number(auction.endTime) * 1000).toISOString()}
                            variant={type === 'active'
                            ? "destructive"
                            : "secondary"}/>
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
                                    {type === 'finalized'
                                        ? 'Final Price'
                                        : 'Starting Price'}
                                </div>
                                <div className="font-bold text-lg">
                                    {type === 'finalized' && auction.finalPrice
                                        ? `${auction.finalPrice} ROSE`
                                        : `${formatEther(auction.startingPrice)} ROSE`
                                }
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total Bids</div>
                            <div className="font-semibold flex items-center gap-1">
                                <Target className="w-4 h-4"/> {auction.totalBids.toString()}
                            </div>
                        </div>
                    </div>

                    {/* Bid stats */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-muted-foreground">Unique Bidders</div>
                            <div className="font-semibold flex items-center gap-1">
                                <Users className="w-4 h-4"/> {auction.uniqueBidders.toString()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Time Left</div>
                            <div className="font-semibold text-orange-600">
                                {formatTimeRemaining(auction.timeRemaining)}
                            </div>
                        </div>
                    </div>

                    {/* ✅ Winner Information for Finalized Auctions */}
                    {type === 'finalized' && auction.highestBidder && auction.highestBid > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-green-600"/>
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
                            {isWinner && (
                                <div className="mt-2 text-sm font-medium text-green-700">
                                    🎉 Congratulations! You won this auction!
                                </div>
                            )}
                        </div>
                    )}

                    {/* User bid status */}
                    {hasUserBid && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-blue-600"/>
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
                                Reserve Price: {formatEther(auction.reservePrice)} ROSE
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2">
                        {/* Collection details button for collection auctions */}
                        {auction.isCollection && renderCollectionDetailsDialog(auction)}

                        {type === 'active' && (
                            <>
                                {isSeller
                                    ? (
                                        <>
                                            {renderCancelDialog(auction)}
                                            <div className="text-center text-sm text-muted-foreground">
                                                {canCancelAuction(auction)
                                                    ? "You can cancel this auction"
                                                    : auction.totalBids > BigInt(0)
                                                        ? "Cannot cancel - auction has bids"
                                                        : "Auction is active"}
                                            </div>
                                        </>
                                    )
                                    : (
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
                                disabled={finalizingAuctions.has(auction.auctionId.toString())}>
                                {finalizingAuctions.has(auction.auctionId.toString())
                                    ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                            Finalizing ...
                                        </>
                                    )
                                    : (
                                        <>
                                            <Gavel className="w-4 h-4 mr-2"/>
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
                                        className="w-full">
                                        {isPending || isConfirming
                                            ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                                    Revealing...
                                                </>
                                            )
                                            : (
                                                <>
                                                    <Eye className="w-4 h-4 mr-2"/>
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
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            disabled={loading}
                            className="flex items-center gap-2">
                            <RefreshCw
                                className={`w-4 h-4 ${loading
                                ? 'animate-spin'
                                : ''}`}/>
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Auctions</p>
                                    <p className="text-2xl font-bold text-green-600">{processedGroupedAuctions.active.length}</p>
                                </div>
                                <div className="p-2 bg-green-100 rounded-full">
                                    <Activity className="w-5 h-5 text-green-600"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Ended Auctions</p>
                                    <p className="text-2xl font-bold text-orange-600">{processedGroupedAuctions.ended.length}</p>
                                </div>
                                <div className="p-2 bg-orange-100 rounded-full">
                                    <Clock className="w-5 h-5 text-orange-600"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Finalized</p>
                                    <p className="text-2xl font-bold text-blue-600">{processedGroupedAuctions.finalized.length}</p>
                                </div>
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <CheckCircle className="w-5 h-5 text-blue-600"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Auction Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as "active" | "ended" | "finalized")}
                    className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="active" className="flex items-center gap-2">
                            <Activity className="w-4 h-4"/>
                            Active ({processedGroupedAuctions.active.length})
                        </TabsTrigger>
                        <TabsTrigger value="ended" className="flex items-center gap-2">
                            <Clock className="w-4 h-4"/>
                            Ended ({processedGroupedAuctions.ended.length})
                        </TabsTrigger>
                        <TabsTrigger value="finalized" className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4"/>
                            Finalized ({processedGroupedAuctions.finalized.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Loading State */}
                    {loading && (
                        <div className="mt-8">
                            <div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => (
                                    <Card key={i} className="overflow-hidden">
                                        <Skeleton className="aspect-square w-full"/>
                                        <CardContent className="p-4">
                                            <Skeleton className="h-4 w-3/4 mb-2"/>
                                            <Skeleton className="h-3 w-1/2 mb-4"/>
                                            <Skeleton className="h-8 w-full"/>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <Alert className="mt-8">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>
                                Error loading auctions: {error.message || "Unknown error"}. Please try refreshing the page.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Active Auctions */}
                    <TabsContent value="active" className="mt-8">
                        {processedGroupedAuctions.active.length === 0
                            ? (
                                <div className="text-center py-12">
                                    <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
                                    <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
                                    <p className="text-muted-foreground">
                                        There are currently no active auctions. Check back later!
                                    </p>
                                </div>
                            )
                            : (
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {processedGroupedAuctions
                                        .active
                                        .map((auction) => renderAuctionCard(auction, 'active'))}
                                </div>
                            )}
                    </TabsContent>

                    {/* Ended Auctions */}
                    <TabsContent value="ended" className="mt-8">
                        {processedGroupedAuctions.ended.length === 0
                            ? (
                                <div className="text-center py-12">
                                    <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
                                    <h3 className="text-lg font-semibold mb-2">No Ended Auctions</h3>
                                    <p className="text-muted-foreground">
                                        No auctions have ended recently. Active auctions will appear here when they
                                        finish.
                                    </p>
                                </div>
                            )
                            : (
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {processedGroupedAuctions
                                        .ended
                                        .map((auction) => renderAuctionCard(auction, 'ended'))}
                                </div>
                            )}
                    </TabsContent>

                    {/* Finalized Auctions */}
                    <TabsContent value="finalized" className="mt-8">
                        {processedGroupedAuctions.finalized.length === 0
                            ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
                                    <h3 className="text-lg font-semibold mb-2">No Finalized Auctions</h3>
                                    <p className="text-muted-foreground">
                                        No auctions have been finalized yet. Ended auctions will appear here after
                                        finalization.
                                    </p>
                                </div>
                            )
                            : (
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {processedGroupedAuctions
                                        .finalized
                                        .map((auction) => renderAuctionCard(auction, 'finalized'))}
                                </div>
                            )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}