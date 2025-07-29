/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Crown,
    X,
    Loader2,
    ExternalLink,
    CheckCircle
} from "lucide-react";
import { formatEther } from "viem";
import { useWallet } from "@/context/walletContext";
import { toast } from "@/hooks/use-toast";
import { ProcessedAuction } from "@/types/auction";
import { useClaimStatus } from "@/hooks/use-claim-status";
import useSealedBidAuction from "@/hooks/use-auction";

interface AuctionCardProps {
    auction: ProcessedAuction;
    type: 'active' | 'ended' | 'finalized';
    onClaimNFT?: (auctionId: string, remainingAmount: string) => void;
}

export function AuctionCard({ auction, type, onClaimNFT }: AuctionCardProps) {
    const { address } = useWallet();
    const { claimNFT, reclaimNFT } = useSealedBidAuction();
    const { 
        claimStatus, 
        loading: claimLoading, 
        updateClaimStatus,
        isNftClaimed,
        isNftReclaimed,
        claimTxHash,
        reclaimTxHash
    } = useClaimStatus(auction.auctionId.toString());

    const [isProcessing, setIsProcessing] = useState(false);

    // Check if user is winner - only if there's a real winner (not 0x000...)
    const hasRealWinner = auction.highestBidder && 
        auction.highestBidder !== '0x0000000000000000000000000000000000000000';
    
    const isWinner = auction.isFinalized && 
        hasRealWinner &&
        auction.highestBidder?.toLowerCase() === address?.toLowerCase();

    // Check if user is seller
    const isUserSeller = auction.seller?.toLowerCase() === address?.toLowerCase();

    // Handle claim NFT
    const handleClaimNFT = async () => {
        if (!address) {
            toast({
                title: "❌ Wallet Not Connected",
                description: "Please connect your wallet to claim NFT.",
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
            
            const remainingAmount = formatEther(auction.highestBid - auction.startingPrice);
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

    // Handle reclaim NFT
    const handleReclaimNFT = async () => {
        if (!address) {
            toast({
                title: "❌ Wallet Not Connected", 
                description: "Please connect your wallet to reclaim NFT.",
                variant: "destructive"
            });
            return;
        }

        if (isNftReclaimed) {
            toast({
                title: "✅ NFT Already Reclaimed",
                description: `You have successfully reclaimed this NFT! Transaction: ${reclaimTxHash}`,
            });
            return;
        }

        try {
            setIsProcessing(true);
            
            const txHash = await reclaimNFT(parseInt(auction.auctionId.toString()));
            
            toast({
                title: "⏳ Reclaiming NFT",
                description: "Transaction submitted. Please wait for confirmation...",
            });

            // Update database with reclaim status
            const success = await updateClaimStatus('reclaim', txHash);
            
            if (success) {
                toast({
                    title: "✅ NFT Reclaimed Successfully!",
                    description: (
                        <div className="flex flex-col gap-2">
                            <span>Your NFT has been reclaimed successfully!</span>
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
            console.error('❌ Error reclaiming NFT:', error);
            toast({
                title: "❌ Reclaim Failed",
                description: error instanceof Error ? error.message : "Failed to reclaim NFT",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Render claim/reclaim buttons for finalized auctions
    const renderClaimButtons = () => {
        if (type !== 'finalized') return null;

        return (
            <div className="space-y-2">
                {/* Claim NFT Button for winner */}
                {isWinner && (
                    <Button
                        variant={isNftClaimed ? "outline" : "default"}
                        className={`w-full ${isNftClaimed ? 'border-green-500 text-green-700 bg-green-50' : ''}`}
                        onClick={handleClaimNFT}
                        disabled={isProcessing || claimLoading}
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
                )}

                {/* Reclaim NFT Button for seller when no winner */}
                {isUserSeller && !isWinner && (
                    <Button
                        variant={isNftReclaimed ? "outline" : "outline"}
                        className={`w-full ${isNftReclaimed ? 'border-green-500 text-green-700 bg-green-50' : ''}`}
                        onClick={handleReclaimNFT}
                        disabled={isProcessing || claimLoading}
                    >
                        {isProcessing || claimLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {isNftReclaimed ? 'Reclaimed' : 'Reclaiming...'}
                            </>
                        ) : isNftReclaimed ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                NFT Reclaimed
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
        );
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Auction basic info */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold">{auction.title}</h3>
                            <p className="text-sm text-gray-600">
                                Auction #{auction.auctionId.toString()}
                            </p>
                        </div>
                        <Badge variant={
                            type === 'active' ? 'default' : 
                            type === 'ended' ? 'secondary' : 'outline'
                        }>
                            {type.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Price info */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Starting Price:</span>
                            <span className="font-medium">{formatEther(auction.startingPrice)} ROSE</span>
                        </div>
                        {auction.isFinalized && auction.highestBid > 0n && (
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Final Price:</span>
                                <span className="font-bold text-green-600">
                                    {formatEther(auction.highestBid)} ROSE
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Claim/Reclaim buttons */}
                    {renderClaimButtons()}
                </div>
            </CardContent>
        </Card>
    );
}