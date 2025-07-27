/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Eye, Heart, X, Sparkles, Gem, Crown, Trophy, Star as StarIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { getRosePrice } from "@/services/rose_usd"
import "./qlow-animation.css"
import "./background-effects.css"

interface FeaturedCollection {
  collection_name: string
  image: string
  bundle_price: string
  views_count: number
  likes_count: number
  engagement_score: number
  items_count: number
  listing_id?: string
}

interface TrendingNFT {
  listing_id: string
  nft_contract: string
  token_id: string
  seller: string
  price: string
  collection_name: string
  name: string
  image: string
  views_count: number
  likes_count: number
  engagement_score: number
  created_at: string
}

export default function HomePage() {
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>([])
  const [trendingNFTs, setTrendingNFTs] = useState<TrendingNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rosePrice, setRosePrice] = useState<number | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true)
        
        // Fetch ROSE price first
        const price = await getRosePrice()
        if (price) setRosePrice(price)
        
        // Fetch home data
        const response = await fetch('/api/home')
        if (!response.ok) {
          throw new Error('Failed to fetch home data')
        }
        const data = await response.json()
        setFeaturedCollections(data.featuredCollections || [])
        setTrendingNFTs(data.trendingNFTs || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error fetching home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
    
    // Update ROSE price every 5 minutes
    const interval = setInterval(async () => {
      const price = await getRosePrice()
      if (price) setRosePrice(price)
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Fallback data nếu không có dữ liệu
  const fallbackFeaturedCollections = [
    {
      collection_name: "Cosmic Apes",
      image: "/assets/cosmic_apes.jpg",
      bundle_price: "2.5",
      views_count: 1234,
      likes_count: 567,
      engagement_score: 1801,
      items_count: 10000,
      listing_id: "1"
    },
    {
      collection_name: "Digital Dreams",
      image: "/assets/digital_dream.jpg",
      bundle_price: "1.8",
      views_count: 856,
      likes_count: 234,
      engagement_score: 1090,
      items_count: 5000,
      listing_id: "2"
    }
  ]

  const fallbackTrendingNFTs = [
    {
      listing_id: "1",
      nft_contract: "0x123",
      token_id: "1",
      seller: "0x456",
      price: "3.2",
      collection_name: "Cosmic Apes",
      name: "Monkey #1",
      image: "/assets/cosmic_apesss.webp",
      views_count: 1234,
      likes_count: 567,
      engagement_score: 1801,
      created_at: "2024-01-01"
    }
  ]

  const displayFeaturedCollections = featuredCollections.length > 0 ? featuredCollections : fallbackFeaturedCollections
  const displayTrendingNFTs = trendingNFTs.length > 0 ? trendingNFTs : fallbackTrendingNFTs

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl p-6 max-w-lg w-full text-gray-800 shadow-2xl border border-gray-200">
            {/* Close Button */}
            <button
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Icons */}
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                <Gem className="w-6 h-6 text-blue-500 animate-pulse" />
                <Crown className="w-6 h-6 text-purple-500 animate-pulse" />
                <Trophy className="w-6 h-6 text-orange-500 animate-pulse" />
                <StarIcon className="w-6 h-6 text-pink-500 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">
                Welcome to SafirX
              </h1>
              <p className="text-sm text-gray-600">
                Your Gateway to Digital Art on Oasis Sapphire
              </p>
            </div>

            {/* Welcome Message */}
            <div className="space-y-3 text-center mb-6">
              <p className="text-sm leading-relaxed text-gray-700">
                🎨 Discover an extraordinary world where creativity meets blockchain technology on the 
                <span className="font-semibold text-blue-600"> Oasis Sapphire Network</span>. 
                We're thrilled to welcome you to the most innovative NFT marketplace built on cutting-edge privacy technology.
              </p>
              
              <p className="text-sm leading-relaxed text-gray-700">
                🌟 Experience seamless trading with our advanced marketplace featuring premium NFT collections, 
                sealed bid auctions, and privacy-first technology that ensures secure transactions.
              </p>
              
              <p className="text-sm leading-relaxed text-gray-700">
                🚀 Whether you're an artist, collector, or investor, SafirX provides the perfect platform 
                for your journey into the world of digital assets. Join our vibrant community and discover your next masterpiece!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => setShowWelcomeModal(false)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Exploring
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowWelcomeModal(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Learn More
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 text-xs text-gray-500">
              <p>Built with ❤️ on Oasis Sapphire Network</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/NFT.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Particle Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 80 + 10}%`,
                animationDelay: `${Math.random() * 8}s`
              }}
            />
          ))}
        </div>

        <div className="relative container mx-auto px-4 py-52">
          <div className="max-w-4xl mx-auto text-center mt-1">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="glow-text">Discover, Create & Trade</span>
              <span className="block glow-text">
                Extraordinary NFTs
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              The world&apos;s largest NFT marketplace. Buy, sell, and discover exclusive digital assets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-3">
                <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black text-lg px-8 py-3 bg-transparent"
              >
                <Link href="/create">Create NFT</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">2.5M+</div>
              <div className="text-muted-foreground">Total Sales</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">180K+</div>
              <div className="text-muted-foreground">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">45K+</div>
              <div className="text-muted-foreground">Artists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">890K+</div>
              <div className="text-muted-foreground">Community</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Collections</h2>
            <Button variant="outline" asChild>
              <Link href="/marketplace">View All</Link>
            </Button>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load featured collections</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {displayFeaturedCollections.map((collection, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative">
                    <Image
                      src={collection.image || "/placeholder.svg"}
                      alt={collection.collection_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{collection.collection_name}</h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Star className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    
                    {/* Bundle Price Section - Highlighted */}
                    <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Bundle Price</div>
                      <div className="font-bold text-lg text-primary">
                        {parseFloat(collection.bundle_price || "0").toFixed(3)} ROSE
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rosePrice ? (
                          `≈ $${(parseFloat(collection.bundle_price || "0") * rosePrice).toFixed(2)} USD`
                        ) : (
                          "Loading price..."
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {collection.views_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {collection.likes_count}
                      </div>
                    </div>
                    
                    <Button className="w-full" variant="outline">
                      <Link href={`/marketplace/collection/${collection.listing_id || index + 1}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending NFTs */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Trending NFTs</h2>
            <Button variant="outline" asChild>
              <Link href="/marketplace">View All</Link>
            </Button>
          </div>
          
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load trending NFTs</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayTrendingNFTs.map((nft) => (
                <Card key={nft.listing_id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="aspect-square relative">
                    <Image
                      src={nft.image || "/placeholder.svg"}
                      alt={nft.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {nft.views_count}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">{nft.collection_name}</div>
                    <h3 className="font-semibold mb-2 truncate">{nft.name}</h3>
                    
                    {/* Price Section - Highlighted */}
                    <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Current Price</div>
                      <div className="font-bold text-lg text-primary">
                        {parseFloat(nft.price).toFixed(3)} ROSE
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rosePrice ? (
                          `≈ $${(parseFloat(nft.price) * rosePrice).toFixed(2)} USD`
                        ) : (
                          "Loading price..."
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {nft.views_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {nft.likes_count}
                      </div>
                    </div>
                    
                    <Button className="w-full" variant="outline">
                      <Link href={`/marketplace/nft/${nft.listing_id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl p-8 md:p-12 text-white text-center overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/assets/blockchain.jpeg')",
              }}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your NFT Journey?</h2>
              <p className="text-xl mb-8 text-gray-200">
                Join thousands of creators and collectors in the world&apos;s premier NFT marketplace
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                  <Link href="/create">Create Your First NFT</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black bg-transparent"
                >
                  <Link href="/marketplace">Start Collecting</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}