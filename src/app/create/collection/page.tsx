"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
//import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { 
  Upload, 
  X, 
  Info, 
  ArrowLeft, 
  ImageIcon, 
  Music, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useNFTContract } from "@/hooks/use-nftContract"
import { UploadService } from "@/services/pinata"
import { NFT_CONTRACT_CONFIG } from "@/lib/contracts/nft-types"
import { useWallet } from "@/context/walletContext"

interface NFTItem {
  id: string
  file: File
  preview: string
  name: string
  description: string
  properties: Array<{ trait_type: string; value: string }>
}

interface MintCollectionParams {
  name: string
  description: string
  externalLink?: string
  properties?: Array<{ trait_type: string; value: string }>
  creatorAddress?: string
}

export default function MintCollectionPage() {
  const [nftItems, setNftItems] = useState<NFTItem[]>([])
  const [collectionName, setCollectionName] = useState("")
  const [collectionDescription, setCollectionDescription] = useState("")
  const [baseExternalLink, setBaseExternalLink] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'minting' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)

  const { address, isConnected } = useWallet()
  const {
    mintCollection,
    hash,
    error: contractError,
    isPending,
    isConfirming,
    isConfirmed,
    totalSupply,
    remainingSupply,
  } = useNFTContract()

  // Watch for transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && hash) {
      setUploadStep('success')
      console.log('✅ NFT Collection Minted Successfully! Transaction hash:', hash)
      toast({
        title: "NFT Collection Created Successfully! 🎉",
        description: `${nftItems.length} NFTs minted. Transaction: ${hash.slice(0, 10)}...${hash.slice(-6)}`,
      })
    }
  }, [isConfirmed, hash, nftItems.length])

  React.useEffect(() => {
    if (contractError) {
      setUploadStep('error')
      console.error('❌ Contract Error:', contractError)
      toast({
        title: "Transaction Failed",
        description: contractError.message || "The minting transaction failed. Please try again.",
        variant: "destructive"
      })
    }
  }, [contractError])

  // Add NFT files
  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const filesArray = Array.from(files)
      
      // Validate total items (max 20 as per contract)
      if (nftItems.length + filesArray.length > 20) {
        toast({
          title: "Too many files",
          description: "Maximum 20 NFTs can be minted in one collection batch",
          variant: "destructive"
        })
        return
      }

      const newItems: NFTItem[] = filesArray.map((file, index) => {
        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 100MB`,
            variant: "destructive"
          })
          return null
        }

        const preview = URL.createObjectURL(file)
        const baseName = file.name.replace(/\.[^/.]+$/, "")
        const collectionDisplayName = collectionName || 'Untitled Collection'
        
        return {
          id: `${Date.now()}-${index}`,
          file,
          preview,
          name: `${collectionDisplayName} #${nftItems.length + index + 1}`,
          description: `${baseName} from ${collectionDisplayName}`,
          properties: []
        }
      }).filter(Boolean) as NFTItem[]

      setNftItems(prev => [...prev, ...newItems])
    }
  }

  // Update collection name and auto-update NFT names
  const handleCollectionNameChange = (newName: string) => {
    setCollectionName(newName)
    
    // Auto-update NFT names if they follow the default pattern
    if (newName.trim()) {
      setNftItems(prev => prev.map((item, index) => {
        // Check if the current name follows the default pattern
        const defaultPattern = /^(.*?) #\d+$/
        const match = item.name.match(defaultPattern)
        
        if (match) {
          // Update the name with new collection name
          return {
            ...item,
            name: `${newName} #${index + 1}`,
            description: `${item.file.name.replace(/\.[^/.]+$/, "")} from ${newName}`
          }
        }
        return item
      }))
    }
  }
  const removeNftItem = (id: string) => {
    setNftItems(prev => {
      const updated = prev.filter(item => item.id !== id)
      // Revoke object URL to prevent memory leaks
      const itemToRemove = prev.find(item => item.id === id)
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.preview)
      }
      return updated
    })
  }

  // Update NFT item
  const updateNftItem = (id: string, updates: Partial<NFTItem>) => {
    setNftItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }

  // Add property to NFT item
  const addPropertyToItem = (itemId: string) => {
    updateNftItem(itemId, {
      properties: [...(nftItems.find(item => item.id === itemId)?.properties || []), { trait_type: "", value: "" }]
    })
  }

  // Remove property from NFT item
  const removePropertyFromItem = (itemId: string, propertyIndex: number) => {
    const item = nftItems.find(item => item.id === itemId)
    if (item) {
      const newProperties = item.properties.filter((_, index) => index !== propertyIndex)
      updateNftItem(itemId, { properties: newProperties })
    }
  }

  // Update property in NFT item
  const updatePropertyInItem = (itemId: string, propertyIndex: number, field: "trait_type" | "value", value: string) => {
    const item = nftItems.find(item => item.id === itemId)
    if (item) {
      const newProperties = [...item.properties]
      newProperties[propertyIndex][field] = value
      updateNftItem(itemId, { properties: newProperties })
    }
  }

  // Render file preview
  const renderFilePreview = (item: NFTItem) => {
    if (item.file.type.startsWith("image/")) {
      return (
        <Image 
          src={item.preview} 
          alt={item.name} 
          fill 
          className="object-cover rounded-lg" 
        />
      )
    }

    if (item.file.type.startsWith("video/")) {
      return (
        <video 
          src={item.preview} 
          className="w-full h-full object-cover rounded-lg" 
          controls 
        />
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          {item.file.type.startsWith("audio/") ? (
            <Music className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          ) : (
            <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="font-medium text-sm">{item.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(item.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
    )
  }

  // Utility functions
  const getStepIcon = () => {
    switch (uploadStep) {
      case 'uploading':
      case 'minting':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getStepMessage = () => {
    switch (uploadStep) {
      case 'uploading':
        return `Uploading files to IPFS... (${Math.round(uploadProgress)}%)`
      case 'minting':
        return 'Minting NFT Collection...'
      case 'success':
        return 'NFT Collection created successfully!'
      case 'error':
        return 'Error occurred during creation'
      default:
        return `Ready to mint ${nftItems.length} NFTs`
    }
  }

  const isDisabled = nftItems.length === 0 || !collectionName.trim() || isUploading || isPending || isConfirming

  // Main mint function
  const handleMintCollection = async () => {
    if (nftItems.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please add at least one file to mint.",
        variant: "destructive"
      })
      return
    }

    if (!collectionName.trim()) {
      toast({
        title: "Collection Name Required",
        description: "Please enter a name for your collection.",
        variant: "destructive"
      })
      return
    }

    if (!address || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to mint NFT collection.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setUploadStep('uploading')
    setUploadProgress(0)

    try {
      console.log('🎨 Starting NFT Collection creation process...')
      
      toast({
        title: "Uploading to IPFS",
        description: `Uploading ${nftItems.length} files and metadata to IPFS...`
      })

      const metadataURIs: string[] = []

      // Upload each NFT item
      for (let i = 0; i < nftItems.length; i++) {
        const item = nftItems[i]
        
        console.log(`📤 Uploading item ${i + 1}/${nftItems.length}: ${item.name}`)
        
        const nftParams: MintCollectionParams = {
          name: item.name,
          description: item.description,
          externalLink: baseExternalLink ? `${baseExternalLink}/${i + 1}` : undefined,
          properties: [
            // Item properties
            ...item.properties.filter(p => p.trait_type && p.value),
            // Collection properties
            {
              trait_type: "Collection",
              value: collectionName
            },
            {
              trait_type: "Edition",
              value: `${i + 1} of ${nftItems.length}`
            },
            {
              trait_type: "Creator",
              value: address
            },
            {
              trait_type: "Created Date",
              value: new Date().toISOString()
            }
          ],
          creatorAddress: address
        }

        // Upload to IPFS and prepare metadata
        const metadataURI = await UploadService.prepareNFTForMinting(item.file, nftParams)
        metadataURIs.push(metadataURI)
        
        // Update progress
        const progress = ((i + 1) / nftItems.length) * 100
        setUploadProgress(progress)
        
        console.log(`✅ Uploaded ${i + 1}/${nftItems.length}: ${metadataURI}`)
      }

      console.log('📄 All Metadata URIs:', metadataURIs)

      setUploadStep('minting')
      setUploadProgress(100)
      toast({
        title: "Minting NFT Collection",
        description: "Please confirm the transaction in your wallet..."
      })

      console.log('⛏️ Minting NFT Collection with metadata URIs:', metadataURIs)
      
      // Mint collection using mintMyCollection function
      await mintCollection(metadataURIs)

    } catch (error) {
      console.error('❌ Error creating NFT Collection:', error)
      setUploadStep('error')
      toast({
        title: "Error creating NFT Collection",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Debug info - development only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs max-w-xs z-50">
          <div>Connected: {isConnected ? '✅' : '❌'}</div>
          <div>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
          <div>Items: {nftItems.length}/20</div>
          <div>Pending: {isPending ? '⏳' : '✅'}</div>
          <div>Confirming: {isConfirming ? '⏳' : '✅'}</div>
          <div>Hash: {hash ? `${hash.slice(0, 6)}...` : 'None'}</div>
          {contractError && <div className="text-red-400">Error: {contractError.message}</div>}
        </div>
      )}
      
      {/* Success Modal */}
      {uploadStep === 'success' && hash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">NFT Collection Created Successfully! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                {nftItems.length} NFTs have been minted and are now available on the blockchain.
              </p>
              <div className="bg-muted p-3 rounded mb-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                <p className="text-sm font-medium break-all">{hash}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    window.open(`https://explorer.emerald.oasis.dev/tx/${hash}`, "_blank")
                  }}
                >
                  View on Explorer
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // Reset form
                    setNftItems([])
                    setCollectionName("")
                    setCollectionDescription("")
                    setBaseExternalLink("")
                    setUploadStep('idle')
                    setUploadProgress(0)
                  }}
                >
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/create" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Mint NFT Collection</h1>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Upload multiple files and mint them as a collection batch</p>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{totalSupply}</span> / {NFT_CONTRACT_CONFIG.maxSupply || 10000} minted
                <span className="ml-2">({remainingSupply} remaining)</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Preview Section - Left Side */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Collection Preview</CardTitle>
                  <CardDescription>
                    Preview of your NFT collection ({nftItems.length}/20 items)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {nftItems.length === 0 ? (
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-20 h-20 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">No files selected</p>
                          <p className="text-sm text-muted-foreground">Upload files to see collection preview</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Collection Info */}
                      <div className="border rounded-lg p-4 bg-background">
                        <h3 className="font-semibold mb-1">
                          {collectionName || "Untitled Collection"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {nftItems.length} items
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{nftItems.length} NFTs</Badge>
                          {collectionName && (
                            <Badge variant="outline" className="text-xs">
                              Pattern: {collectionName} #1, #2, ...
                            </Badge>
                          )}
                        </div>
                        {nftItems.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            First: {nftItems[0]?.name} • Last: {nftItems[nftItems.length - 1]?.name}
                          </p>
                        )}
                      </div>

                      {/* Grid Preview */}
                      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {nftItems.map((item, index) => (
                          <div key={item.id} className="aspect-square relative rounded-lg overflow-hidden bg-muted border">
                            {renderFilePreview(item)}
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs">
                                #{index + 1}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Form Section - Right Side */}
            <div className="lg:col-span-3 space-y-6">
              {/* Collection Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection Details</CardTitle>
                  <CardDescription>Basic information about your NFT collection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="collection-name">Collection Name *</Label>
                    <Input 
                      id="collection-name" 
                      placeholder="Enter collection name (e.g., 'My Art Series')"
                      value={collectionName}
                      onChange={(e) => handleCollectionNameChange(e.target.value)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      NFTs will be named: {collectionName || 'Collection Name'} #1, {collectionName || 'Collection Name'} #2, etc.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="collection-description">Description</Label>
                    <Textarea 
                      id="collection-description" 
                      placeholder="Describe your collection" 
                      rows={3}
                      value={collectionDescription}
                      onChange={(e) => setCollectionDescription(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="base-external-link">Base External Link</Label>
                    <Input 
                      id="base-external-link" 
                      placeholder="https://yoursite.io/collection"
                      value={baseExternalLink}
                      onChange={(e) => setBaseExternalLink(e.target.value)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Base URL for external links. Each NFT will get /1, /2, etc. appended
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Files</CardTitle>
                  <CardDescription>Select multiple files to create your NFT collection (max 20 files)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Upload Area */}
                    <div>
                      <input
                        type="file"
                        id="collection-files"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.glb,.gltf"
                        multiple
                        onChange={handleFilesSelect}
                        disabled={isUploading}
                      />
                      <Button 
                        variant="outline" 
                        asChild
                        className="w-full h-20 border-dashed"
                        disabled={isUploading || nftItems.length >= 20}
                      >
                        <label htmlFor="collection-files" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6" />
                          <div className="text-center">
                            <p className="font-medium">Choose Files</p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV, OGG, GLB, GLTF
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Max size: 100 MB per file
                            </p>
                          </div>
                        </label>
                      </Button>
                    </div>

                    {/* File List */}
                    {nftItems.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {nftItems.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-background flex items-center justify-center flex-shrink-0">
                              {item.file.type.startsWith("image/") ? (
                                <Image
                                  src={item.preview}
                                  alt={`Thumbnail ${index + 1}`}
                                  width={48}
                                  height={48}
                                  className="object-cover w-full h-full"
                                />
                              ) : item.file.type.startsWith("video/") ? (
                                <video src={item.preview} className="w-full h-full object-cover" />
                              ) : item.file.type.startsWith("audio/") ? (
                                <Music className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(item.file.size / 1024 / 1024).toFixed(2)} MB • #{index + 1}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNftItem(item.id)}
                              className="flex-shrink-0"
                              disabled={isUploading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Individual NFT Settings */}
              {nftItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Individual NFT Settings</span>
                      {collectionName && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNftItems(prev => prev.map((item, index) => ({
                              ...item,
                              name: `${collectionName} #${index + 1}`,
                              description: `${item.file.name.replace(/\.[^/.]+$/, "")} from ${collectionName}`
                            })))
                            toast({
                              title: "Names Updated",
                              description: `All NFT names updated to "${collectionName} #1, #2, ..." pattern`,
                            })
                          }}
                          disabled={isUploading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reset Names
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>Customize names, descriptions, and properties for each NFT</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 max-h-96 overflow-y-auto">
                      {nftItems.map((item, index) => (
                        <div key={item.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                              {item.file.type.startsWith("image/") && (
                                <Image
                                  src={item.preview}
                                  alt={`NFT ${index + 1}`}
                                  width={64}
                                  height={64}
                                  className="object-cover w-full h-full"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">NFT #{index + 1}</h4>
                              <p className="text-sm text-muted-foreground">{item.file.name}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor={`name-${item.id}`}>Name</Label>
                              <Input
                                id={`name-${item.id}`}
                                value={item.name}
                                onChange={(e) => updateNftItem(item.id, { name: e.target.value })}
                                disabled={isUploading}
                              />
                            </div>

                            <div>
                              <Label htmlFor={`description-${item.id}`}>Description</Label>
                              <Textarea
                                id={`description-${item.id}`}
                                value={item.description}
                                onChange={(e) => updateNftItem(item.id, { description: e.target.value })}
                                rows={2}
                                disabled={isUploading}
                              />
                            </div>

                            {/* Properties */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label>Properties</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addPropertyToItem(item.id)}
                                  disabled={isUploading}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {item.properties.map((property, propertyIndex) => (
                                  <div key={propertyIndex} className="flex gap-2">
                                    <Input
                                      placeholder="Trait type"
                                      value={property.trait_type}
                                      onChange={(e) => updatePropertyInItem(item.id, propertyIndex, "trait_type", e.target.value)}
                                      className="flex-1"
                                      disabled={isUploading}
                                    />
                                    <Input
                                      placeholder="Value"
                                      value={property.value}
                                      onChange={(e) => updatePropertyInItem(item.id, propertyIndex, "value", e.target.value)}
                                      className="flex-1"
                                      disabled={isUploading}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => removePropertyFromItem(item.id, propertyIndex)}
                                      className="flex-shrink-0"
                                      disabled={isUploading}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mint Button */}
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${
                  uploadStep === 'success' ? 'bg-green-50 border-green-200' :
                  uploadStep === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {getStepIcon()}
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${
                        uploadStep === 'success' ? 'text-green-900' :
                        uploadStep === 'error' ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {uploadStep === 'idle' ? 'Gas Fee Required' : getStepMessage()}
                      </h4>
                      <p className={`text-sm ${
                        uploadStep === 'success' ? 'text-green-700' :
                        uploadStep === 'error' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        {uploadStep === 'idle' && 
                          `Minting ${nftItems.length} NFTs requires a gas fee for the collection batch. All NFTs will be minted in a single transaction.`
                        }
                        {uploadStep === 'uploading' && 
                          `Uploading files and generating metadata for ${nftItems.length} NFTs...`
                        }
                        {uploadStep === 'minting' && 
                          'Please confirm the transaction in your wallet to mint the collection.'
                        }
                        {uploadStep === 'success' && hash && 
                          `${nftItems.length} NFTs minted successfully! Transaction: ${hash.slice(0, 20)}...`
                        }
                        {uploadStep === 'error' && 
                          'Please check your wallet and try again.'
                        }
                      </p>
                      {uploadStep === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={isDisabled}
                  onClick={handleMintCollection}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadStep === 'uploading' ? `Uploading... (${Math.round(uploadProgress)}%)` : 'Minting...'}
                    </>
                  ) : isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirm in Wallet
                    </>
                  ) : isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : uploadStep === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Collection Created Successfully!
                    </>
                  ) : (
                    `Mint Collection (${nftItems.length} NFTs)`
                  )}
                </Button>

                {uploadStep === 'success' && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/profile">View in Profile</Link>
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => {
                      // Reset form
                      setNftItems([])
                      setCollectionName("")
                      setCollectionDescription("")
                      setBaseExternalLink("")
                      setUploadStep('idle')
                      setUploadProgress(0)
                    }}>
                      Create Another Collection
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}