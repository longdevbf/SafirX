"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Heart,
  Share2,
  MoreHorizontal,
  Clock,
  Eye,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  Flag,
  Gavel,
  ShoppingCart,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function NFTDetailPage({ params }: { params: { id: string } }) {
  const [isLiked, setIsLiked] = useState(false)
  const [bidAmount, setBidAmount] = useState("")

  // Mock data - in real app, fetch based on params.id
  const nft = {
    id: 1,
    name: "Cosmic Ape #1234",
    collection: "Cosmic Apes",
    image: "/images/nft-sample.jpg",
    description:
      "A rare and unique Cosmic Ape from the depths of space. This NFT features extraordinary cosmic powers and is one of the most sought-after pieces in the collection.",
    price: "3.2 ETH",
    usdPrice: "$6,240",
    lastSale: "2.8 ETH",
    timeLeft: "2h 15m 30s",
    isAuction: true,
    views: 1234,
    likes: 89,
    verified: true,
    rarity: "Rare",
    owner: {
      address: "0x1234...5678",
      name: "CryptoCollector",
      avatar: "/placeholder-user.jpg",
      verified: true,
    },
    creator: {
      address: "0x8765...4321",
      name: "CosmicArtist",
      avatar: "/placeholder-user.jpg",
      verified: true,
    },
    properties: [
      { trait_type: "Background", value: "Cosmic Purple", rarity: "12%" },
      { trait_type: "Fur", value: "Golden", rarity: "8%" },
      { trait_type: "Eyes", value: "Laser Blue", rarity: "5%" },
      { trait_type: "Accessory", value: "Space Helmet", rarity: "3%" },
    ],
    contractAddress: "0xabcd...ef12",
    tokenId: "1234",
    blockchain: "Ethereum",
    royalties: "5%",
  }

  const bidHistory = [
    { bidder: "0x1234...5678", amount: "3.2 ETH", time: "2 minutes ago", usd: "$6,240" },
    { bidder: "0x8765...4321", amount: "3.0 ETH", time: "15 minutes ago", usd: "$5,850" },
    { bidder: "0x9876...1234", amount: "2.8 ETH", time: "1 hour ago", usd: "$5,460" },
    { bidder: "0x2468...1357", amount: "2.5 ETH", time: "2 hours ago", usd: "$4,875" },
  ]

  const priceHistory = [
    { event: "Sale", price: "2.8 ETH", from: "0x1111...2222", to: "0x3333...4444", date: "2 days ago" },
    { event: "Transfer", price: "-", from: "0x5555...6666", to: "0x1111...2222", date: "1 week ago" },
    { event: "Mint", price: "0.1 ETH", from: "0x0000...0000", to: "0x5555...6666", date: "2 weeks ago" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-square relative">
                <Image src={nft.image || "/placeholder.svg"} alt={nft.name} fill className="object-cover" />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-black/70 text-white hover:bg-black/80 rounded-full"
                    onClick={() => setIsLiked(!isLiked)}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-red-500" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-black/70 text-white hover:bg-black/80 rounded-full"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Etherscan
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {nft.isAuction && nft.timeLeft && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {nft.timeLeft}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {nft.properties.map((property, index) => (
                    <div key={index} className="border rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{property.trait_type}</div>
                      <div className="font-semibold">{property.value}</div>
                      <div className="text-xs text-blue-600">{property.rarity} have this trait</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href={`/collection/${nft.collection}`} className="text-blue-600 hover:underline">
                  {nft.collection}
                </Link>
                {nft.verified && <Star className="w-4 h-4 text-blue-500 fill-current" />}
              </div>
              <h1 className="text-3xl font-bold mb-4">{nft.name}</h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {nft.views} views
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {nft.likes} favorites
                </div>
              </div>

              <p className="text-muted-foreground">{nft.description}</p>
            </div>

            {/* Owner & Creator */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">Owned by</div>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={nft.owner.avatar || "/placeholder.svg"} />
                      <AvatarFallback>OW</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {nft.owner.name}
                        {nft.owner.verified && <Star className="w-3 h-3 text-blue-500 fill-current" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{nft.owner.address}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">Created by</div>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={nft.creator.avatar || "/placeholder.svg"} />
                      <AvatarFallback>CR</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {nft.creator.name}
                        {nft.creator.verified && <Star className="w-3 h-3 text-blue-500 fill-current" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{nft.creator.address}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price & Action */}
            <Card>
              <CardContent className="p-6">
                {nft.isAuction ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Current bid</div>
                        <div className="text-2xl font-bold">{nft.price}</div>
                        <div className="text-sm text-muted-foreground">{nft.usdPrice}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Auction ends in</div>
                        <div className="text-lg font-semibold text-red-600">{nft.timeLeft}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter bid amount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button className="px-8">
                        <Gavel className="w-4 h-4 mr-2" />
                        Place Bid
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      You must bid at least {Number.parseFloat(nft.price.split(" ")[0]) + 0.1} ETH
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Current price</div>
                      <div className="text-2xl font-bold">{nft.price}</div>
                      <div className="text-sm text-muted-foreground">{nft.usdPrice}</div>
                    </div>

                    <Button className="w-full" size="lg">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>

                    <Button variant="outline" className="w-full bg-transparent">
                      Make Offer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="bids" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bids">
                  <Users className="w-4 h-4 mr-2" />
                  Bids
                </TabsTrigger>
                <TabsTrigger value="history">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="bids" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    {bidHistory.length > 0 ? (
                      <div className="space-y-3">
                        {bidHistory.map((bid, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>{bid.bidder.slice(2, 4).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{bid.amount}</div>
                                <div className="text-xs text-muted-foreground">{bid.usd}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">{bid.bidder}</div>
                              <div className="text-xs text-muted-foreground">{bid.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No bids yet. Be the first to bid!</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {priceHistory.map((event, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <div className="font-medium">{event.event}</div>
                            <div className="text-sm text-muted-foreground">
                              {event.price !== "-" && `${event.price} • `}
                              {event.date}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div>From: {event.from}</div>
                            <div>To: {event.to}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract Address</span>
                        <span className="font-mono text-sm">{nft.contractAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID</span>
                        <span className="font-mono">{nft.tokenId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Blockchain</span>
                        <span>{nft.blockchain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Creator Royalties</span>
                        <span>{nft.royalties}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rarity Rank</span>
                        <Badge className="bg-purple-100 text-purple-800">{nft.rarity}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
