"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, AlertCircle, Loader2, Upload, ImageIcon, CheckCircle , ExternalLink} from "lucide-react"
import { ProcessedNFT } from "@/interfaces/nft"
import Image from "next/image"
import { UploadService } from "@/services/pinata"
import Link from "next/link"
interface CollectionSelectorProps {
  nfts: ProcessedNFT[]
  onClose: () => void
  onSell: (data: CollectionSellData) => void
  isLoading?: boolean
  // ✅ Sửa type để match với TransactionStatus trong page.tsx
  transactionStatus?: 'idle' | 'pending' | 'confirming' | 'success' | 'error' | 'waiting_approval' | 'approval_success'
  lastTransactionHash?: string
}

export interface CollectionSellData {
  nftContract: string
  tokenIds: string[]
  listingType: 'bundle' | 'individual' | 'same-price'
  bundlePrice?: string
  individualPrices?: string[]
  samePricePerItem?: string
  collectionName: string
  collectionImage?: string // IPFS URL
  collectionDescription?: string
}

export default function CollectionSelector({ 
  nfts, 
  onClose, 
  onSell, 
  isLoading,
  transactionStatus = 'idle',
  lastTransactionHash
}: CollectionSelectorProps) {
  const [selectedNFTs, setSelectedNFTs] = useState<ProcessedNFT[]>([])
  const [listingType, setListingType] = useState<'bundle' | 'individual' | 'same-price'>('bundle')
  const [bundlePrice, setBundlePrice] = useState("")
  const [individualPrices, setIndividualPrices] = useState<{[key: string]: string}>({})
  const [samePricePerItem, setSamePricePerItem] = useState("")
  const [collectionName, setCollectionName] = useState("")
  const [collectionImage, setCollectionImage] = useState("")
  const [collectionDescription, setCollectionDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [, setSelectedCoverImage] = useState<File | null>(null)

  // Group NFTs by contract address
  const nftsByContract = nfts.reduce((acc, nft) => {
    if (!acc[nft.contractAddress]) {
      acc[nft.contractAddress] = []
    }
    acc[nft.contractAddress].push(nft)
    return acc
  }, {} as Record<string, ProcessedNFT[]>)

  const contractAddresses = Object.keys(nftsByContract)

  // Check if selected NFTs are from same contract
  const selectedContracts = [...new Set(selectedNFTs.map(nft => nft.contractAddress))]
  const isValidSelection = selectedContracts.length <= 1 && selectedNFTs.length > 1

  const handleNFTToggle = (nft: ProcessedNFT, checked: boolean) => {
    if (checked) {
      setSelectedNFTs(prev => [...prev, nft])
    } else {
      setSelectedNFTs(prev => prev.filter(n => n.id !== nft.id))
      // Remove individual price if deselected
      if (listingType === 'individual') {
        setIndividualPrices(prev => {
          const newPrices = { ...prev }
          delete newPrices[nft.tokenId]
          return newPrices
        })
      }
    }
  }

  const handleSelectAllFromContract = (contractAddress: string) => {
    const contractNFTs = nftsByContract[contractAddress]
    const allSelected = contractNFTs.every(nft => 
      selectedNFTs.some(selected => selected.id === nft.id)
    )

    if (allSelected) {
      // Deselect all from this contract
      setSelectedNFTs(prev => prev.filter(nft => nft.contractAddress !== contractAddress))
    } else {
      // Clear previous selection and select all from this contract
      setSelectedNFTs(contractNFTs)
    }
  }

  const handleIndividualPriceChange = (tokenId: string, price: string) => {
    setIndividualPrices(prev => ({
      ...prev,
      [tokenId]: price
    }))
  }

  // Handle cover image upload - hiển thị ảnh ngay, upload IPFS sau
  const handleCoverImageUpload = async (file: File) => {
    try {
      // 1. Hiển thị ảnh ngay lập tức từ local preview
      const localPreview = URL.createObjectURL(file)
      setCollectionImage(localPreview) // Hiển thị ảnh ngay
      
      setUploading(true)
      console.log('📤 Uploading cover image to IPFS...')
      
      // 2. Upload lên IPFS trong background
      const ipfsUrl = await UploadService.uploadFileToIPFS(file)
      console.log('✅ Cover image uploaded to IPFS:', ipfsUrl)
      
      // 3. Cập nhật với IPFS URL thật sự
      setCollectionImage(ipfsUrl)
      
      // Clean up local preview
      URL.revokeObjectURL(localPreview)
      
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert('Failed to upload cover image to IPFS. Please try again.')
      
      // Reset về empty nếu upload fail
      setCollectionImage('')
    } finally {
      setUploading(false)
    }
  }

  const handleSell = () => {
    if (!isValidSelection || !collectionName.trim()) return

    const sellData: CollectionSellData = {
      nftContract: selectedNFTs[0].contractAddress,
      tokenIds: selectedNFTs.map(nft => nft.tokenId),
      listingType,
      collectionName: collectionName.trim(),
      collectionImage: collectionImage || undefined,
      collectionDescription: collectionDescription.trim() || undefined
    }

    if (listingType === 'bundle') {
      if (!bundlePrice || parseFloat(bundlePrice) <= 0) return
      sellData.bundlePrice = bundlePrice
    } else if (listingType === 'individual') {
      const prices = selectedNFTs.map(nft => individualPrices[nft.tokenId])
      if (prices.some(price => !price || parseFloat(price) <= 0)) return
      sellData.individualPrices = prices
    } else if (listingType === 'same-price') {
      if (!samePricePerItem || parseFloat(samePricePerItem) <= 0) return
      sellData.samePricePerItem = samePricePerItem
    }

    onSell(sellData)
  }

  const isFormValid = () => {
    // ✅ Không cho submit nếu đang success
    if (transactionStatus === 'success') return false
    
    if (!isValidSelection || !collectionName.trim()) return false

    if (listingType === 'bundle') {
      return bundlePrice && parseFloat(bundlePrice) > 0
    } else if (listingType === 'individual') {
      return selectedNFTs.every(nft => {
        const price = individualPrices[nft.tokenId]
        return price && parseFloat(price) > 0
      })
    } else if (listingType === 'same-price') {
      return samePricePerItem && parseFloat(samePricePerItem) > 0
    }
    return false
  }

  // ✅ Thêm function để reset form khi thành công
  const handleCreateAnother = () => {
    setSelectedNFTs([])
    setListingType('bundle')
    setBundlePrice("")
    setIndividualPrices({})
    setSamePricePerItem("")
    setCollectionName("")
    setCollectionImage("")
    setCollectionDescription("")
    setSelectedCoverImage(null)
    
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* ✅ Success Popup - hiển thị khi success */}
      {transactionStatus === 'success' && lastTransactionHash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="max-w-md w-full mx-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onClose} // ✅ Vẫn giữ để có thể đóng hoàn toàn
            >
              <X className="w-4 h-4" />
            </Button>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Collection Listed Successfully! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                Your collection has been listed on the marketplace and is now available for purchase.
              </p>
              <div className="bg-muted p-3 rounded mb-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                <p className="text-sm font-medium break-all">{lastTransactionHash}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    window.open(`https://testnet.explorer.sapphire.oasis.dev/tx/${lastTransactionHash}`, "_blank")
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateAnother} // ✅ Chỉ reset form, không đóng
                >
                  List Another
                </Button>
              </div>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  asChild
                >
                  <Link href="/marketplace">
                    View in Marketplace
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">List Collection</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* ✅ Status notification - hiển thị cho tất cả trạng thái trừ idle */}
          {transactionStatus !== 'idle' && (
            <div className={`mb-6 p-4 rounded-lg border ${
              transactionStatus === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className={`flex items-center gap-2 ${
                transactionStatus === 'success' 
                  ? 'text-green-700' 
                  : 'text-blue-700'
              }`}>
                {transactionStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span className="text-sm font-medium">
                  {transactionStatus === 'success' 
                    ? 'Collection listed successfully! You can list another collection or close this dialog.' 
                    : transactionStatus === 'pending'
                    ? 'Waiting for confirmation...'
                    : transactionStatus === 'confirming'
                    ? 'Confirming on blockchain...'
                    : 'Processing collection transaction...'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Existing collection form content */}
          <div className="space-y-6">
            {/* Contract Selection Warning */}
            {selectedContracts.length > 1 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  NFTs must be from the same contract to list as a collection. Please select NFTs from only one contract.
                </AlertDescription>
              </Alert>
            )}

            {/* Collection Details */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="collection-name">Collection Name *</Label>
                  <Input
                    id="collection-name"
                    placeholder="Enter collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    disabled={transactionStatus === 'success'} // ✅ Disable khi success
                  />
                </div>

                <div>
                  <Label htmlFor="collection-description">Collection Description</Label>
                  <Textarea
                    id="collection-description"
                    placeholder="Describe your collection (optional)"
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    disabled={transactionStatus === 'success'} // ✅ Disable khi success
                  />
                </div>

                <div>
                  <Label>Collection Cover Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex-1">
                      {collectionImage ? (
                        <div className="relative h-32 mb-2">
                          <Image
                            src={collectionImage}
                            alt="Collection cover"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      )}
                      <Button 
                        variant="outline" 
                        disabled={uploading}
                        onClick={() => document.getElementById('collection-image-upload')?.click()}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading to IPFS...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {collectionImage ? 'Change Cover Image' : 'Upload Cover Image'}
                          </>
                        )}
                      </Button>
                      <input
                        id="collection-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setSelectedCoverImage(file)
                            handleCoverImageUpload(file)
                          }
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload a cover image for your collection. This will be stored on IPFS and shown in the marketplace.
                  </p>
                </div>

                <div>
                  <Label>Listing Type</Label>
                  <Select value={listingType} onValueChange={(value) => setListingType(value as 'bundle' | 'individual' | 'same-price')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bundle">Bundle Sale (One price for all)</SelectItem>
                      <SelectItem value="individual">Individual Sale (Price per NFT)</SelectItem>
                      <SelectItem value="same-price">Same Price for All (Each NFT same price)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {listingType === 'bundle' && (
                  <div>
                    <Label htmlFor="bundle-price">Bundle Price (ROSE) *</Label>
                    <Input
                      id="bundle-price"
                      type="number"
                      step="0.001"
                      placeholder="0.00"
                      value={bundlePrice}
                      onChange={(e) => setBundlePrice(e.target.value)}
                    />
                  </div>
                )}

                {listingType === 'same-price' && (
                  <div>
                    <Label htmlFor="same-price">Price per NFT (ROSE) *</Label>
                    <Input
                      id="same-price"
                      type="number"
                      step="0.001"
                      placeholder="0.00"
                      value={samePricePerItem}
                      onChange={(e) => setSamePricePerItem(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Each NFT will be listed at this price
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NFT Selection by Contract */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select NFTs ({selectedNFTs.length} selected)</h3>
              
              {contractAddresses.map(contractAddress => {
                const contractNFTs = nftsByContract[contractAddress]
                const contractName = contractNFTs[0]?.collection || `Contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
                const selectedFromContract = selectedNFTs.filter(nft => nft.contractAddress === contractAddress).length

                return (
                  <Card key={contractAddress}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{contractName}</CardTitle>
                          <p className="text-sm text-muted-foreground font-mono">
                            {contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {selectedFromContract}/{contractNFTs.length} selected
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectAllFromContract(contractAddress)}
                            disabled={transactionStatus === 'success'} // ✅ Disable khi success
                          >
                            {selectedFromContract === contractNFTs.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {contractNFTs.map(nft => {
                          const isSelected = selectedNFTs.some(selected => selected.id === nft.id)
                          
                          return (
                            <div key={nft.id} className="space-y-2">
                              <div className={`relative border-2 rounded-lg overflow-hidden ${
                                isSelected ? 'border-primary' : 'border-muted'
                              }`}>
                                <div className="aspect-square relative">
                                  <Image
                                    src={nft.image || "/assets/nft.jpg"}
                                    alt={nft.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                    className="object-cover"
                                  />
                                  <div className="absolute top-2 left-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleNFTToggle(nft, checked as boolean)}
                                      className="bg-white/80"
                                      disabled={transactionStatus === 'success'} // ✅ Disable khi success
                                    />
                                  </div>
                                </div>
                                <div className="p-2">
                                  <p className="text-sm font-medium truncate">{nft.name}</p>
                                  <p className="text-xs text-muted-foreground">#{nft.tokenId}</p>
                                  <p className="text-xs text-blue-600">IPFS: {nft.image ? '✅' : '❌'}</p>
                                </div>
                              </div>

                              {/* Individual Price Input */}
                              {isSelected && listingType === 'individual' && (
                                <Input
                                  type="number"
                                  step="0.001"
                                  placeholder="Price (ROSE)"
                                  value={individualPrices[nft.tokenId] || ""}
                                  onChange={(e) => handleIndividualPriceChange(nft.tokenId, e.target.value)}
                                  className="text-sm"
                                  disabled={transactionStatus === 'success'} // ✅ Disable khi success
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedNFTs.length > 0 && (
                <span>
                  {selectedNFTs.length} NFTs selected • Cover Image: {collectionImage ? 'IPFS ✅' : 'Not uploaded'}
                  {listingType === 'bundle' && bundlePrice && (
                    <span> • Bundle: {bundlePrice} ROSE</span>
                  )}
                  {listingType === 'individual' && (
                    <span> • Individual pricing</span>
                  )}
                  {listingType === 'same-price' && samePricePerItem && (
                    <span> • {samePricePerItem} ROSE each</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                {transactionStatus === 'success' ? 'Close' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleSell}
                disabled={!isFormValid() || isLoading || transactionStatus === 'success'} // ✅ Disable khi success
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : transactionStatus === 'success' ? (
                  'Listed Successfully!'
                ) : (
                  'List Collection'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}