"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {  AlertCircle, Loader2, Gavel, CheckCircle } from "lucide-react"
import { ProcessedNFT } from "@/interfaces/nft"
import { useCollectionAuctionApproval } from "@/hooks/use-collection-auction-approval"
import { useWallet } from "@/context/walletContext"
import Image from "next/image"

interface AuctionCollectionSelectorProps {
  nfts: ProcessedNFT[]
  onClose: () => void
  onCreateAuction: (data: CollectionAuctionData) => void
  isLoading?: boolean
}

export interface CollectionAuctionData {
  nftContract: string
  tokenIds: string[]
  startingPrice: string
  reservePrice: string
  minBidIncrement: string
  duration: number
  allowPublicReveal: boolean
  title: string
  description: string
}

export default function AuctionCollectionSelector({ nfts, onClose, onCreateAuction, isLoading }: AuctionCollectionSelectorProps) {
  const { address } = useWallet()
  const [selectedNFTs, setSelectedNFTs] = useState<ProcessedNFT[]>([])
  const [startingPrice, setStartingPrice] = useState("")
  const [reservePrice, setReservePrice] = useState("")
  const [minBidIncrement, setMinBidIncrement] = useState("0.1")
  const [duration, setDuration] = useState(1) // ✅ Changed default from 24 to 1 hour
  const [allowPublicReveal, setAllowPublicReveal] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // Get the contract address from selected NFTs
  const selectedContract = selectedNFTs.length > 0 ? selectedNFTs[0].contractAddress : ''
  
  // Use approval hook for the selected contract
  const {
    isApproved,
    approveForAuction,
    refetchApproval,
    hash: approvalHash,
    isPending: isApprovalPending,
    isConfirming: isApprovalConfirming,
    isConfirmed: isApprovalConfirmed,
    error: approvalError
  } = useCollectionAuctionApproval(selectedContract, address)
  console.log('Approval Error:', approvalError)
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

  // Handle approval success
  React.useEffect(() => {
    if (isApprovalConfirmed && approvalHash) {
      refetchApproval()
    }
  }, [isApprovalConfirmed, approvalHash, refetchApproval])

  const handleNFTToggle = (nft: ProcessedNFT, checked: boolean) => {
    if (checked) {
      setSelectedNFTs(prev => [...prev, nft])
    } else {
      setSelectedNFTs(prev => prev.filter(n => n.id !== nft.id))
    }
  }

  const handleSelectAllFromContract = (contractAddress: string) => {
    const contractNFTs = nftsByContract[contractAddress]
    const allSelected = contractNFTs.every(nft => 
      selectedNFTs.some(selected => selected.id === nft.id)
    )

    if (allSelected) {
      setSelectedNFTs(prev => prev.filter(nft => nft.contractAddress !== contractAddress))
    } else {
      setSelectedNFTs(contractNFTs)
    }
  }

  const handleCreateAuction = async () => {
    if (!isValidSelection || !title.trim() || !startingPrice || !reservePrice) return

    // Check approval first
    if (!isApproved) {
      try {
        await approveForAuction()
        return // Wait for approval to complete
      } catch (error) {
        console.error('Approval failed:', error)
        return
      }
    }

    const auctionData: CollectionAuctionData = {
      nftContract: selectedNFTs[0].contractAddress,
      tokenIds: selectedNFTs.map(nft => nft.tokenId),
      startingPrice,
      reservePrice,
      minBidIncrement,
      duration: duration * 3600, // Convert hours to seconds
      allowPublicReveal,
      title,
      description
    }

    onCreateAuction(auctionData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          Create Collection Auction
        </h2>
      </div>

      {/* Selection Summary */}
      {selectedNFTs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected NFTs ({selectedNFTs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {selectedNFTs.map(nft => (
                <div key={nft.id} className="relative">
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    width={60}
                    height={60}
                    className="rounded-lg object-cover"
                  />
                  <Badge className="absolute -top-1 -right-1 text-xs px-1">
                    #{nft.tokenId}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NFT Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select NFTs for Auction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contractAddresses.map(contractAddress => (
            <div key={contractAddress} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllFromContract(contractAddress)}
                >
                  Select All ({nftsByContract[contractAddress].length})
                </Button>
              </div>
              
              <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                {nftsByContract[contractAddress].map(nft => (
                  <div key={nft.id} className="relative">
                    <div className="aspect-square relative">
                      <Image
                        src={nft.image}
                        alt={nft.name}
                        fill
                        className="rounded-lg object-cover"
                      />
                      <Checkbox
                        checked={selectedNFTs.some(selected => selected.id === nft.id)}
                        onCheckedChange={(checked) => handleNFTToggle(nft, checked as boolean)}
                        className="absolute top-1 right-1 bg-white"
                      />
                    </div>
                    <Badge className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs">
                      #{nft.tokenId}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auction Details */}
      {isValidSelection && (
        <Card>
          <CardHeader>
            <CardTitle>Auction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Auction Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter auction title"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="1"
                  max="720"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startingPrice">Starting Price (ROSE) *</Label>
                <Input
                  id="startingPrice"
                  type="number"
                  step="0.01"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="reservePrice">Reserve Price (ROSE) *</Label>
                <Input
                  id="reservePrice"
                  type="number"
                  step="0.01"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="minBidIncrement">Minimum Bid Increment (ROSE)</Label>
              <Input
                id="minBidIncrement"
                type="number"
                step="0.01"
                value={minBidIncrement}
                onChange={(e) => setMinBidIncrement(e.target.value)}
                placeholder="0.1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Describe your collection auction..."
              />
            </div>

            {/* Public Reveal Option - Made more prominent */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowPublicReveal"
                  checked={allowPublicReveal}
                  onCheckedChange={(checked) => setAllowPublicReveal(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="allowPublicReveal" className="font-medium text-blue-900">
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
          </CardContent>
        </Card>
      )}

      {/* Validation Alerts */}
      {selectedNFTs.length > 0 && !isValidSelection && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select at least 2 NFTs from the same contract to create a collection auction.
          </AlertDescription>
        </Alert>
      )}

      {/* Approval Status */}
      {selectedContract && isValidSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contract Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isApproved ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">
                    Contract approved for auction
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-600 font-medium">
                    Contract needs approval for auction
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        
        {selectedContract && isValidSelection && !isApproved ? (
          <Button
            onClick={approveForAuction}
            disabled={isApprovalPending || isApprovalConfirming || isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isApprovalPending || isApprovalConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isApprovalPending ? 'Approve...' : 'Confirming...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve for Auction
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleCreateAuction}
            disabled={!isValidSelection || !title.trim() || !startingPrice || !reservePrice || isLoading || !isApproved}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Auction...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4 mr-2" />
                Create Collection Auction
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
