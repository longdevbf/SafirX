"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function TestDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testFetchListings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/listings')
      const data = await response.json()
      setResult(`Success: Found ${data.listings?.length || 0} listings`)
      ('Listings data:', data)
    } catch (error) {
      setResult(`Error: ${error}`)
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSampleData = async () => {
    setLoading(true)
    try {
      // Create sample NFT listing
      const sampleNFT = {
        listing_id: "test-nft-1",
        nft_contract: "0x1234567890123456789012345678901234567890",
        token_id: "1",
        seller: "0x1111111111111111111111111111111111111111",
        price: "10.5",
        collection_name: "Test Collection",
        name: "Test NFT #1",
        description: "This is a test NFT for marketplace testing",
        category: "Art",
        image: "https://picsum.photos/400/400?random=1",
        attributes: JSON.stringify([
          { trait_type: "Color", value: "Blue" },
          { trait_type: "Size", value: "Large" }
        ]),
        rarity: "Rare",
        is_bundle: false,
        bundle_token_ids: "",
        collection_image: "/placeholder.svg",
        tx_hash: "0xtest1234567890123456789012345678901234567890123456789012345678901234"
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleNFT)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()
      setResult(`Sample NFT created successfully: ${data.listing?.listing_id}`)
      ('Created listing:', data)
    } catch (error) {
      setResult(`Error creating sample data: ${error}`)
      console.error('Error creating sample data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSampleBundle = async () => {
    setLoading(true)
    try {
      // Create sample bundle collection
      const sampleBundle = {
        listing_id: "test-bundle-1",
        nft_contract: "0x1234567890123456789012345678901234567890",
        token_id: "bundle",
        seller: "0x1111111111111111111111111111111111111111",
        price: "50.0",
        collection_name: "Test Bundle Collection",
        name: "Test Bundle #1",
        description: "This is a test bundle collection for marketplace testing",
        category: "Collection",
        image: "https://picsum.photos/400/400?random=2",
        attributes: JSON.stringify([
          { trait_type: "Type", value: "Bundle" },
          { trait_type: "Items", value: "5" }
        ]),
        rarity: "Epic",
        is_bundle: true,
        bundle_token_ids: "1,2,3,4,5",
        collection_image: "/placeholder.svg",
        cover_image_url: "https://picsum.photos/400/400?random=3",
        tx_hash: "0xtest1234567890123456789012345678901234567890123456789012345678901234",
        // Bundle specific fields
        bundle_price: "50.0",
                  individual_images: JSON.stringify([
            "https://picsum.photos/300/300?random=4",
            "https://picsum.photos/300/300?random=5",
            "https://picsum.photos/300/300?random=6",
            "https://picsum.photos/300/300?random=7",
            "https://picsum.photos/300/300?random=8"
          ]),
        individual_metadata: JSON.stringify([
          { name: "Item #1", description: "First item" },
          { name: "Item #2", description: "Second item" },
          { name: "Item #3", description: "Third item" },
          { name: "Item #4", description: "Fourth item" },
          { name: "Item #5", description: "Fifth item" }
        ]),
        nft_names: JSON.stringify([
          "Test Bundle Item #1",
          "Test Bundle Item #2", 
          "Test Bundle Item #3",
          "Test Bundle Item #4",
          "Test Bundle Item #5"
        ]),
        nft_descriptions: JSON.stringify([
          "First item in test bundle",
          "Second item in test bundle",
          "Third item in test bundle", 
          "Fourth item in test bundle",
          "Fifth item in test bundle"
        ]),
        token_ids_array: JSON.stringify(["1", "2", "3", "4", "5"]),
        individual_prices: JSON.stringify(["10", "10", "10", "10", "10"]),
        collection_type: "bundle"
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleBundle)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()
      setResult(`Sample bundle created successfully: ${data.listing?.listing_id}`)
      ('Created bundle:', data)
    } catch (error) {
      setResult(`Error creating sample bundle: ${error}`)
      console.error('Error creating sample bundle:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = async () => {
    setLoading(true)
    try {
      // This would require a DELETE all endpoint
      setResult('Clear all data feature not implemented yet')
    } catch (error) {
      setResult(`Error clearing data: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Test Data Management</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Database Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testFetchListings} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Test Fetch Listings
            </Button>
            
            <Button 
              onClick={createSampleData} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Sample NFT
            </Button>
            
            <Button 
              onClick={createSampleBundle} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Sample Bundle
            </Button>
            
            <Button 
              onClick={clearAllData} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Clear All Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <Alert>
                <AlertDescription>{result}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-muted-foreground">No tests run yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 