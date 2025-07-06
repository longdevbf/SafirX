"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Grid3X3, List, Filter, Search, Heart, Eye, ExternalLink, Star, Copy, Wallet, Flag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function PublicProfilePage({ params }: { params: { address: string } }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTab, setSelectedTab] = useState("owned")

  // Mock user data - in real app, fetch based on params.address
  const user = {
    address: params.address,
    name: "ArtCollector",
    username: "@artcollector",
    bio: "Passionate about digital art and blockchain technology. Collecting unique pieces since 2021.",
    avatar: "/placeholder-user.jpg",
    banner: "/images/nft-background.jpg",
    verified: false,
    joined: "June 2021",
    website: "https://artcollector.com",
    stats: {
      owned: 89,
      created: 12,
      sold: 34,
      totalVolume: "156.3 ETH",
      floorValue: "67.8 ETH",
    },
  }

  // Mock NFT data
  const publicNFTs = [
    {
      id: 1,
      name: "Abstract Vision #123",
      collection: "Abstract Visions",
      image: "/images/nft-sample.jpg",
      price: "1.5 ETH",
      lastSale: "1.2 ETH",
      rarity: "Rare",
      isListed: true,
      views: 567,
      likes: 89,
    },
    {
      id: 2,
      name: "Digital Landscape #456",
      collection: "Digital Landscapes",
      image: "/images/nft-sample.jpg",
      price: null,
      lastSale: "2.1 ETH",
      rarity: "Epic",
      isListed: false,
      views: 892,
      likes: 156,
    },
    {
      id: 3,
      name: "Crypto Punk #789",
      collection: "Crypto Punks",
      image: "/images/nft-sample.jpg",
      price: "5.2 ETH",
      lastSale: "4.8 ETH",
      rarity: "Legendary",
      isListed: true,
      views: 1234,
      likes: 234,
    },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Common":
        return "bg-gray-100 text-gray-800"
      case "Uncommon":
        return "bg-green-100 text-green-800"
      case "Rare":
        return "bg-blue-100 text-blue-800"
      case "Epic":
        return "bg-purple-100 text-purple-800"
      case "Legendary":
        return "bg-orange-100 text-orange-800"
      case "Mythic":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(user.address)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Banner */}
      <div className="relative h-64 bg-gradient-to-r from-purple-600 to-blue-600">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${user.banner}')`,
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Flag className="w-4 h-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Info */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <Avatar className="w-32 h-32 border-4 border-background">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">AC</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{user.name}</h1>
                {user.verified && <Star className="w-6 h-6 text-blue-500 fill-current" />}
              </div>
              <p className="text-muted-foreground mb-2">{user.username}</p>
              <p className="text-muted-foreground mb-4 max-w-2xl">{user.bio}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  <span className="font-mono">{user.address}</span>
                  <Button variant="ghost" size="sm" onClick={copyAddress} className="h-6 w-6 p-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <span>Joined {user.joined}</span>
                {user.website && (
                  <Link href={user.website} className="flex items-center gap-1 hover:text-foreground">
                    <ExternalLink className="w-4 h-4" />
                    Website
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.owned}</div>
              <div className="text-sm text-muted-foreground">Owned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.created}</div>
              <div className="text-sm text-muted-foreground">Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.sold}</div>
              <div className="text-sm text-muted-foreground">Sold</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.totalVolume}</div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.floorValue}</div>
              <div className="text-sm text-muted-foreground">Floor Value</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="owned">Owned ({user.stats.owned})</TabsTrigger>
              <TabsTrigger value="created">Created ({user.stats.created})</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search items..." className="pl-10 w-64" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Public NFTs */}
          <TabsContent value="owned">
            <div
              className={`grid gap-6 ${
                viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
              }`}
            >
              {publicNFTs.map((nft) => (
                <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <Link href={`/nft/${nft.id}`}>
                    <div className="aspect-square relative">
                      <Image
                        src={nft.image || "/placeholder.svg"}
                        alt={nft.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <div className="bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {nft.views}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-black/70 text-white hover:bg-black/80 w-8 h-8 p-0 rounded-full"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className={getRarityColor(nft.rarity)}>{nft.rarity}</Badge>
                      </div>
                      {nft.isListed && (
                        <div className="absolute bottom-3 left-3">
                          <Badge className="bg-green-100 text-green-800">For Sale</Badge>
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">{nft.collection}</div>
                    <h3 className="font-semibold mb-2 truncate">{nft.name}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm text-muted-foreground">{nft.isListed ? "Price" : "Last Sale"}</div>
                        <div className="font-bold">{nft.price || nft.lastSale}</div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        {nft.likes}
                      </div>
                    </div>
                    <Button className="w-full" variant={nft.isListed ? "default" : "outline"} asChild>
                      <Link href={`/nft/${nft.id}`}>{nft.isListed ? "Buy Now" : "View Details"}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="created">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">No created items to display</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
