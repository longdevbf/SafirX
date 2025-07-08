"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ConnectWallet } from "@/components/ConnectWallet"
import { useWallet } from "@/context/walletContext"
import { useUserProfile } from "@/hooks/useUserProfile"
import {
  Search,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Plus,
  TrendingUp,
  Grid3X3,
  Gavel,
  Heart,
  Lock,
  
  Copy,
} from "lucide-react"
import { useMarketplace } from "@/context/marketplaceContext"
export default function Header() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loading: isLoading, nfts } = useMarketplace()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isConnected, address, disconnect } = useWallet()
  const { user, loading } = useUserProfile()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
  const renderMarketplaceStatus = () => {
    return null
  }
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      // Optional: Add toast notification here
    }
  }

  // Get user avatar with fallback
  const getUserAvatar = () => {
    if (user?.m_img && user.m_img.trim() !== '') {
      return user.m_img
    }
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`
  }

  // Get user display name with fallback
  const getUserDisplayName = () => {
    if (user?.name && user.name.trim() !== '') {
      return user.name
    }
    return 'My Wallet'
  }

  // Get user initials for fallback
  const getUserInitials = () => {
    if (user?.name && user.name.trim() !== '') {
      return user.name.slice(0, 2).toUpperCase()
    }
    return address ? address.slice(2, 4).toUpperCase() : 'U'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            
               <img 
              src="/assets/logo.png" 
              alt="SafirX Logo" 
              className="w-29 h-29 object-contain"/>
            
            
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1">
                  <Grid3X3 className="w-4 h-4" />
                  Explore
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/marketplace" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Marketplace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/create/collection" className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Collections
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/auctions" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Sealed Auctions
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/marketplace" className="text-sm font-medium hover:text-primary transition-colors">
              Marketplace
            </Link>
            <Link href="/auctions" className="text-sm font-medium hover:text-primary transition-colors">
              Auctions
            </Link>
            <Link href="/create" className="text-sm font-medium hover:text-primary transition-colors">
              Create
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search collections, NFTs, and accounts" className="pl-10 pr-4" />
              {renderMarketplaceStatus()}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Create Button */}
            <Button variant="outline" size="sm" className="hidden md:flex bg-transparent" asChild>
              <Link href="/create">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Link>
            </Button>

            {/* Wallet Connection */}
            {!isConnected ? (
              <div className="hidden md:flex">
                <ConnectWallet />
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-muted">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={getUserAvatar()} 
                        alt="User Avatar"
                        onError={(e) => {
                          console.error('Header avatar failed to load:', getUserAvatar())
                          // Fallback to dicebear on error
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={getUserAvatar()} 
                            alt="User Avatar"
                            onError={(e) => {
                              console.error('Dropdown avatar failed to load:', getUserAvatar())
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
                            }}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{getUserDisplayName()}</p>
                          <p className="text-xs text-muted-foreground">
                            {loading ? 'Loading...' : 'Connected'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {address && formatAddress(address)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={copyAddress}
                          className="h-6 w-6 p-0 hover:bg-muted"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create" className="flex items-center gap-2 cursor-pointer">
                      <Plus className="w-4 h-4" />
                      Create NFT
                    </Link>
                  </DropdownMenuItem>
                 
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => disconnect()}
                    className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Wallet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search collections, NFTs..." className="pl-10 pr-4" />
              </div>
              
              {/* Mobile User Info when connected */}
              {isConnected && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={getUserAvatar()} 
                      alt="User Avatar"
                      onError={(e) => {
                        console.error('Mobile avatar failed to load:', getUserAvatar())
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
                      }}
                    />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {address && formatAddress(address)}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyAddress}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <nav className="flex flex-col space-y-2">
                <Link
                  href="/marketplace"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <TrendingUp className="w-4 h-4" />
                  Marketplace
                </Link>
                <Link
                  href="/collections"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Collections
                </Link>
                <Link
                  href="/auctions"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Gavel className="w-4 h-4" />
                  Auctions
                </Link>
                <Link
                  href="/create"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Plus className="w-4 h-4" />
                  Create
                </Link>
                {isConnected && (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/favorites"
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Heart className="w-4 h-4" />
                      Favorites
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-muted rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </>
                )}
              </nav>
              
              {!isConnected ? (
                <div className="w-full">
                  <ConnectWallet />
                </div>
              ) : (
                <Button 
                  onClick={() => {
                    disconnect()
                    setIsMenuOpen(false)
                  }} 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
