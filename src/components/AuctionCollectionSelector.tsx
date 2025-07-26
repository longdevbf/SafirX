/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Gavel, 
  Clock, 
  Users, 
  Package, 
  Image as ImageIcon,
  Upload,
  AlertCircle, 
  Info,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"
import Image from "next/image"
import { ProcessedNFT } from "@/interfaces/nft"

// ✅ Collection auction data interface
export interface CollectionAuctionData {
  nftContract: string
  tokenIds: string[]
  collectionName: string
  collectionDescription: string
  collectionImage: string // ✅ NEW: Collection representative image
  collectionImageDriveId?: string // ✅ NEW: For tracking upload
  startingPrice: string
  reservePrice: string
  minBidIncrement: string
  duration: number // ✅ In hours, not seconds
  allowPublicReveal: boolean
  title: string
  description: string
}

interface Props {
  nfts: ProcessedNFT[]
  isLoading: boolean
  onClose: () => void
  onCreateAuction: (data: CollectionAuctionData) => Promise<void>
}

export default function AuctionCollectionSelector({
  nfts,
  isLoading,
  onClose,
  onCreateAuction
}: Props) {
  // Collection selection
  const [selectedContract, setSelectedContract] = useState<string>("")
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
  const [collectionName, setCollectionName] = useState("")
  const [collectionDescription, setCollectionDescription] = useState("")
  
  // ✅ NEW: Image selection state
  const [collectionImage, setCollectionImage] = useState<string>("")
  const [collectionImageFile, setCollectionImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [useFirstNFTImage, setUseFirstNFTImage] = useState(true)

  // Auction parameters
  const [startingPrice, setStartingPrice] = useState("")
  const [reservePrice, setReservePrice] = useState("")
  const [minBidIncrement, setMinBidIncrement] = useState("0.1")
  const [duration, setDuration] = useState(24) // hours
  const [allowPublicReveal, setAllowPublicReveal] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // ✅ Group NFTs by contract
  const nftsByContract = nfts.reduce((acc, nft) => {
    if (!acc[nft.contractAddress]) {
      acc[nft.contractAddress] = []
    }
    acc[nft.contractAddress].push(nft)
    return acc
  }, {} as Record<string, ProcessedNFT[]>)

  const contractOptions = Object.entries(nftsByContract)

  // ✅ Get NFTs for selected contract
  const selectedContractNfts = selectedContract ? nftsByContract[selectedContract] || [] : []

  // ✅ Handle contract selection
  const handleContractSelect = (contractAddress: string) => {
    setSelectedContract(contractAddress)
    setSelectedTokens(new Set())
    
    // Auto-generate collection name from first NFT
    const firstNft = nftsByContract[contractAddress]?.[0]
    if (firstNft) {
      setCollectionName(firstNft.collectionName || `${firstNft.name} Collection`)
      
      // ✅ Auto-set first NFT image as collection image if enabled
      if (useFirstNFTImage && firstNft.image) {
        setCollectionImage(firstNft.image)
        setImagePreview(firstNft.image)
      }
    }
  }

  // ✅ Handle token selection
  const handleTokenSelect = (tokenId: string, checked: boolean) => {
    const newSelected = new Set(selectedTokens)
    if (checked) {
      newSelected.add(tokenId)
    } else {
      newSelected.delete(tokenId)
    }
    setSelectedTokens(newSelected)
  }

  // ✅ Helper function to get the first selected NFT (by token ID order)
  const getFirstSelectedNFT = useCallback(() => {
    if (selectedTokens.size === 0) return null
    
    // Convert selectedTokens to array and sort by tokenId to get consistent "first" NFT
    const sortedSelectedTokens = Array.from(selectedTokens).sort((a, b) => parseInt(a) - parseInt(b))
    const firstTokenId = sortedSelectedTokens[0]
    
    return selectedContractNfts.find(nft => nft.tokenId === firstTokenId)
  }, [selectedTokens, selectedContractNfts])

  // ✅ Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('Image file too large. Please select a file under 10MB.')
      return
    }

    setCollectionImageFile(file)
    setUseFirstNFTImage(false)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  // ✅ Upload image to server
  const uploadCollectionImage = async (): Promise<{ url: string; driveId?: string }> => {
    if (useFirstNFTImage && collectionImage) {
      // Use first NFT image - no upload needed
      return { url: collectionImage }
    }

    if (!collectionImageFile) {
      throw new Error('No image file selected')
    }

    setIsUploadingImage(true)

    try {
      // ✅ TEMPORARY FIX: Skip upload and use placeholder for testing
      console.log('⚠️ TEMPORARY: Skipping image upload for testing')
      return {
        url: collectionImage || '/placeholder.svg',
        driveId: 'temp_' + Date.now()
      }

      /* ORIGINAL UPLOAD CODE - UNCOMMENT WHEN FIXED
      const formData = new FormData()
      formData.append('file', collectionImageFile)
      formData.append('type', 'collection')
      formData.append('name', `collection_${Date.now()}_${collectionName.replace(/\s+/g, '_')}`)

      const response = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        console.log('✅ Collection image uploaded:', result.ipfsUrl)
        return { 
          url: result.ipfsUrl, 
          driveId: result.ipfsHash 
        }
      } else {
        throw new Error(result.error || 'Failed to upload image')
      }
      */

    } catch (error) {
      console.error('❌ Image upload failed:', error)
      throw error
    } finally {
      setIsUploadingImage(false)
    }
  }

  // ✅ Validate form
  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!selectedContract) errors.push("Please select a collection contract")
    if (selectedTokens.size < 2) errors.push("Please select at least 2 NFTs for collection auction")
    if (selectedTokens.size > 100) errors.push("Maximum 100 NFTs allowed per collection auction")
    if (!collectionName.trim()) errors.push("Collection name is required")
    if (!title.trim()) errors.push("Auction title is required")
    if (!startingPrice || parseFloat(startingPrice) <= 0) errors.push("Valid starting price is required")
    if (!reservePrice || parseFloat(reservePrice) < parseFloat(startingPrice || "0")) {
      errors.push("Reserve price must be greater than or equal to starting price")
    }
    if (!minBidIncrement || parseFloat(minBidIncrement) <= 0) errors.push("Valid minimum bid increment is required")
    if (duration < 1 || duration > 720) errors.push("Duration must be between 1 and 720 hours")
    
    // Image validation
    if (!useFirstNFTImage && !collectionImageFile && !collectionImage) {
      errors.push("Please select a collection image or use first NFT image")
    }

    return errors
  }

  // ✅ Handle form submission
  const handleCreateAuction = async () => {
    const errors = validateForm()
    setValidationErrors(errors)

    if (errors.length > 0) {
      setCurrentStep(1) // Go back to first step to show errors
      return
    }

    try {
      // Upload image first
      const imageData = await uploadCollectionImage()

      const auctionData: CollectionAuctionData = {
        nftContract: selectedContract,
        tokenIds: Array.from(selectedTokens),
        collectionName,
        collectionDescription,
        collectionImage: imageData.url,
        collectionImageDriveId: imageData.driveId,
        startingPrice,
        reservePrice,
        minBidIncrement,
        duration: duration, // ✅ Bỏ * 3600, hook sẽ convert
        allowPublicReveal,
        title,
        description
      }

      console.log('🎯 Creating collection auction with data:', auctionData)

      await onCreateAuction(auctionData)

    } catch (error) {
      console.error('❌ Failed to create collection auction:', error)
      alert(`Failed to create auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ✅ Auto-fill auction title
  useEffect(() => {
    if (collectionName && selectedTokens.size > 0) {
      setTitle(`${collectionName} Collection Auction (${selectedTokens.size} NFTs)`)
    }
  }, [collectionName, selectedTokens.size])

  // ✅ Auto-fill description
  useEffect(() => {
    if (collectionName && selectedTokens.size > 0) {
      setDescription(`Sealed bid auction for a collection of ${selectedTokens.size} NFTs from ${collectionName}. Highest bidder wins the entire collection.`)
    }
  }, [collectionName, selectedTokens.size])

  // ✅ Auto-update collection image when selected tokens change and useFirstNFTImage is enabled
  useEffect(() => {
    if (useFirstNFTImage && selectedTokens.size > 0) {
      const firstSelectedNFT = getFirstSelectedNFT()
      if (firstSelectedNFT?.image) {
        setCollectionImage(firstSelectedNFT.image)
        setImagePreview(firstSelectedNFT.image)
      }
    }
  }, [selectedTokens, useFirstNFTImage, getFirstSelectedNFT])

  if (contractOptions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No NFTs Available</h3>
        <p className="text-muted-foreground mb-4">
          You need at least 2 NFTs from the same collection to create a collection auction.
        </p>
        <Button onClick={onClose} variant="outline">Close</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="w-6 h-6" />
            Create Collection Auction
          </h2>
          <p className="text-muted-foreground">
            Bundle multiple NFTs from the same collection into a single sealed bid auction
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of 3
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        {[
          { step: 1, title: "Select NFTs", icon: Package },
          { step: 2, title: "Collection Details", icon: ImageIcon },
          { step: 3, title: "Auction Settings", icon: Gavel }
        ].map(({ step, title, icon: Icon }) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step ? '✓' : step}
            </div>
            <span className={`ml-2 text-sm ${currentStep >= step ? 'text-blue-600' : 'text-gray-500'}`}>
              {title}
            </span>
            {step < 3 && <div className="w-8 h-0.5 bg-gray-200 ml-4" />}
          </div>
        ))}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Please fix the following errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Select NFTs */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select NFT Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contract Selection */}
            <div>
              <Label>Choose Collection Contract</Label>
              <Select value={selectedContract} onValueChange={handleContractSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select NFT collection contract" />
                </SelectTrigger>
                <SelectContent>
                  {contractOptions.map(([contractAddress, contractNfts]) => (
                    <SelectItem key={contractAddress} value={contractAddress}>
                      <div className="flex items-center gap-2">
                        <span>{contractNfts[0]?.collectionName || 'Unknown Collection'}</span>
                        <Badge variant="secondary">{contractNfts.length} NFTs</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* NFT Selection */}
            {selectedContract && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Select NFTs ({selectedTokens.size} selected)</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTokens(new Set(selectedContractNfts.map(nft => nft.tokenId)))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTokens(new Set())}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {selectedContractNfts.map((nft) => (
                    <div key={nft.tokenId} className="relative">
                      <div className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedTokens.has(nft.tokenId)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="aspect-square relative">
                          <Image
                            src={nft.image || '/placeholder-nft.jpg'}
                            alt={nft.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox
                              checked={selectedTokens.has(nft.tokenId)}
                              onCheckedChange={(checked) => handleTokenSelect(nft.tokenId, !!checked)}
                              className="bg-white"
                            />
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="font-medium text-sm truncate">{nft.name}</div>
                          <div className="text-xs text-muted-foreground">#{nft.tokenId}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={selectedTokens.size < 2}
              >
                Next: Collection Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Collection Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Collection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Collection Name */}
            <div>
              <Label htmlFor="collection-name">Collection Name *</Label>
              <Input
                id="collection-name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Enter collection name"
              />
            </div>

            {/* Collection Description */}
            <div>
              <Label htmlFor="collection-description">Collection Description</Label>
              <Textarea
                id="collection-description"
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                placeholder="Describe your NFT collection..."
                rows={3}
              />
            </div>

            {/* Collection Image Selection */}
            <div>
              <Label>Collection Representative Image *</Label>
              
              {/* Image source option */}
              <div className="mt-2 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="use-first-nft"
                    checked={useFirstNFTImage}
                    onCheckedChange={(checked) => {
                      setUseFirstNFTImage(!!checked)
                      if (checked) {
                        const firstSelectedNFT = getFirstSelectedNFT()
                        if (firstSelectedNFT?.image) {
                          setCollectionImage(firstSelectedNFT.image)
                          setImagePreview(firstSelectedNFT.image)
                          setCollectionImageFile(null)
                        }
                      }
                    }}
                  />
                  <Label htmlFor="use-first-nft" className="text-sm">
                    Use first selected NFT image as collection image
                    {selectedTokens.size > 0 && (
                      <span className="text-muted-foreground ml-1">
                        (Token #{Array.from(selectedTokens).sort((a, b) => parseInt(a) - parseInt(b))[0]})
                      </span>
                    )}
                  </Label>
                </div>

                {!useFirstNFTImage && (
                  <div>
                    <Label htmlFor="collection-image">Upload Custom Image</Label>
                    <div className="mt-2">
                      <input
                        id="collection-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('collection-image')?.click()}
                        className="w-full"
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Select Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div>
                    <Label>Preview</Label>
                    <div className="mt-2 w-32 h-32 border rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Collection preview"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={!collectionName.trim() || (!useFirstNFTImage && !collectionImageFile && !collectionImage)}
              >
                Next: Auction Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Auction Settings */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5" />
              Auction Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auction Title */}
            <div>
              <Label htmlFor="title">Auction Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter auction title"
              />
            </div>

            {/* Auction Description */}
            <div>
              <Label htmlFor="description">Auction Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your auction..."
                rows={3}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="starting-price">Starting Price (ROSE) *</Label>
                <Input
                  id="starting-price"
                  type="number"
                  step="0.001"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="reserve-price">Reserve Price (ROSE) *</Label>
                <Input
                  id="reserve-price"
                  type="number"
                  step="0.001"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="min-increment">Min Bid Increment (ROSE) *</Label>
                <Input
                  id="min-increment"
                  type="number"
                  step="0.001"
                  value={minBidIncrement}
                  onChange={(e) => setMinBidIncrement(e.target.value)}
                  placeholder="0.1"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Auction Duration (hours) *</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                  <SelectItem value="72">72 hours (3 days)</SelectItem>
                  <SelectItem value="168">168 hours (1 week)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Public Reveal Option */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowPublicReveal"
                  checked={allowPublicReveal}
                  onCheckedChange={(checked) => setAllowPublicReveal(!!checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="allowPublicReveal" className="font-medium text-blue-900 flex items-center gap-2">
                    {allowPublicReveal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Allow Public Bid History
                  </Label>
                  <p className="text-sm text-blue-700 mt-1">
                    After the auction ends, you can choose to make all bid amounts and bidders public for transparency. 
                    This setting enables the option - you can still decide later whether to reveal the bids.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ✨ Recommended: This builds trust and transparency with bidders
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Auction Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Collection: <span className="font-medium">{collectionName}</span></div>
                <div>NFTs: <span className="font-medium">{selectedTokens.size}</span></div>
                <div>Starting Price: <span className="font-medium">{startingPrice} ROSE</span></div>
                <div>Reserve Price: <span className="font-medium">{reservePrice} ROSE</span></div>
                <div>Duration: <span className="font-medium">{duration} hours</span></div>
                <div>Public Reveal: <span className="font-medium">{allowPublicReveal ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleCreateAuction}
                disabled={isLoading || isUploadingImage}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Auction...
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4 mr-2" />
                    Create Collection Auction
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
