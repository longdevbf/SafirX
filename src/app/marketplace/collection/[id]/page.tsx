/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, Edit, ShoppingCart, X, Heart, Eye, Star, 
  AlertCircle, Loader2, Package, Users, TrendingUp
} from "lucide-react"
import Image from "next/image"
import { useWallet } from "@/context/walletContext"
import { useCollectionDetailFromDB } from "@/hooks/use-marketplace-db"
import { useNFTMarket } from "@/hooks/use-market"
import { ProcessedNFT } from "@/interfaces/nft"
import { useToast } from "@/hooks/use-toast"
import { useMarketplace } from "@/context/marketplaceContext"

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.id as string
  
  const [newPrice, setNewPrice] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [processingNFT, setProcessingNFT] = useState<string | null>(null)
  
  const { address, isConnected } = useWallet()
  const { toast } = useToast()
  const { 
    updateNFTPrice, 
    cancelNFTListing, 
    buyNFT 
  } = useMarketplace()
  
  const {
    buyNFTUnified, 
    updateBundlePrice, 
    cancelListingUnified, 
    hash, 
    error: marketError, 
    isPending, 
    isConfirming, 
    isConfirmed
  } = useNFTMarket()
  
  const { 
    collection: collectionData, 
    collectionItems, 
    loading: loadingCollection,
    error: collectionError,
    isBundle,
    totalItems,
    soldItems
  } = useCollectionDetailFromDB(collectionId)

  // Handle back navigation
  const handleBack = () => {
    router.back()
  }

  // Helper functions - Add type for collection data
  type CollectionOrNFT = ProcessedNFT | { id: string; seller: string; isBundle?: boolean; [key: string]: unknown }

  const isOwner = useCallback((nft: CollectionOrNFT) => {
    return address && nft?.seller && 
           nft.seller.toLowerCase() === address.toLowerCase()
  }, [address])

  const isProcessing = useCallback((nft: CollectionOrNFT) => {
    return processingNFT === nft?.id
  }, [processingNFT])

  // Handle purchase
  const handlePurchase = useCallback(async (nft: ProcessedNFT) => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to purchase NFTs.",
        variant: "destructive"
      })
      return
    }

    if (!nft.canPurchase || !nft.isActive) {
      toast({
        title: "Cannot Purchase",
        description: "This item is no longer available for purchase.",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessingNFT(nft.id)
      
      // Blockchain transaction first
      if (nft.isBundle) {
        await buyNFTUnified(nft.collectionId || nft.id, nft.price?.toString() || "0")
      } else {
        await buyNFTUnified(nft.listingId || nft.id, nft.price?.toString() || "0")
      }
      
      toast({
        title: "Transaction Submitted",
        description: "Please confirm the transaction in your wallet...",
      })
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase NFT. Please try again.",
        variant: "destructive"
      })
      setProcessingNFT(null)
    }
  }, [isConnected, buyNFTUnified, toast])

  // Handle update price
  const handleUpdatePrice = useCallback(async (nft: ProcessedNFT) => {
    if (!newPrice || !nft) return

    try {
      setProcessingNFT(nft.id)
      
      // Blockchain transaction first
      if (nft.isBundle) {
        await updateBundlePrice(nft.collectionId || nft.id, newPrice)
      } else {
        await updateBundlePrice(nft.listingId || nft.id, newPrice)
      }
      
      toast({
        title: "Price Update Submitted",
        description: "Please confirm the transaction in your wallet...",
      })
    } catch (error) {
      console.error("Price update error:", error)
      toast({
        title: "Price Update Failed",
        description: error instanceof Error ? error.message : "Failed to update price. Please try again.",
        variant: "destructive"
      })
      setProcessingNFT(null)
    }
  }, [newPrice, updateBundlePrice, toast])

  // Handle cancel listing
  const handleCancelListing = useCallback(async (nft: ProcessedNFT) => {
    if (!nft) return

    try {
      setProcessingNFT(nft.id)
      
      // Blockchain transaction first
      await cancelListingUnified(nft.listingId || nft.collectionId || nft.id)
      
      toast({
        title: "Cancel Listing Submitted",
        description: "Please confirm the transaction in your wallet...",
      })
    } catch (error) {
      console.error("Cancel listing error:", error)
      toast({
        title: "Cancel Listing Failed",
        description: error instanceof Error ? error.message : "Failed to cancel listing. Please try again.",
        variant: "destructive"
      })
      setProcessingNFT(null)
    }
  }, [cancelListingUnified, toast])

  // Handle successful blockchain transactions
  useEffect(() => {
    if (isConfirmed && hash && processingNFT) {
      const handleDatabaseUpdate = async () => {
        try {
          // Update database after successful blockchain transaction
          const processingItem = collectionItems.find(item => item.id === processingNFT) || collectionData
          if (!processingItem) return

          if (processingItem.isBundle || (collectionData && collectionData.isBundle)) {
            // Handle bundle transaction
            if (newPrice) {
              await updateNFTPrice(processingItem.collectionId || processingItem.id, newPrice)
              toast({
                title: "Price Updated Successfully!",
                description: "Collection price has been updated successfully.",
              })
              setNewPrice("")
              setIsEditDialogOpen(false)
            } else {
              // Purchase or cancel
              await buyNFT(processingItem.collectionId || processingItem.id, address!)
              toast({
                title: "Purchase Successful!",
                description: "Collection has been purchased successfully.",
              })
            }
          } else {
            // Handle individual NFT transaction
            if (newPrice) {
              await updateNFTPrice(processingItem.listingId || processingItem.id, newPrice)
              toast({
                title: "Price Updated Successfully!",
                description: "NFT price has been updated successfully.",
              })
              setNewPrice("")
              setIsEditDialogOpen(false)
            } else {
              await buyNFT(processingItem.listingId || processingItem.id, address!)
              toast({
                title: "Purchase Successful!",
                description: "NFT has been purchased successfully.",
              })
            }
          }
          
          // Refresh data after successful update
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } catch (error) {
          console.error("Database update error:", error)
          toast({
            title: "Database Update Failed",
            description: "Blockchain transaction succeeded but failed to update database.",
            variant: "destructive"
          })
        } finally {
          setProcessingNFT(null)
        }
      }
      
      handleDatabaseUpdate()
    }
  }, [isConfirmed, hash, processingNFT, collectionItems, updateNFTPrice, buyNFT, toast, address, newPrice])

  // Loading state
  if (loadingCollection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
        <div className="space-y-6">
          <Skeleton className="w-full h-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (collectionError || !collectionData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {collectionError || "Unable to load collection data"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>

      {/* Collection Header */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Collection Image */}
              <div className="flex-shrink-0">
                <div className="relative w-full md:w-80 h-80 rounded-lg overflow-hidden">
                  <Image
                    src={collectionData.image || '/placeholder.svg'}
                    alt={collectionData.name || 'Collection'}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              
              {/* Collection Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{collectionData.name}</h1>
                    <p className="text-gray-600 mb-4">{collectionData.description}</p>
                  </div>
                  {isBundle && (
                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Bundle</span>
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{soldItems}</div>
                    <div className="text-sm text-gray-600">Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{collectionData.price} ROSE</div>
                    <div className="text-sm text-gray-600">Bundle Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{collectionData.likes || 0}</div>
                    <div className="text-sm text-gray-600">Likes</div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {isOwner(collectionData as any) ? (
                    <>
                      <Button
                        onClick={() => setIsEditDialogOpen(true)}
                        disabled={isProcessing(collectionData as any)}
                        className="flex-1"
                      >
                        {isProcessing(collectionData as any) ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Edit className="w-4 h-4 mr-2" />
                        )}
                        Edit Price
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelListing(collectionData as any)}
                        disabled={isProcessing(collectionData as any)}
                        className="flex-1"
                      >
                        {isProcessing(collectionData as any) ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        Cancel Listing
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(collectionData as any)}
                      disabled={isProcessing(collectionData as any) || !collectionData.canPurchase}
                      className="flex-1"
                      size="lg"
                    >
                      {isProcessing(collectionData as any) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      Buy Now - {collectionData.price} ROSE
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Items */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Collection Items ({collectionItems.length})
        </h2>
        
        {collectionItems.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No items found in this collection.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collectionItems.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      src={item.image || '/placeholder.svg'}
                      alt={item.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 truncate">{item.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="text-blue-600 font-medium">Token ID: {item.tokenId}</div>
                        {isBundle && (
                          <div className="text-gray-500 text-xs">Part of Bundle</div>
                        )}
                      </div>
                      {item.rarity && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {item.rarity}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPrice">New Price (ROSE)</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                placeholder="Enter new price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdatePrice(collectionData as any)}
                disabled={!newPrice || isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Update Price
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 