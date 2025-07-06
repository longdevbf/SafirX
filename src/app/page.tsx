import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Eye } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  const featuredCollections = [
    {
      id: 1,
      name: "Cosmic Apes",
      image: "/assets/cosmic_apes.jpg",
      floorPrice: "2.5 ROSE",
      volume: "1,234 ROSE",
      items: "10,000",
      verified: true,
    },
    {
      id: 2,
      name: "Cosmic Apes Genesis",
      image: "/assets/monkey2.jpeg",
      floorPrice: "4.2 ROSE",
      volume: "2,567 ROSE",
      items: "1,000",
      verified: true,
    },
    {
      id: 3,
      name: "Digital Dreams",
      image: "/assets/digital_dream.jpg",
      floorPrice: "1.8 ROSE",
      volume: "856 ROSE",
      items: "5,000",
      verified: true,
    },
    {
      id: 4,
      name: "Pixel King",
      image: "/assets/pixel_king.png",
      floorPrice: "0.9 ROSE",
      volume: "432 ROSE",
      items: "8,888",
      verified: false,
    },
    {
      id: 5,
      name: "Dog Pixel",
      image: "/assets/dog_pixel.jpeg",
      floorPrice: "1.2 ROSE",
      volume: "678 ROSE",
      items: "3,500",
      verified: false,
    },
    {
      id: 6,
      name: "Dog Meme",
      image: "/assets/dog.jpg",
      floorPrice: "3.0 ROSE",
      volume: "1,000 ROSE",
      items: "2,500",
      verified: true,
    }
  ]

  const trendingNFTs = [
    {
      id: 1,
      name: "Monkey",
      collection: "Cosmic Apes",
      image: "/assets/cosmic_apesss.webp",
      price: "3.2 ROSE",
      lastSale: "2.8 ROSE",
      timeLeft: "2h 15m",
      isAuction: true,
      views: 1234,
    },
    {
      id: 2,
      name: "Dream Walker #567",
      collection: "Digital Dreams",
      image: "/assets/dream_walker.jpg",
      price: "2.1 ROSE",
      lastSale: "1.9 ROSE",
      timeLeft: null,
      isAuction: false,
      views: 892,
    },
    {
      id: 3,
      name: "Pixel Warrior #890",
      collection: "Pixel Warriors",
      image: "/assets/pixel_warrior.png",
      price: "1.5 ROSE",
      lastSale: "1.2 ROSE",
      timeLeft: "5h 42m",
      isAuction: true,
      views: 567,
    },
    {
      id: 4,
      name: "Cosmic Ape #5678",
      collection: "Cosmic Apes",
      image: "/assets/monkey1.jpeg",
      price: "4.1 ROSE",
      lastSale: "3.5 ROSE",
      timeLeft: null,
      isAuction: false,
      views: 2341,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/NFT.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Discover, Create & Trade
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                Extraordinary NFTs
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              The world's largest NFT marketplace. Buy, sell, and discover exclusive digital assets.
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
              <Link href="/collections">View All</Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredCollections.map((collection) => (
              <Card key={collection.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <Image
                    src={collection.image || "/placeholder.svg"}
                    alt={collection.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg">{collection.name}</h3>
                    {collection.verified && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Star className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Floor</div>
                      <div className="font-semibold">{collection.floorPrice}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Volume</div>
                      <div className="font-semibold">{collection.volume}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Items</div>
                      <div className="font-semibold">{collection.items}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingNFTs.map((nft) => (
              <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="aspect-square relative">
                  <Image
                    src={nft.image || "/placeholder.svg"}
                    alt={nft.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {nft.views}
                  </div>
                  {nft.isAuction && nft.timeLeft && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {nft.timeLeft}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{nft.collection}</div>
                  <h3 className="font-semibold mb-2 truncate">{nft.name}</h3>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Price</div>
                      <div className="font-bold">{nft.price}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Last Sale</div>
                      <div className="text-sm">{nft.lastSale}</div>
                    </div>
                  </div>
                  <Button className="w-full" variant={nft.isAuction ? "default" : "outline"}>
                    {nft.isAuction ? "Place Bid" : "Buy Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
                Join thousands of creators and collectors in the world's premier NFT marketplace
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
