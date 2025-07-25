/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, Edit, ShoppingCart, X, Heart, Eye, Star, 
  AlertCircle, Loader2, Package, Users, TrendingUp, ExternalLink
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useWallet } from "@/context/walletContext"
import { useNFTMarket } from "@/hooks/use-market"
import { useToast } from "@/hooks/use-toast"
import { useMarketplace } from "@/context/marketplaceContext"
import { ProcessedNFT } from "@/interfaces/nft"


export default function NFTDetailPage() {
  const params = useParams()
  const router = useRouter()
  const nftId = params.id as string

  const [newPrice, setNewPrice] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [processingNFT, setProcessingNFT] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { address, isConnected } = useWallet()
  const { toast } = useToast()
  const { updateNFTPrice, cancelNFTListing, buyNFT } = useMarketplace()
  const {
    buyNFTUnified, updatePrice, cancelListingUnified,
    hash, error: marketError, isPending, isConfirming, isConfirmed
  } = useNFTMarket()

  // Lấy NFT từ context
  const { nfts } = useMarketplace()
  const nft = nfts.find(n => n.id === nftId || n.listingId === nftId)

  // Thêm state để lưu thông tin chi tiết từ API
  const [detailedNFT, setDetailedNFT] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Loading effect
  useEffect(() => {
    if (nfts.length > 0) {
      setLoading(false)
    }
  }, [nfts])

  // Thêm effect để fetch thông tin chi tiết từ API
  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!nftId) return
      
      setIsLoadingDetails(true)
      try {
        const response = await fetch(`/api/listings/${nftId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 API response:', data)
          // ✅ Chỉ set detailedNFT nếu context không có data
          if (!nft) {
            setDetailedNFT(data.listing)
          }
        } else {
          console.error('Failed to fetch NFT details')
        }
      } catch (error) {
        console.error('Error fetching NFT details:', error)
      } finally {
        setIsLoadingDetails(false)
      }
    }

    // ✅ Chỉ fetch từ API nếu không có data trong context
    if (!nft) {
      fetchNFTDetails()
    } else {
      setDetailedNFT(nft)
    }
  }, [nftId, nft])

  // ✅ Ưu tiên context data, fallback về API data
  const displayNFT = nft || detailedNFT

  // ✅ Thêm helper function để map field names
  const getDisplayData = (nft: any) => {
    if (!nft) {
      console.log('❌ No NFT data provided to getDisplayData')
      return {
        tokenId: 'Unknown',
        contractAddress: 'Unknown',
        seller: 'Unknown',
        collectionName: 'None',
        category: 'Uncategorized',
        rarity: 'Common',
        price: 'Unknown',
        views: 0,
        likes: 0,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    console.log('🔍 Raw NFT data:', nft)
    
    // Map từ context data (ProcessedNFT) hoặc database data
    const displayData = {
      tokenId: nft.tokenId || nft.token_id || 'Unknown',
      contractAddress: nft.contractAddress || nft.nft_contract || 'Unknown',
      seller: nft.seller || 'Unknown',
      collectionName: nft.collectionName || nft.collection_name || 'None',
      category: nft.category || 'Uncategorized',
      rarity: nft.rarity || 'Common',
      price: nft.price || 'Unknown',
      views: nft.views || nft.views_count || 0,
      likes: nft.likes || nft.likes_count || 0,
      isActive: nft.isActive || nft.is_active || false,
      // ✅ Thêm fallback cho timestamp
      createdAt: nft.createdAt || nft.created_at || new Date().toISOString(),
      updatedAt: nft.updatedAt || nft.updated_at || new Date().toISOString()
    }
    
    console.log('✅ Processed display data:', displayData)
    console.log('📅 Created at:', displayData.createdAt)
    console.log('📅 Updated at:', displayData.updatedAt)
    
    return displayData
  }

  const displayData = getDisplayData(displayNFT)

  // Dialog state
  const openEditDialog = () => {
    if (!displayNFT) return
    setNewPrice(displayNFT.price?.toString() || "")
    setIsEditDialogOpen(true)
  }

  const closeDialog = () => {
    setIsEditDialogOpen(false)
    setNewPrice("")
  }

  // Helper functions
  const isOwner = useCallback(() => {
    return address && displayNFT?.seller && displayNFT.seller.toLowerCase() === address.toLowerCase()
  }, [address, displayNFT])

  const isProcessing = processingNFT === nftId

  const formatAddress = (address: string) => {
    if (!address) return "Unknown"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "bg-purple-100 text-purple-800"
      case "epic": return "bg-blue-100 text-blue-800"
      case "rare": return "bg-green-100 text-green-800"
      case "uncommon": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // ✅ Cải thiện formatDate function
  const formatDate = (dateString: string | undefined | null) => {
    console.log('📅 formatDate called with:', dateString)
    
    if (!dateString) {
      console.log('❌ No date string provided')
      return "Unknown"
    }
    
    try {
      const date = new Date(dateString)
      console.log('📅 Parsed date:', date)
      
      // Kiểm tra nếu date hợp lệ
      if (isNaN(date.getTime())) {
        console.log('❌ Invalid date:', dateString)
        return "Invalid date"
      }
      
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      console.log('✅ Formatted date:', formatted)
      return formatted
    } catch (error) {
      console.error('❌ Error formatting date:', error)
      return "Invalid date"
    }
  }

  // Handle purchase
  const handlePurchase = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to purchase NFTs.",
        variant: "destructive"
      })
      return
    }

    if (!displayNFT?.canPurchase || !displayNFT?.isActive) {
      toast({
        title: "Cannot Purchase",
        description: "This item is no longer available for purchase.",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessingNFT(nftId)
      await buyNFTUnified(displayNFT.listingId || displayNFT.id, displayNFT.price?.toString() || "0")
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
  }, [isConnected, buyNFTUnified, toast, displayNFT, nftId])

  // Handle update price
  const handleUpdatePrice = useCallback(async () => {
    if (!displayNFT || !newPrice) return

    try {
      setProcessingNFT(nftId)
      await updatePrice(displayNFT.listingId || displayNFT.id, newPrice)
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
  }, [displayNFT, newPrice, updatePrice, toast, nftId])

  // Handle cancel listing
  const handleCancelListing = useCallback(async () => {
    if (!displayNFT) return

    try {
      setProcessingNFT(nftId)
      await cancelListingUnified(displayNFT.listingId || displayNFT.id)
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
  }, [cancelListingUnified, toast, displayNFT, nftId])

  // Handle successful blockchain transactions
  useEffect(() => {
    if (isConfirmed && hash && processingNFT) {
      const handleDatabaseUpdate = async () => {
        try {
          if (!displayNFT) return

          if (newPrice) {
            await updateNFTPrice(displayNFT.listingId || displayNFT.id, newPrice)
            toast({
              title: "Price Updated Successfully!",
              description: "NFT price has been updated successfully.",
            })
            setNewPrice("")
            setIsEditDialogOpen(false)
          } else {
            await buyNFT(displayNFT.listingId || displayNFT.id)
            toast({
              title: "Purchase Successful!",
              description: "NFT has been purchased successfully.",
            })
          }

          // Refresh page after successful update
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
  }, [isConfirmed, hash, processingNFT, updateNFTPrice, buyNFT, toast, displayNFT, newPrice])

  // Thêm state để track view và like
  const [viewCount, setViewCount] = useState(displayNFT?.views || 0)
  const [likeCount, setLikeCount] = useState(displayNFT?.likes || 0)
  const [isLiked, setIsLiked] = useState(false)

  // ✅ Thêm effect để update view count khi vào trang
  useEffect(() => {
    if (displayNFT?.listingId) {
      updateViewCount()
    }
  }, [displayNFT?.listingId])

  // ✅ Hàm update view count
  const updateViewCount = async () => {
    if (!displayNFT?.listingId) return

    try {
      const response = await fetch(`/api/listings/${displayNFT.listingId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setViewCount(data.views_count)
        }
      }
    } catch (error) {
      console.error('Failed to update view count:', error)
    }
  }

  // ✅ Hàm handle like
  const handleLike = async () => {
    if (!displayNFT?.listingId || isLiked) return

    try {
      const response = await fetch(`/api/listings/${displayNFT.listingId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLikeCount(data.likes_count)
          setIsLiked(true)
          toast({
            title: "Liked! ❤️",
            description: "NFT has been added to your likes.",
          })
        }
      }
    } catch (error) {
      console.error('Failed to update like count:', error)
      toast({
        title: "Failed to like",
        description: "Please try again later.",
        variant: "destructive"
      })
    }
  }

  // Thêm useEffect để tăng view count khi vào trang
  useEffect(() => {
    const incrementViewCount = async () => {
      if (displayNFT?.listing_id) {
        try {
          await fetch(`/api/listings/${displayNFT.listing_id}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        } catch (error) {
          console.error('Error incrementing view count:', error)
        }
      }
    }

    // Chỉ tăng view count một lần khi component mount và có data
    if (displayNFT) {
      incrementViewCount()
    }
  }, [displayNFT?.listing_id])

  // Thêm useEffect để sync like count khi nft data thay đổi
  useEffect(() => {
    if (displayNFT) {
      setLikeCount(displayNFT.likes_count || 0)
    }
  }, [displayNFT])

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
        <div className="space-y-6">
          <Skeleton className="w-full h-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  // Error state - NFT not found
  if (!displayNFT) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            NFT not found. The item may have been removed or is no longer available.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>

      {/* NFT Header */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* NFT Image */}
              <div className="flex-shrink-0">
                <div className="relative w-full lg:w-96 h-96 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={displayNFT.image || '/placeholder.svg'}
                    alt={displayNFT.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  {/* Overlay for actions */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
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
              </div>
              
              {/* NFT Info */}
              <div className="flex-1 space-y-6">
                {/* Title and Collection */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h1 className="text-3xl font-bold">{displayNFT.name}</h1>
                    {displayNFT.rarity && (
                      <Badge className={getRarityColor(displayNFT.rarity)}>
                        {displayNFT.rarity}
                      </Badge>
                    )}
                  </div>
                  
                  {displayNFT.collectionName && (
                    <div className="mb-4">
                      <span className="text-sm text-muted-foreground">Collection: </span>
                      <Link 
                        href={`/marketplace/collection/${displayNFT.collectionId}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {displayNFT.collectionName}
                      </Link>
                    </div>
                  )}
                  
                  <p className="text-gray-600 text-lg">{displayNFT.description}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{displayNFT.tokenId}</div>
                    <div className="text-sm text-muted-foreground">Token ID</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{displayNFT.price} ROSE</div>
                    <div className="text-sm text-muted-foreground">Price</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{likeCount}</div>
                    <div className="text-sm text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{viewCount}</div>
                    <div className="text-sm text-muted-foreground">Views</div>
                  </div>
                </div>

                {/* External Link */}
                {displayNFT.externalLink && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={displayNFT.externalLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View External Link
                    </a>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {isOwner() ? (
                    <>
                      <Button
                        onClick={openEditDialog}
                        disabled={isProcessing}
                        className="flex-1"
                        size="lg"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Edit className="w-4 h-4 mr-2" />
                        )}
                        Edit Price
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelListing}
                        disabled={isProcessing}
                        className="flex-1"
                        size="lg"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        Cancel Listing
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handlePurchase}
                      disabled={isProcessing || !displayNFT.canPurchase}
                      className="flex-1"
                      size="lg"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      Buy Now - {displayNFT.price} ROSE
                    </Button>
                  )}
                  
                  {/* Thêm nút Like */}
                  <Button
                    variant="outline"
                    onClick={handleLike}
                    disabled={isLiked}
                    className="flex-1"
                    size="lg"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NFT Properties */}
      {displayNFT.properties && displayNFT.properties.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Properties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayNFT.properties.map((prop: { trait_type: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; value: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined }, idx: Key | null | undefined) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600 mb-1">
                      {prop.trait_type}
                    </div>
                    <div className="text-lg font-semibold">
                      {prop.value}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Additional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>NFT Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token ID:</span>
                <span className="font-medium">{displayData.tokenId || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract:</span>
                <span className="font-medium font-mono text-sm">
                  {formatAddress(displayData.contractAddress)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller:</span>
                <span className="font-medium font-mono text-sm">
                  {formatAddress(displayData.seller)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collection:</span>
                <span className="font-medium">{displayData.collectionName || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{displayData.category || 'Uncategorized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rarity:</span>
                <Badge>
                  {displayData.rarity || 'Common'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-lg">
                  {"price" in displayData && displayData.price !== undefined && displayData.price !== null
                    ? `${parseFloat(String(displayData.price)).toFixed(4)} ROSE`
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views:</span>
                <span className="font-medium">
                  {"views" in displayData && typeof displayData.views === "number"
                    ? displayData.views
                    : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Likes:</span>
                <span className="font-medium">
                  {"likes" in displayData && typeof displayData.likes === "number"
                    ? displayData.likes
                    : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={displayData.isActive ? "default" : "secondary"}>
                  {displayData.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium text-sm">
                  {formatDate(displayData.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium text-sm">
                  {formatDate(displayData.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit NFT Price</DialogTitle>
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
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePrice}
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
