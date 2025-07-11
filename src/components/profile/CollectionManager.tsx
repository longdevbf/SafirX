"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, Upload, Image as ImageIcon, Package, 
  Trash2, Eye, Heart, Loader2 
} from "lucide-react"
import Image from "next/image"
import { ProcessedNFT } from "@/interfaces/nft"
import { Collection, CreateCollectionData } from "@/interfaces/collection"

interface CollectionManagerProps {
  userAddress: string
  userNFTs: ProcessedNFT[]
  onRefresh: () => void
}

export default function CollectionManager({ 
  userAddress, 
  userNFTs, 
  onRefresh 
}: CollectionManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedNFTs, setSelectedNFTs] = useState<ProcessedNFT[]>([])
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_image: '',
    banner_image: '',
    is_bundle: false,
    bundle_price: '',
    listing_type: 0
  })

  // Load user collections
  useEffect(() => {
    loadCollections()
  }, [userAddress])

  const loadCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/collections?creator=${userAddress}`)
      if (response.ok) {
        const data = await response.json()
        setCollections(data.collections || [])
      }
    } catch (error) {
      console.error('Error loading collections:', error)
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (file: File, type: 'cover' | 'banner') => {
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          [type === 'cover' ? 'cover_image' : 'banner_image']: data.ipfsUrl
        }))
        
        toast({
          title: "Success",
          description: `${type === 'cover' ? 'Cover' : 'Banner'} image uploaded to IPFS successfully`
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Error",
        description: "Failed to upload image to IPFS",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Handle NFT selection
  const toggleNFTSelection = (nft: ProcessedNFT) => {
    setSelectedNFTs(prev => {
      const isSelected = prev.some(n => n.id === nft.id)
      if (isSelected) {
        return prev.filter(n => n.id !== nft.id)
      } else {
        return [...prev, nft]
      }
    })
  }

  // Create collection
  const handleCreateCollection = async () => {
    try {
      if (!formData.name || selectedNFTs.length === 0) {
        toast({
          title: "Error",
          description: "Please provide collection name and select at least one NFT",
          variant: "destructive"
        })
        return
      }

      setLoading(true)

      // Generate collection ID (you might want to get this from smart contract)
      const collection_id = `collection-${Date.now()}`

      const collectionData: CreateCollectionData = {
        collection_id,
        name: formData.name,
        description: formData.description,
        cover_image: formData.cover_image,
        banner_image: formData.banner_image,
        creator_address: userAddress,
        contract_address: selectedNFTs[0].contractAddress, // Use first NFT's contract
        is_bundle: formData.is_bundle,
        bundle_price: formData.bundle_price ? parseFloat(formData.bundle_price) : undefined,
        listing_type: formData.listing_type,
        items: selectedNFTs.map(nft => ({
          listing_id: nft.listingId || nft.id,
          nft_contract: nft.contractAddress,
          token_id: nft.tokenId,
          price: parseFloat(nft.price || '0')
        }))
      }

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collectionData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Collection created successfully"
        })
        
        setShowCreateDialog(false)
        resetForm()
        loadCollections()
        onRefresh()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create collection')
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create collection",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cover_image: '',
      banner_image: '',
      is_bundle: false,
      bundle_price: '',
      listing_type: 0
    })
    setSelectedNFTs([])
  }

  // Delete collection
  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Collection deleted successfully"
        })
        loadCollections()
      } else {
        throw new Error('Failed to delete collection')
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
      toast({
        title: "Error",
        description: "Failed to delete collection",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Collections</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
          <p className="text-gray-600 mb-4">Create your first collection to group your NFTs</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Collection
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card key={collection.id} className="group hover:shadow-lg transition-shadow">
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <Image
                  src={collection.cover_image || '/placeholder.svg'}
                  alt={collection.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-black/50 text-white hover:bg-black/70"
                    onClick={() => handleDeleteCollection(collection.collection_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {collection.is_bundle && (
                  <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white">
                    Bundle
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 truncate">{collection.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {collection.description || 'No description'}
                </p>
                
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span>{collection.total_items} items</span>
                  <span>Floor: {collection.floor_price} ROSE</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {collection.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {collection.likes_count}
                    </span>
                  </div>
                  <Badge variant={collection.is_active ? "default" : "secondary"}>
                    {collection.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Collection Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter collection name"
                />
              </div>
              
              <div>
                <Label htmlFor="bundle_price">Bundle Price (ROSE)</Label>
                <Input
                  id="bundle_price"
                  type="number"
                  step="0.01"
                  value={formData.bundle_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, bundle_price: e.target.value }))}
                  placeholder="Optional bundle price"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your collection..."
                rows={3}
              />
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cover Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {formData.cover_image ? (
                    <div className="relative h-32 mb-2">
                      <Image
                        src={formData.cover_image}
                        alt="Cover preview"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  )}
                  <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Cover
                  </Button>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'cover')
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Banner Image (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {formData.banner_image ? (
                    <div className="relative h-32 mb-2">
                      <Image
                        src={formData.banner_image}
                        alt="Banner preview"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  )}
                  <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Banner
                  </Button>
                  <input
                    id="banner-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'banner')
                    }}
                  />
                </div>
              </div>
            </div>

            {/* NFT Selection */}
            <div>
              <Label>Select NFTs for Collection *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {userNFTs.map((nft) => {
                  const isSelected = selectedNFTs.some(n => n.id === nft.id)
                  return (
                    <div
                      key={nft.id}
                      className={`relative cursor-pointer border-2 rounded-lg p-2 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleNFTSelection(nft)}
                    >
                      <div className="relative aspect-square mb-2">
                        <Image
                          src={nft.image || '/placeholder.svg'}
                          alt={nft.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <p className="text-xs font-medium truncate">{nft.name}</p>
                      <p className="text-xs text-gray-500">{nft.price} ROSE</p>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Selected: {selectedNFTs.length} NFTs
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCollection}
                disabled={loading || !formData.name || selectedNFTs.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Collection'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}