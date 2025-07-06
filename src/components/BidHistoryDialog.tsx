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
import { History, Crown, ExternalLink, Copy, Eye, Loader2, Lock } from "lucide-react"
import { formatEther } from "viem"

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
  // ✅ Hook is called at the top level of this component
  const { auction: auctionDetail } = useAuctionDetail(auction.auctionId.toString())
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onTrigger}
        >
          <History className="w-4 h-4 mr-2" />
          Bid History
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bid History - {auction.title}</DialogTitle>
          <DialogDescription>
            {auction.isFinalized ? "Final bid results" : "Auction has ended but not finalized"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {auctionDetail?.publicBids && auctionDetail.publicBids.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">Public Bid History</h4>
              {auctionDetail.publicBids
                .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))
                .map((bid: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                      <div>
                        <div className="font-medium">{formatAddress(bid.bidder)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(Number(bid.timestamp) * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatEther(bid.amount)} ROSE</div>
                      <div className="text-sm text-muted-foreground">
                        Bid #{bid.bidNumber.toString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>
                {auction.isFinalized 
                  ? "No public bids available" 
                  : "Bid history will be available after the auction is finalized"
                }
              </p>
            </div>
          )}
          
          {/* Actions for seller */}
          {auction.isFinalized && 
           auction.seller.toLowerCase() === userAddress?.toLowerCase() && 
           auction.allowPublicReveal && 
           onEnablePublicHistory &&
           (!auctionDetail?.publicBids || auctionDetail.publicBids.length === 0) && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => onEnablePublicHistory(auction.auctionId.toString())}
                disabled={isPending || isConfirming}
                className="w-full"
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
            </div>
          )}
          
          {auction.userBid && (
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
