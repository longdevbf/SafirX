"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Upload, Music, FileText, Plus, X, Info, ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useNFTContract } from "@/hooks/use-nftContract"
import { UploadService } from "@/services/pinata"
import { NFT_CONTRACT_CONFIG, type MintNFTParams } from "@/lib/contracts/nft-types"
import { useWallet } from "@/context/walletContext"

export default function CreatePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [properties, setProperties] = useState<Array<{ trait_type: string; value: string }>>([])
  const [isUnlockable, setIsUnlockable] = useState(false)
  const [isSensitive, setIsSensitive] = useState(false)
  const [unlockableContent, setUnlockableContent] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'minting' | 'success' | 'error'>('idle')
  
  // Fix: Add missing properties to formData
  const [formData, setFormData] = useState({
    name: "",
    externalLink: "",
    description: "",
    collection: "",
    supply: 1,
    properties: [] as Array<{ trait_type: string; value: string }>,
    unlockableContent: "",
    isSensitive: false
  })

  const { address, isConnected } = useWallet()
  const {
    mintNFT,
    hash,
    error: contractError,
    isPending,
    isConfirming,
    isConfirmed,
    totalSupply,
    remainingSupply, // Fix: Add this from useNFTContract
  } = useNFTContract()

  // Watch for transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && hash) {
      setUploadStep('success')
      console.log('✅ NFT Minted Successfully! Transaction hash:', hash)
      toast({
        title: "NFT Created Successfully! 🎉",
        description: `Transaction hash: ${hash.slice(0, 10)}...${hash.slice(-6)}`,
      })
    }
  }, [isConfirmed, hash])

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 100MB",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const addProperty = () => {
    const newProperties = [...properties, { trait_type: "", value: "" }]
    setProperties(newProperties)
    // Update formData as well
    setFormData(prev => ({
      ...prev,
      properties: newProperties
    }))
  }

  const removeProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index)
    setProperties(newProperties)
    // Update formData as well
    setFormData(prev => ({
      ...prev,
      properties: newProperties
    }))
  }

  const updateProperty = (index: number, field: "trait_type" | "value", value: string) => {
    const updated = [...properties]
    updated[index][field] = value
    setProperties(updated)
    // Update formData as well
    setFormData(prev => ({
      ...prev,
      properties: updated
    }))
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Update switches to sync with formData
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      unlockableContent: unlockableContent,
      isSensitive: isSensitive,
      properties: properties
    }))
  }, [unlockableContent, isSensitive, properties])

  

  // Fix: Add missing utility functions
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
        return 'Uploading to IPFS...'
      case 'minting':
        return 'Minting NFT...'
      case 'success':
        return 'NFT created successfully!'
      case 'error':
        return 'Error occurred during creation'
      default:
        return 'Ready to create NFT'
    }
  }

  // Fix: Add isDisabled computed value
  const isDisabled = !selectedFile || !formData.name.trim() || !formData.description.trim() || isUploading || isPending || isConfirming

  const handleCreateNFT = async () => {
    if (!selectedFile || !formData.name || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive"
      })
      return
    }

    if (!address || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to mint NFT.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setUploadStep('uploading')

    try {
      console.log('🎨 Starting NFT creation process...')
      
      toast({
        title: "Uploading to IPFS",
        description: "Uploading your file and metadata to IPFS..."
      })

      const nftParams: MintNFTParams = {
        name: formData.name,
        description: formData.description,
        externalLink: formData.externalLink,
        properties: properties.filter(p => p.trait_type && p.value), // Fix: Use properties state instead of formData.properties
        unlockableContent: unlockableContent, // Fix: Use unlockableContent state
        isSensitive: isSensitive, // Fix: Use isSensitive state
        creatorAddress: address
      }

      console.log('📋 NFT Parameters:', nftParams)

      // Upload to IPFS and prepare metadata
      const metadataURI = await UploadService.prepareNFTForMinting(selectedFile!, nftParams)
      console.log('📄 Metadata URI:', metadataURI)

      setUploadStep('minting')
      toast({
        title: "Minting NFT",
        description: "Please confirm the transaction in your wallet..."
      })

      console.log('⛏️ Minting NFT with metadata URI:', metadataURI)
      
      // Mint NFT
      await mintNFT(metadataURI)

    } catch (error) {
      console.error('❌ Error creating NFT:', error)
      setUploadStep('error')
      toast({
        title: "Error creating NFT",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Fix: Add renderFilePreview function
  const renderFilePreview = () => {
    if (!selectedFile) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-20 h-20 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No file selected</p>
            <p className="text-sm text-muted-foreground">Upload a file to see preview</p>
          </div>
        </div>
      )
    }

    if (selectedFile.type.startsWith("image/")) {
      return (
        <Image 
          src={previewUrl} 
          alt="NFT Preview" 
          fill 
          className="object-cover rounded-lg" 
        />
      )
    }

    if (selectedFile.type.startsWith("video/")) {
      return (
        <video 
          src={previewUrl} 
          className="w-full h-full object-cover rounded-lg" 
          controls 
        />
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          {selectedFile.type.startsWith("audio/") ? (
            <Music className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
          ) : (
            <FileText className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
          )}
          <p className="font-medium text-lg mb-2">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          {selectedFile.type.startsWith("audio/") && (
            <audio src={previewUrl} controls className="mt-4" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Debug info - chỉ hiện trong development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs max-w-xs">
          <div>Connected: {isConnected ? '✅' : '❌'}</div>
          <div>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
          <div>Pending: {isPending ? '⏳' : '✅'}</div>
          <div>Confirming: {isConfirming ? '⏳' : '✅'}</div>
          <div>Hash: {hash ? `${hash.slice(0, 6)}...` : 'None'}</div>
          {contractError && <div className="text-red-400">Error: {contractError.message}</div>}
        </div>
      )}
      
      {/* Success Modal với transaction hash */}
      {uploadStep === 'success' && hash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">NFT Created Successfully! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                Your NFT has been minted and is now available on the blockchain.
              </p>
              <div className="bg-muted p-3 rounded mb-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                <p className="text-sm font-medium break-all">{hash}</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full mb-2"
                onClick={() => {
                  // Fix: Use correct explorer URL for Oasis Network
                  window.open(`https://explorer.emerald.oasis.dev/tx/${hash}`, "_blank")
                }}
              >
                View on Explorer
              </Button>
              <Button 
                className="w-full"
                onClick={() => {
                  // Reset form
                  setSelectedFile(null)
                  setPreviewUrl("")
                  setFormData({
                    name: "",
                    externalLink: "",
                    description: "",
                    collection: "",
                    supply: 1,
                    properties: [],
                    unlockableContent: "",
                    isSensitive: false
                  })
                  setProperties([])
                  setIsUnlockable(false)
                  setIsSensitive(false)
                  setUnlockableContent("")
                  setUploadStep('idle')
                }}
              >
                Create Another NFT
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold">Create NFT</h1>
              <Button variant="outline" asChild>
                <Link href="/create/collection">Mint NFT Collection</Link>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Upload your digital asset and create your unique NFT</p>
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
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>This is how your NFT will appear to others</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Main Preview */}
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25">
                      {renderFilePreview()}
                    </div>

                    {/* NFT Card Preview */}
                    {selectedFile && (
                      <div className="border rounded-lg p-4 bg-background">
                        <h3 className="font-semibold mb-1">
                          {formData.name || "Untitled NFT"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {formData.collection || "Your Collection"}
                        </p>
                        
                        {/* Properties Preview */}
                        {properties.filter(p => p.trait_type && p.value).length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Properties</p>
                            <div className="flex flex-wrap gap-2">
                              {properties.map((prop, index) => (
                                prop.trait_type && prop.value && (
                                  <div key={index} className="bg-muted rounded-lg px-2 py-1">
                                    <p className="text-xs font-medium text-blue-600">{prop.trait_type}</p>
                                    <p className="text-xs">{prop.value}</p>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Supply</p>
                            <p className="text-sm font-semibold">{formData.supply}</p>
                          </div>
                          <Button size="sm" disabled>
                            View Details
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Section - Right Side */}
            <div className="lg:col-span-3 space-y-6">
              {/* Basic Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Details</CardTitle>
                  <CardDescription>Add the basic information for your NFT</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="file-upload">Upload File *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV, OGG, GLB, GLTF. Max size: 100 MB
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.glb,.gltf"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                      />
                      <Button 
                        variant="outline" 
                        asChild
                        className="w-full sm:w-auto"
                        disabled={isUploading}
                      >
                        <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Choose File
                        </label>
                      </Button>
                      
                      {selectedFile && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-background flex items-center justify-center flex-shrink-0">
                              {selectedFile.type.startsWith("image/") ? (
                                <Image
                                  src={previewUrl}
                                  alt="Thumbnail"
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              ) : selectedFile.type.startsWith("video/") ? (
                                <video src={previewUrl} className="w-full h-full object-cover" />
                              ) : selectedFile.type.startsWith("audio/") ? (
                                <Music className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFile(null)
                                setPreviewUrl("")
                              }}
                              className="flex-shrink-0"
                              disabled={isUploading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter NFT name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={isUploading}
                    />
                  </div>

                  {/* External Link */}
                  <div>
                    <Label htmlFor="external-link">External Link</Label>
                    <Input 
                      id="external-link" 
                      placeholder="https://yoursite.io/item/123"
                      value={formData.externalLink}
                      onChange={(e) => handleInputChange('externalLink', e.target.value)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nexelra will include a link to this URL on this items detail page
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Provide a detailed description of your item" 
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The description will be included on the items detail page
                    </p>
                  </div>

                  {/* Collection */}
                  <div>
                    <Label htmlFor="collection">Collection</Label>
                    <Select onValueChange={(value) => handleInputChange('collection', value)} disabled={isUploading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create-new">+ Create New Collection</SelectItem>
                        <SelectItem value="my-collection">My Collection</SelectItem>
                        <SelectItem value="art-collection">Art Collection</SelectItem>
                        <SelectItem value="gaming-collection">Gaming Collection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                  <CardDescription>Textual traits that show up as rectangles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {properties.map((property, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Trait type (e.g. Color)"
                          value={property.trait_type}
                          onChange={(e) => updateProperty(index, "trait_type", e.target.value)}
                          className="flex-1"
                          disabled={isUploading}
                        />
                        <Input
                          placeholder="Value (e.g. Blue)"
                          value={property.value}
                          onChange={(e) => updateProperty(index, "value", e.target.value)}
                          className="flex-1"
                          disabled={isUploading}
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => removeProperty(index)}
                          className="flex-shrink-0"
                          disabled={isUploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      onClick={addProperty} 
                      className="w-full bg-transparent"
                      disabled={isUploading}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Property
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>Configure additional options for your NFT</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Supply */}
                  <div>
                    <Label htmlFor="supply">Supply</Label>
                    <Input 
                      id="supply" 
                      type="number" 
                      min="1" 
                      value={formData.supply}
                      onChange={(e) => handleInputChange('supply', parseInt(e.target.value) || 1)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The number of items that can be minted
                    </p>
                  </div>

                  {/* Blockchain */}
                  <div>
                    <Label htmlFor="blockchain">Blockchain</Label>
                    <Select defaultValue="oasis" disabled={isUploading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oasis">Oasis Sapphire</SelectItem>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unlockable Content */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Unlockable Content</Label>
                        <p className="text-sm text-muted-foreground">
                          Include unlockable content that can only be revealed by the owner
                        </p>
                      </div>
                      <Switch 
                        checked={isUnlockable} 
                        onCheckedChange={setIsUnlockable}
                        disabled={isUploading}
                      />
                    </div>

                    {isUnlockable && (
                      <div>
                        <Label htmlFor="unlockable-content">Unlockable Content</Label>
                        <Textarea
                          id="unlockable-content"
                          placeholder="Enter content that will be unlocked after purchase"
                          rows={3}
                          value={unlockableContent}
                          onChange={(e) => setUnlockableContent(e.target.value)}
                          disabled={isUploading}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sensitive Content */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Explicit & Sensitive Content</Label>
                      <p className="text-sm text-muted-foreground">
                        Set this item as explicit and sensitive content
                      </p>
                    </div>
                    <Switch 
                      checked={isSensitive} 
                      onCheckedChange={setIsSensitive}
                      disabled={isUploading}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Create Button */}
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${
                  uploadStep === 'success' ? 'bg-green-50 border-green-200' :
                  uploadStep === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {getStepIcon()}
                    <div>
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
                          'Creating an NFT requires a one-time gas fee to mint it on the blockchain. The fee varies based on network congestion.'
                        }
                        {uploadStep === 'uploading' && 
                          'Uploading your file and metadata to IPFS...'
                        }
                        {uploadStep === 'minting' && 
                          'Please confirm the transaction in your wallet to mint the NFT.'
                        }
                        {uploadStep === 'success' && hash && 
                          `Transaction hash: ${hash.slice(0, 20)}...`
                        }
                        {uploadStep === 'error' && 
                          'Please check your wallet and try again.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={isDisabled}
                  onClick={handleCreateNFT}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadStep === 'uploading' ? 'Uploading...' : 'Minting...'}
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
                      NFT Created Successfully!
                    </>
                  ) : (
                    'Create NFT'
                  )}
                </Button>

                {uploadStep === 'success' && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/profile">View in Profile</Link>
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => {
                      // Reset form
                      setSelectedFile(null)
                      setPreviewUrl("")
                      setFormData({
                        name: "",
                        externalLink: "",
                        description: "",
                        collection: "",
                        supply: 1,
                        properties: [],
                        unlockableContent: "",
                        isSensitive: false
                      })
                      setProperties([])
                      setIsUnlockable(false)
                      setIsSensitive(false)
                      setUnlockableContent("")
                      setUploadStep('idle')
                    }}>
                      Create Another
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