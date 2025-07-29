"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClaimStatus } from "@/hooks/use-claim-status";
import { ProcessedAuction } from "@/types/auction";
import { useWallet } from "@/context/walletContext";

interface DebugClaimStatusProps {
  auction: ProcessedAuction;
}

export function DebugClaimStatus({ auction }: DebugClaimStatusProps) {
  const { address } = useWallet();
  const { claimStatus, loading, error } = useClaimStatus(auction.auctionId.toString());

  const isWinner = auction.isFinalized && 
    auction.highestBidder?.toLowerCase() === address?.toLowerCase();

  const isUserSeller = auction.seller?.toLowerCase() === address?.toLowerCase();

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm">🐛 Debug: Claim Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Auction Info:</strong>
            <div>ID: {auction.auctionId.toString()}</div>
            <div>State: <Badge variant="outline">{auction.isFinalized ? 'FINALIZED' : 'NOT_FINALIZED'}</Badge></div>
            <div>Winner: {auction.highestBidder || 'None'}</div>
            <div>Seller: {auction.seller}</div>
          </div>
          
          <div>
            <strong>User Status:</strong>
            <div>Connected: <Badge variant={address ? 'default' : 'destructive'}>{address ? 'Yes' : 'No'}</Badge></div>
            <div>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</div>
            <div>Is Winner: <Badge variant={isWinner ? 'default' : 'outline'}>{isWinner ? 'Yes' : 'No'}</Badge></div>
            <div>Is Seller: <Badge variant={isUserSeller ? 'default' : 'outline'}>{isUserSeller ? 'Yes' : 'No'}</Badge></div>
          </div>
        </div>
        
        <div className="border-t pt-2">
          <strong>Claim Status:</strong>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600">Error: {error}</div>}
          {claimStatus && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div>NFT Claimed: <Badge variant={claimStatus.nft_claimed ? 'default' : 'outline'}>{claimStatus.nft_claimed ? 'Yes' : 'No'}</Badge></div>
                <div>Claim TX: {claimStatus.claim_tx_hash || 'None'}</div>
                <div>Claimed At: {claimStatus.claimed_at ? new Date(claimStatus.claimed_at).toLocaleString() : 'None'}</div>
              </div>
              <div>
                <div>NFT Reclaimed: <Badge variant={claimStatus.nft_reclaimed ? 'default' : 'outline'}>{claimStatus.nft_reclaimed ? 'Yes' : 'No'}</Badge></div>
                <div>Reclaim TX: {claimStatus.reclaim_tx_hash || 'None'}</div>
                <div>Reclaimed At: {claimStatus.reclaimed_at ? new Date(claimStatus.reclaimed_at).toLocaleString() : 'None'}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t pt-2">
          <strong>Actions Available:</strong>
          <div>
            Can Claim: <Badge variant={auction.isFinalized && isWinner && !claimStatus?.nft_claimed ? 'default' : 'outline'}>
              {auction.isFinalized && isWinner && !claimStatus?.nft_claimed ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            Can Reclaim: <Badge variant={auction.isFinalized && isUserSeller && !isWinner && !claimStatus?.nft_reclaimed ? 'default' : 'outline'}>
              {auction.isFinalized && isUserSeller && !isWinner && !claimStatus?.nft_reclaimed ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}