"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Package, AlertCircle, Loader2 } from "lucide-react"
import { ProcessedNFT } from "@/interfaces/nft"
import Image from "next/image"

interface CollectionSelectorProps {
  nfts: ProcessedNFT[]
  onClose: () => void
  onSell: (data: CollectionSellData) => void
  isLoading?: boolean
}

export interface CollectionSellData {
  nftContract: string
  tokenIds: string[]
  listingType: 'bundle' | 'individual' | 'same-price'
  bundlePrice?: string
  individualPrices?: string[]
  samePricePerItem?: string
  collectionName: string
}

export default function CollectionSelector({ nfts, onClose, onSell, isLoading }: CollectionSelectorProps) {
  const [selectedNFTs, setSelectedNFTs] = useState<ProcessedNFT[]>([])
  const [listingType, setListingType] = useState<'bundle' | 'individual' | 'same-price'>('bundle')
  const [bundlePrice, setBundlePrice] = useState("")
  const [individualPrices, setIndividualPrices] = useState<{[key: string]: string}>({})
  const [samePricePerItem, setSamePricePerItem] = useState("")
  const [collectionName, setCollectionName] = useState("")

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

  const handleSell = () => {
    if (!isValidSelection || !collectionName.trim()) return

    const sellData: CollectionSellData = {
      nftContract: selectedNFTs[0].contractAddress,
      tokenIds: selectedNFTs.map(nft => nft.tokenId),
      listingType,
      collectionName: collectionName.trim()
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">List Collection</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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
                  />
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
                                    className="object-cover"
                                  />
                                  <div className="absolute top-2 left-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleNFTToggle(nft, checked as boolean)}
                                      className="bg-white/80"
                                    />
                                  </div>
                                </div>
                                <div className="p-2">
                                  <p className="text-sm font-medium truncate">{nft.name}</p>
                                  <p className="text-xs text-muted-foreground">#{nft.tokenId}</p>
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
                  {selectedNFTs.length} NFTs selected
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSell} 
                disabled={!isFormValid() || isLoading}
                className="min-w-24"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Listing...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    List Collection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}