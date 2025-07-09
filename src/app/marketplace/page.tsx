/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Search, Filter, Grid3X3, List, Heart, Eye, Star, Edit, AlertCircle, 
  RefreshCw, Loader2, ShoppingCart, Tag, X, Package, ArrowLeft, Users
} from "lucide-react"
import Image from "next/image"
//import Link from "next/link"
import { useWallet } from "@/context/walletContext"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useMarketplaceNFTs, useNFTMarket, useCollectionDetail } from "@/hooks/use-market"
import { ProcessedNFT } from "@/interfaces/nft"
import { useToast } from "@/hooks/use-toast"
import { useMarketplace } from "@/context/marketplaceContext"
import { getRosePrice } from "@/services/rose_usd"

// Helper function for robust ID extraction
const getListingId = (nft: ProcessedNFT): string => {
  // Priority: listingId > collectionId > id
  const id = nft?.listingId || nft?.collectionId || nft?.id || ''
  
  if (!id || id === 'undefined' || id === 'null' || !nft) {
    console.error('❌ Invalid NFT ID:', nft)
    throw new Error(`Invalid listing ID: ${id}`)
  }
  
  return id
}

// Helper function for ID validation
const validateListingId = (id: string, operation: string): void => {
  if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
    throw new Error(`Invalid listing ID for ${operation}: ${id}`)
  }
}

export default function MarketplacePage() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<string[]>([])
  const [selectedRarity, setSelectedRarity] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("recent")
  
  const [selectedNFT, setSelectedNFT] = useState<ProcessedNFT | null>(null)
  const [newPrice, setNewPrice] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [processingNFT, setProcessingNFT] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [rosePrice, setRosePrice] = useState<number | null>(0.05)
  const [pendingTransaction, setPendingTransaction] = useState<{
    type: 'buy' | 'update' | 'cancel'
    nftId: string
    data?: any
  } | null>(null)

  const { address, isConnected } = useWallet()
  const { toast } = useToast()
  const {
    nfts = [],
    loading = true,
    error = null,
    pageLoading,
    loadMoreNFTs,
    hasMore,
    collections,
    rarities,
    refetch,
    total,
    likeNFT,
    updateNFTPrice,
    cancelNFTListing,
    buyNFT
  } = useMarketplace() || {}
  
  const {
    buyNFTUnified, updatePrice, updateBundlePrice, 
    cancelListingUnified, hash, error: marketError, 
    isPending, isConfirming, isConfirmed
  } = useNFTMarket()

  // ✅ FIXED: Always call useCollectionDetail - but pass undefined when not needed
  const { 
    collection: collectionData, 
    collectionItems, 
    loading: loadingCollection,
    error: collectionError,
    isBundle,
    totalItems,
    soldItems,
    debug
  } = useCollectionDetail(selectedCollectionId || undefined)

  // ✅ FIXED: Better refresh handler implementation
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !refetch) return
    
    setIsRefreshing(true)
    try {
      await refetch()
      toast({
        title: "Refreshed!",
        description: "NFT marketplace data has been reloaded",
      })
    } catch (error) {
      console.log(error);
      toast({
        title: "Refresh failed",
        description: "Failed to reload marketplace data",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, refetch, toast])

  // ✅ FIXED: Get unique collections and rarities from NFT data
  const { uniqueCollections, uniqueRarities } = useMemo(() => {
    const collectionsSet = new Set<string>()
    const raritiesSet = new Set<string>()
    
    nfts.forEach(nft => {
      if (nft.collectionName) {
        collectionsSet.add(nft.collectionName)
      }
      if (nft.rarity) {
        raritiesSet.add(nft.rarity)
      }
    })
    
    return {
      uniqueCollections: Array.from(collectionsSet),
      uniqueRarities: Array.from(raritiesSet)
    }
  }, [nfts])

  // ✅ FIXED: Define utility functions before using them
  const getNFTId = useCallback((nft: ProcessedNFT) => {
    if (!nft) {
      console.warn('⚠️ getNFTId called with empty NFT')
      return ''
    }
    try {
      return getListingId(nft)
    } catch (error) {
      console.warn('⚠️ Failed to get NFT ID:', error)
      return ''
    }
  }, [])

  const isProcessing = useCallback((nft: ProcessedNFT) => {
    return processingNFT === getNFTId(nft)
  }, [processingNFT, getNFTId])

  const isOwner = useCallback((nft: ProcessedNFT) => {
    return address && nft.seller && 
           nft.seller.toLowerCase() === address.toLowerCase()
  }, [address])

  const getRarityColor = useCallback((rarity: string) => {
    switch (rarity) {
      case "Common": return "bg-gray-100 text-gray-800"
      case "Uncommon": return "bg-green-100 text-green-800"
      case "Rare": return "bg-blue-100 text-blue-800"
      case "Epic": return "bg-purple-100 text-purple-800"
      case "Legendary": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }, [])

  // ✅ Filter NFTs by tab - stable reference
  const filteredByTab = useMemo(() => {
    switch (selectedTab) {
      case "nfts":
        return nfts.filter(nft => !nft.isBundle)
      case "collections":
        return nfts.filter(nft => nft.isBundle)
      default:
        return nfts
    }
  }, [nfts, selectedTab])

  // ✅ Memoize priceRange to prevent unnecessary re-renders
  const stablePriceRange = useMemo(() => priceRange, [priceRange[0], priceRange[1]])

  // ✅ More stable price range handler with debouncing
  const handlePriceRangeChange = useCallback((value: number[]) => {
    if (value.length !== 2) return
    
    const newRange: [number, number] = [value[0], value[1]]
    
    // Only update if values actually changed
    setPriceRange(prev => {
      if (prev[0] !== newRange[0] || prev[1] !== newRange[1]) {
        return newRange
      }
      return prev
    })
  }, [])

  // ✅ Apply filters and sorting - optimized dependencies
  const filteredNFTs = useMemo(() => {
    const [priceMin, priceMax] = stablePriceRange
    
    return filteredByTab
      .filter(nft => {
        if (searchQuery && !nft.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !nft.collectionName?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }
        
        if (selectedCollection.length > 0 && !selectedCollection.includes(nft.collectionName || '')) {
          return false
        }
        
        if (selectedRarity.length > 0 && nft.rarity && !selectedRarity.includes(nft.rarity)) {
          return false
        }
        
        const price = parseFloat(nft.price?.toString() || "0")
        if (price < priceMin || price > priceMax) {
          return false
        }
        
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return parseFloat(a.price?.toString() || "0") - parseFloat(b.price?.toString() || "0")
          case "price-high":
            return parseFloat(b.price?.toString() || "0") - parseFloat(a.price?.toString() || "0")
          case "most-liked":
            return (b.likes || 0) - (a.likes || 0)
          default:
            return 0
        }
      })
  }, [filteredByTab, searchQuery, selectedCollection, selectedRarity, stablePriceRange, sortBy])

  // ✅ FIXED: Handle collection filter with proper typing
  const handleCollectionFilter = useCallback((collection: string, checked: boolean) => {
    setSelectedCollection(prev => {
      if (checked) {
        return prev.includes(collection) ? prev : [...prev, collection]
      } else {
        return prev.filter(c => c !== collection)
      }
    })
  }, [])

  // ✅ FIXED: Handle rarity filter with proper typing
  const handleRarityFilter = useCallback((rarity: string, checked: boolean) => {
    setSelectedRarity(prev => {
      if (checked) {
        return prev.includes(rarity) ? prev : [...prev, rarity]
      } else {
        return prev.filter(r => r !== rarity)
      }
    })
  }, [])

  // ✅ Handle collection click - show collection details
  const handleCollectionClick = useCallback((nft: ProcessedNFT) => {
    if (nft.isBundle && nft.collectionId) {
      setSelectedCollectionId(nft.collectionId)
    }
  }, [])

  // ✅ Handle back from collection details
  const handleBackFromCollection = useCallback(() => {
    setSelectedCollectionId(null)
  }, [])

  // ✅ Handle purchase - only blockchain transaction, database update on confirmation
  const handlePurchase = useCallback(async (nft: ProcessedNFT) => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet Required",
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
      const id = getListingId(nft)
      validateListingId(id, 'purchase')
      
      console.log('🔍 Purchase ID extraction:', {
        isBundle: nft.isBundle,
        collectionId: nft.collectionId,
        listingId: nft.listingId,
        finalId: id,
        nftData: nft
      })
      
      setProcessingNFT(id)
      setPendingTransaction({
        type: 'buy',
        nftId: id,
        data: { buyerAddress: address }
      })
      
      // Only do blockchain transaction, database update will happen on confirmation
      await buyNFTUnified(id, nft.price?.toString() || "0")
      
      toast({
        title: "Purchase Submitted",
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
      setPendingTransaction(null)
    }
  }, [isConnected, buyNFTUnified, toast])

  const handleUpdatePrice = useCallback(async () => {
    if (!selectedNFT || !newPrice) return

    try {
      const id = getListingId(selectedNFT)
      validateListingId(id, 'price update')
      
      setProcessingNFT(id)
      setPendingTransaction({
        type: 'update',
        nftId: id,
        data: { newPrice }
      })
      
      // Only do blockchain transaction, database update will happen on confirmation
      if (selectedNFT.isBundle && selectedNFT.collectionId) {
        await updateBundlePrice(selectedNFT.collectionId, newPrice)
      } else if (selectedNFT.listingId) {
        await updatePrice(selectedNFT.listingId, newPrice)
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
      setPendingTransaction(null)
    }
  }, [selectedNFT, newPrice, updatePrice, updateBundlePrice, toast])

  const handleCancelListing = useCallback(async (nft: ProcessedNFT) => {
    try {
      const id = getListingId(nft)
      validateListingId(id, 'cancel listing')
      
      setProcessingNFT(id)
      setPendingTransaction({
        type: 'cancel',
        nftId: id
      })
      
      // Only do blockchain transaction, database update will happen on confirmation
      await cancelListingUnified(id)
      
      toast({
        title: "Cancellation Submitted",
        description: "Please confirm the transaction in your wallet...",
      })
    } catch (error) {
      console.error("Cancel listing error:", error)
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel listing. Please try again.",
        variant: "destructive"
      })
      setProcessingNFT(null)
      setPendingTransaction(null)
    }
  }, [cancelListingUnified, toast])

  // ✅ Handle successful transactions
  useEffect(() => {
    if (isConfirmed && hash && pendingTransaction) {
      const handleDatabaseUpdate = async () => {
        try {
          console.log('🔄 Processing database update:', pendingTransaction)
          
          switch (pendingTransaction.type) {
            case 'buy':
              if (buyNFT && pendingTransaction.data?.buyerAddress) {
                console.log('💰 Buying NFT:', pendingTransaction.nftId, 'for', pendingTransaction.data.buyerAddress)
                await buyNFT(pendingTransaction.nftId, pendingTransaction.data.buyerAddress)
              }
              toast({
                title: "Purchase Successful!",
                description: "NFT has been purchased successfully.",
              })
              break
              
            case 'update':
              if (updateNFTPrice && pendingTransaction.data?.newPrice) {
                console.log('💲 Updating price:', pendingTransaction.nftId, 'to', pendingTransaction.data.newPrice)
                await updateNFTPrice(pendingTransaction.nftId, pendingTransaction.data.newPrice)
              }
              toast({
                title: "Price Updated Successfully!",
                description: "NFT price has been updated.",
              })
              setSelectedNFT(null)
              setNewPrice("")
              setIsEditDialogOpen(false)
              break
              
            case 'cancel':
              if (cancelNFTListing) {
                console.log('❌ Cancelling listing:', pendingTransaction.nftId)
                await cancelNFTListing(pendingTransaction.nftId)
              }
              toast({
                title: "Listing Cancelled Successfully!",
                description: "NFT listing has been cancelled.",
              })
              break
          }
          
          // Refresh marketplace data
          setTimeout(() => refetch && refetch(), 1000)
        } catch (error) {
          console.error('❌ Database update error:', error)
          toast({
            title: "Database Update Failed",
            description: `Transaction succeeded but database update failed: ${error}`,
            variant: "destructive"
          })
        }
      }
      
      handleDatabaseUpdate()
      setPendingTransaction(null)
      setProcessingNFT(null)
    }
  }, [isConfirmed, hash, pendingTransaction, buyNFT, updateNFTPrice, cancelNFTListing, refetch, toast])

  // ✅ Handle transaction errors
  useEffect(() => {
    if (marketError) {
      toast({
        title: "Transaction Failed",
        description: marketError.message || "Transaction failed. Please try again.",
        variant: "destructive"
      })
      setProcessingNFT(null)
      setPendingTransaction(null)
    }
  }, [marketError, toast])

  // ✅ Monitor transaction status to clear processing state
  useEffect(() => {
    if (!isPending && !isConfirming && processingNFT) {
      const timer = setTimeout(() => {
        setProcessingNFT(null)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isPending, isConfirming, processingNFT])

  // ✅ FIXED: Collection Details View - now only uses data from hook called above
  if (selectedCollectionId) {
    if (loadingCollection) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="ghost" 
                onClick={handleBackFromCollection}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Button>
            </div>
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading collection details...</p>
              {/* ✅ Debug info */}
              {debug && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Collection ID: {selectedCollectionId}</p>
                  <p>Loading: {debug.loadingCollection ? 'Yes' : 'No'}</p>
                  <p>Has Data: {debug.hasCollectionData ? 'Yes' : 'No'}</p>
                  <p>Has Items: {debug.hasCollectionItemIds ? 'Yes' : 'No'}</p>
                  <p>Items Count: {debug.itemIdsLength || 0}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (collectionError) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="ghost" 
                onClick={handleBackFromCollection}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Button>
            </div>
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Failed to load collection: {collectionError || 'Unknown error'}</p>
                  {/* ✅ Debug info */}
                  {debug && (
                    <details className="text-xs">
                      <summary>Debug Info</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(debug, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    if (!collectionData) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="ghost" 
                onClick={handleBackFromCollection}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Button>
            </div>
            <Alert className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Collection not found or not available</p>
                  <p className="text-sm">Collection ID: {selectedCollectionId}</p>
                  {/* ✅ Debug info */}
                  {debug && (
                    <details className="text-xs">
                      <summary>Debug Info</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(debug, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    // ✅ Collection Items section
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Collection Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={handleBackFromCollection}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Button>
          </div>

          {/* Collection Info */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {collectionItems[0]?.image ? (
                      <Image
                        src={collectionItems[0].image}
                        alt={collectionData.collectionName}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder.svg'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Package className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:w-2/3 space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{collectionData.collectionName}</h1>
                    <p className="text-muted-foreground">
                      {isBundle ? 'Bundle Collection' : 'Individual Collection'}
                    </p>
                    {/* ✅ Add debug info for collection */}
                    {debug && (
                      <details className="mt-2 text-xs text-muted-foreground">
                        <summary>Collection Debug Info</summary>
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <p>Collection ID: {selectedCollectionId}</p>
                          <p>Items Found: {collectionItems.length}</p>
                          <p>Total Items: {Number(totalItems)}</p>
                          <p>Is Bundle: {isBundle ? 'Yes' : 'No'}</p>
                          <p>Is Active: {collectionData.isActive ? 'Yes' : 'No'}</p>
                          <p>Contract: {collectionData.nftContract}</p>
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{Number(totalItems)}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{Number(soldItems)}</div>
                      <div className="text-sm text-muted-foreground">Sold</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{Number(totalItems) - Number(soldItems)}</div>
                      <div className="text-sm text-muted-foreground">Available</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {collectionData.bundlePrice ? `${Number(collectionData.bundlePrice) / 1e18} ROSE` : 'Varies'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rosePrice && collectionData.bundlePrice ? 
                          `≈ $${((Number(collectionData.bundlePrice) / 1e18) * rosePrice).toFixed(2)}` : 
                          'Price'}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4">
                    {isBundle ? (
                      <Button 
                        onClick={() => {
                          const bundleNFT: ProcessedNFT = {
                            id: `bundle-${selectedCollectionId}`,
                            collectionId: selectedCollectionId,
                            name: collectionData.collectionName,
                            contractAddress: collectionData.nftContract,
                            tokenId: 'bundle',
                            seller: collectionData.seller,
                            price: (Number(collectionData.bundlePrice) / 1e18).toString(),
                            collectionName: collectionData.collectionName,
                            image: collectionItems[0]?.image || '/placeholder.svg',
                            isActive: collectionData.isActive,
                            isBundle: true,
                            collection: collectionData.collectionName.toLowerCase().replace(/\s+/g, '-'),
                            description: `Bundle of ${Number(totalItems)} NFTs`,
                            canPurchase: true,
                          }
                          handlePurchase(bundleNFT)
                        }}
                        className="flex items-center gap-2"
                        disabled={processingNFT === selectedCollectionId || !collectionData.isActive}
                      >
                        {processingNFT === selectedCollectionId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                        Buy Bundle ({(Number(collectionData.bundlePrice) / 1e18).toFixed(3)} ROSE)
                      </Button>
                    ) : (
                      <Badge variant="outline">Individual items can be purchased separately</Badge>
                    )}
                    
                    {isOwner({ seller: collectionData.seller } as ProcessedNFT) && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const bundleNFT: ProcessedNFT = {
                            id: `bundle-${selectedCollectionId}`,
                            collectionId: selectedCollectionId,
                            name: collectionData.collectionName,
                            contractAddress: collectionData.nftContract,
                            tokenId: 'bundle',
                            seller: collectionData.seller,
                            price: (Number(collectionData.bundlePrice) / 1e18).toString(),
                            collectionName: collectionData.collectionName,
                            image: collectionItems[0]?.image || '/placeholder.svg',
                            isActive: collectionData.isActive,
                            isBundle: true,
                            collection: collectionData.collectionName.toLowerCase().replace(/\s+/g, '-'),
                            description: `Bundle of ${Number(totalItems)} NFTs`,
                            canPurchase: true,
                          }
                          handleCancelListing(bundleNFT)
                        }}
                        disabled={processingNFT === selectedCollectionId}
                      >
                        Cancel Listing
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Collection Items ({collectionItems.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🔄 Manual refresh of collection items')
                  // Force refresh by changing collection ID
                  const currentId = selectedCollectionId
                  setSelectedCollectionId(null)
                  setTimeout(() => setSelectedCollectionId(currentId), 100)
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Items
              </Button>
            </div>
            
            {loadingCollection ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="aspect-square rounded-lg mb-4" />
                      <Skeleton className="h-4 mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : collectionError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading collection items: {collectionError}
                </AlertDescription>
              </Alert>
            ) : collectionItems.length === 0 ? (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>No items found in this collection.</p>
                    <p className="text-sm">This might be because:</p>
                    <ul className="list-disc ml-4 mt-2 text-sm">
                      <li>The collection is empty</li>
                      <li>Items are still being loaded</li>
                      <li>There was an error fetching item metadata</li>
                      <li>Contract function returned no items</li>
                    </ul>
                    {debug && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">Debug Information</summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(debug, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              // Collection items grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {collectionItems.map((item) => (
                  <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-muted">
                        {item.image && item.image !== '/placeholder.svg' ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder.svg'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {item.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.collectionName}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="w-4 h-4" />
                            <span>{item.views}</span>
                            <Heart className="w-4 h-4" />
                            <span>{item.likes}</span>
                          </div>
                          {item.rarity && (
                            <Badge className={getRarityColor(item.rarity)}>
                              {item.rarity}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="font-bold">{parseFloat(item.price || "0").toFixed(3)} ROSE</p>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {rosePrice ? (
                            `≈ $${((parseFloat(item.price || "0")) * rosePrice).toFixed(2)}`
                          ) : (
                            "Loading..."
                          )}
                        </div>

                        <div className="flex gap-2">
                          {isBundle ? (
                            <Badge variant="outline" className="flex-1 justify-center">
                              Part of Bundle
                            </Badge>
                          ) : (
                            <Button 
                              className="flex-1"
                              onClick={() => handlePurchase(item)}
                              disabled={processingNFT === item.listingId || !item.canPurchase}
                            >
                              {processingNFT === item.listingId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="w-4 h-4" />
                              )}
                              Buy
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ✅ Main Marketplace View - No wallet connection required for viewing

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const fetchRosePrice = async () => {
      const price = await getRosePrice();
      if (price) setRosePrice(price);
    };
    
    fetchRosePrice();
    
    // Cập nhật giá mỗi 5 phút
    const interval = setInterval(fetchRosePrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">Discover and collect extraordinary NFTs</p>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>NFTs: {nfts.filter(n => !n.isBundle).length}</span>
              <span>Collections: {nfts.filter(n => n.isBundle).length}</span>
              <span>Total: {nfts.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "grid" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>

              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      placeholder="Search NFTs..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range (ROSE)</label>
                  <Slider
                    value={stablePriceRange}
                    onValueChange={handlePriceRangeChange}
                    max={1000000}
                    min={0}
                    step={5}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{priceRange[0]} ROSE</span>
                    <span>{priceRange[1]} ROSE</span>
                  </div>
                </div>

                {/* Collections */}
                {uniqueCollections.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Collections</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uniqueCollections.map((collection) => (
                        <div key={collection} className="flex items-center space-x-2">
                          <Checkbox
                            id={`collection-${collection}`}
                            checked={selectedCollection.includes(collection)}
                            onCheckedChange={(checked) => 
                              handleCollectionFilter(collection, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`collection-${collection}`}
                            className="text-sm truncate"
                          >
                            {collection}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rarity */}
                {uniqueRarities.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rarity</label>
                    <div className="space-y-2">
                      {uniqueRarities.map((rarity) => (
                        <div key={rarity} className="flex items-center space-x-2">
                          <Checkbox
                            id={`rarity-${rarity}`}
                            checked={selectedRarity.includes(rarity)}
                            onCheckedChange={(checked) => 
                              handleRarityFilter(rarity, checked as boolean)
                            }
                          />
                          <Label htmlFor={`rarity-${rarity}`} className="text-sm">
                            {rarity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value)} className="mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                  <TabsTrigger value="all">All ({nfts.length})</TabsTrigger>
                  <TabsTrigger value="nfts">
                    <Tag className="w-4 h-4 mr-2" />
                    NFTs ({nfts.filter(n => !n.isBundle).length})
                  </TabsTrigger>
                  <TabsTrigger value="collections">
                    <Package className="w-4 h-4 mr-2" />
                    Collections ({nfts.filter(n => n.isBundle).length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">
                    Showing {filteredNFTs.length} results
                  </p>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recently Listed</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="most-liked">Most Liked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value={selectedTab}>
                {/* Loading State */}
                {loading ? (
                  <div className={`grid gap-6 ${
                    viewMode === "grid" 
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                      : "grid-cols-1"
                  }`}>
                    {[...Array(8)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="h-64 w-full" />
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2 mb-4" />
                          <Skeleton className="h-8 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <Alert className="max-w-md mx-auto">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Error loading marketplace: {error}
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={handleRefresh} 
                      className="mt-4"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Retry'}
                    </Button>
                  </div>
                ) : filteredNFTs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or check back later.
                    </p>
                  </div>
                ) : (
                  /* NFT Grid - Keep existing implementation */
                  <div className={`grid gap-6 ${
                    viewMode === "grid" 
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                      : "grid-cols-1"
                  }`}>
                    {filteredNFTs.map((nft) => (
                      <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                        <div 
                          className={`${
                            viewMode === "grid" ? "aspect-square" : "aspect-video md:aspect-square"
                          } relative cursor-pointer`}
                          onClick={() => {
                            if (nft.isBundle && nft.collectionId) {
                              handleCollectionClick(nft)
                            }
                          }}
                        >
                          <Image
                            src={nft.image || "/placeholder.svg"}
                            alt={nft.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <div className="absolute top-3 right-3 flex flex-col gap-2">
                            <div className="bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {nft.views || 0}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-black/70 text-white hover:bg-black/80 w-8 h-8 p-0 rounded-full"
                            >
                              <Heart className="w-4 h-4" />
                            </Button>
                          </div>
                          {nft.isBundle && (
                            <Badge className="absolute bottom-3 left-3 bg-purple-500 text-white">
                              Bundle ({nft.bundleTokenIds?.length || 0} items)
                            </Badge>
                          )}
                          {nft.rarity && !nft.isBundle && (
                            <Badge className={`absolute bottom-3 right-3 ${getRarityColor(nft.rarity)}`}>
                              {nft.rarity}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm text-muted-foreground">{nft.collectionName}</div>
                            {nft.verified && <Star className="w-3 h-3 text-blue-500 fill-current" />}
                          </div>
                          <h3 className="font-semibold mb-2 truncate">{nft.name}</h3>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm text-muted-foreground">
                                {nft.isBundle ? "Bundle Price" : "Current Price"}
                              </div>
                              <div className="font-bold">{nft.price} ROSE</div>
                              <div className="text-xs text-muted-foreground">
                                {rosePrice ? (
                                  `≈ $${((parseFloat(nft.price || "0")) * rosePrice).toFixed(2)}`
                                ) : (
                                  "Đang tải giá..."
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Seller</div>
                              <div className="text-sm font-mono">
                                {nft.seller ? `${nft.seller.slice(0, 6)}...${nft.seller.slice(-4)}` : 'Unknown'}
                              </div>
                            </div>
                          </div>
                          
                          {nft.isBundle ? (
                            // Bundle Collection Logic
                            isOwner(nft) ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedNFT(nft)
                                    setNewPrice(nft.price?.toString() || "")
                                    setIsEditDialogOpen(true)
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Price
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => handleCancelListing(nft)}
                                  disabled={isProcessing(nft)}
                                >
                                  {isProcessing(nft) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button 
                                  className="flex-1"
                                  onClick={() => handlePurchase(nft)}
                                  disabled={isProcessing(nft) || !nft.canPurchase}
                                >
                                  {isProcessing(nft) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Processing...
                                    </>
                                  ) : !isConnected ? (
                                    <>
                                      <ShoppingCart className="w-4 h-4 mr-2" />
                                      Connect Wallet to Buy
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-4 h-4 mr-2" />
                                      Buy Bundle
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleCollectionClick(nft)}
                                >
                                  <Users className="w-4 h-4" />
                                </Button>
                              </div>
                            )
                          ) : isOwner(nft) ? (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedNFT(nft)
                                  setNewPrice(nft.price?.toString() || "")
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Price
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleCancelListing(nft)}
                                disabled={isProcessing(nft)}
                              >
                                {isProcessing(nft) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              className="w-full" 
                              onClick={() => handlePurchase(nft)}
                              disabled={isProcessing(nft) || !nft.canPurchase}
                            >
                              {isProcessing(nft) ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Processing...
                                </>
                              ) : !isConnected ? (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Connect Wallet to Buy
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Buy Now
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Edit Price Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPrice">New Price (ROSE)</Label>
                <Input
                  id="newPrice"
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Enter new price"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePrice}
                  disabled={processingNFT === getNFTId(selectedNFT || {} as ProcessedNFT) || !newPrice}
                >
                  {processingNFT === getNFTId(selectedNFT || {} as ProcessedNFT) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Price'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}