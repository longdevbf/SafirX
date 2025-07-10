/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  Copy,
  ExternalLink,
  Share2,
  Grid3X3,
  List,
  Filter,
  Search,
  Heart,
  Tag,
  Activity,

  Star,
  AlertCircle,
  RefreshCw,
  Edit,
  Gavel,
  Package,
  Loader2,
  X,
  CheckCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useWallet } from "@/context/walletContext"
import { useWalletNFTs } from "@/hooks/use-walletNFTs"
import { ProcessedNFT } from "@/interfaces/nft"
//import { UserProfile } from "@/interfaces/user"
import UserSettings from "@/components/UserSettings"
import { useUserProfile } from '@/hooks/useUserProfile'
import { useNFTMarket } from "@/hooks/use-market"
import { useSealedBidAuction } from "@/hooks/use-auction"
import { useAuctionApproval } from "@/hooks/use-auction-approval"
import CollectionSelector, { CollectionSellData } from "@/components/collectionSelection"
import AuctionCollectionSelector, { CollectionAuctionData } from "@/components/AuctionCollectionSelector"
import React from "react"
import { toast } from "@/hooks/use-toast"
import { readContract } from "wagmi/actions"
import { ERC721_ABI } from "@/abis/MarketABI"
import { config } from "@/components/config/wagmiConfig"
import { Checkbox } from "@/components/ui/checkbox"
import { syncListingToDatabase, syncAuctionToDatabase, prepareListingData, prepareAuctionData } from "@/utils/syncToDatabase"
import { getListingIdFromTransaction, getLatestListingIdForUser } from "@/utils/getListingIdFromTransaction"

interface UserProfile {
  name: string
  description: string
  w_address: string
  m_img?: string | undefined
  b_img?: string | undefined
}
export default function ProfilePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTab, setSelectedTab] = useState("owned")
  const [showSettings, setShowSettings] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<ProcessedNFT | null>(null)
  const [sellPrice, setSellPrice] = useState("")
  const [sellType, setSellType] = useState("fixed")
  const [sellDescription, setSellDescription] = useState("")
  const [sellCategory, setSellCategory] = useState("")
  const [showCollectionSelector, setShowCollectionSelector] = useState(false)
  const [isListingNFT, setIsListingNFT] = useState(false)
  const [isCollectionListing, setIsCollectionListing] = useState(false)
  const [lastTransactionHash, setLastTransactionHash] = useState<string>('')
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error' | 'waiting_approval' | 'approval_success'>('idle')
  const [currentTransactionType, setCurrentTransactionType] = useState<'single' | 'collection' | 'approval' | null>(null)
  const [successfulNFTId, setSuccessfulNFTId] = useState<string | null>(null) // Track which NFT was successfully listed
  const [collectionApprovalStatus, setCollectionApprovalStatus] = useState<{ [key: string]: boolean }>({}) // Track approval status per collection
  const [marketplaceApprovalStatus, setMarketplaceApprovalStatus] = useState<{ [key: string]: boolean }>({}) // ✅ NEW: Track marketplace approval status per collection

  // ✅ NEW: Auction states
  const [showAuctionDialog, setShowAuctionDialog] = useState(false)
  const [selectedAuctionNFT, setSelectedAuctionNFT] = useState<ProcessedNFT | null>(null)
  const [showAuctionCollectionSelector, setShowAuctionCollectionSelector] = useState(false)
  //const [auctionApprovalStatus, setAuctionApprovalStatus] = useState<{ [key: string]: boolean }>({})
  const [auctionData, setAuctionData] = useState({
    startingPrice: "",
    reservePrice: "",
    minBidIncrement: "0.1",
    duration: 24,
    allowPublicReveal: false,
    title: "",
    description: ""
  })

  // ✅ NEW: Success notification timer
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successNotificationMessage, setSuccessNotificationMessage] = useState("")

  const { address, isConnected } = useWallet()
  const { nfts, loading, error, total, refetch } = useWalletNFTs()
  const { refreshProfile } = useUserProfile()

  // NFT Market hooks
  const {
    listSingleNFT,
    listCollectionBundle,
    listCollectionIndividual,
    listCollectionSamePrice,
    approveNFT,
    hash: marketHash,
    error: marketError,
    isPending: isMarketPending,
    isConfirming: isMarketConfirming,
    isConfirmed: isMarketConfirmed,
  } = useNFTMarket()

  // ✅ NEW: Auction hooks
  const {
    createSingleNFTAuction,
    createCollectionAuction,
    hash: auctionHash,
    error: auctionError,
    isPending: isAuctionPending,
    isConfirming: isAuctionConfirming,
    isConfirmed: isAuctionConfirmed,
  } = useSealedBidAuction()
  
  // ✅ NEW: Auction approval hook
  const {
    isApproved: isAuctionApproved,
    approveForAuction,
    refetchApproval: refetchAuctionApproval,
    hash: approvalHash,
    isPending: isApprovalPending,
    isConfirming: isApprovalConfirming,
    isConfirmed: isApprovalConfirmed,
  } = useAuctionApproval(selectedAuctionNFT?.contractAddress || '', address)

  // ✅ IMPROVED: Handle transaction success - track transaction type properly
  React.useEffect(() => {
    if (isMarketConfirmed && marketHash && marketHash !== lastTransactionHash) {
      // ✅ Update transaction hash and status
      setLastTransactionHash(marketHash)

      // ✅ FIXED: Handle different transaction types properly
      if (currentTransactionType === 'approval') {
        setTransactionStatus('approval_success')

        // ✅ NEW: Update marketplace approval status locally
        if (selectedNFT) {
          setMarketplaceApprovalStatus(prev => ({
            ...prev,
            [selectedNFT.contractAddress]: true
          }))
        }

        toast({
          title: "✅ Approval Successful!",
          description: (
            <div className="space-y-2">
              <p>Your NFT collection has been approved for the marketplace!</p>
              <p className="text-sm text-blue-600 font-medium">You can now proceed to list your NFT for sale.</p>
              <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                Tx: {marketHash.slice(0, 10)}...{marketHash.slice(-6)}
              </div>
              <a
                href={`https://testnet.explorer.sapphire.oasis.dev/tx/${marketHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs block"
              >
                View on Explorer →
              </a>
            </div>
          ),
          duration: 8000,
        })

        // Reset loading states for approval but keep dialog open
        setIsListingNFT(false)
        setIsCollectionListing(false)
        setCurrentTransactionType(null) // ✅ Reset transaction type so user can proceed with listing

      } else {
        // For listing transactions (single or collection)
        setTransactionStatus('success')

        // ✅ FIXED: Track which NFT was successfully listed
        if (currentTransactionType === 'single' && selectedNFT) {
          setSuccessfulNFTId(`${selectedNFT.contractAddress}-${selectedNFT.tokenId}`)
          
          // ✅ NEW: Get real listing ID from transaction and sync to database
          const syncWithRealListingId = async () => {
            try {
              console.log('🔍 Getting real listing ID from transaction:', marketHash)
              
              // Try to get listing ID from transaction logs
              const { listingId, collectionId, type } = await getListingIdFromTransaction(marketHash)
              
              let realListingId = listingId || collectionId
              
              // Fallback: Get latest listing ID for user if transaction parsing fails
              if (!realListingId) {
                console.log('⚠️ Could not get listing ID from transaction, trying user-specific fallback...')
                realListingId = await getLatestListingIdForUser(address || '')
              }
              
              // Final fallback: Get absolute latest listing ID
              if (!realListingId) {
                console.log('⚠️ Could not find user-specific listing, trying absolute latest fallback...')
                const { getAbsoluteLatestListingId } = await import('@/utils/getListingIdFromTransaction')
                realListingId = await getAbsoluteLatestListingId()
              }
              
              if (!realListingId) {
                console.error('❌ Could not determine real listing ID using any method, skipping database sync')
                return // Don't sync with transaction hash
              }
              
              console.log('✅ Using listing ID for database sync:', realListingId)
              
              const listingData = prepareListingData(
                realListingId, // Use real listing ID instead of transaction hash
                selectedNFT.contractAddress,
                selectedNFT.tokenId,
                address || '',
                sellPrice,
                marketHash,
                {
                  name: selectedNFT.name,
                  description: sellDescription,
                  category: sellCategory,
                  image: selectedNFT.image || '/placeholder-nft.jpg',
                  attributes: selectedNFT.attributes || [],
                  rarity: selectedNFT.rarity || 'Common',
                  collectionName: selectedNFT.collectionName
                }
              )
              
              // Sync to database
              const success = await syncListingToDatabase(listingData)
              if (success) {
                console.log('✅ Successfully synced listing to database with real ID:', realListingId)
              } else {
                console.error('❌ Failed to sync listing to database')
              }
              
            } catch (error) {
              console.error('❌ Error during database sync with real listing ID:', error)
            }
          }
          
          // Execute async sync
          syncWithRealListingId()
        } else if (currentTransactionType === 'collection') {
          // ✅ NEW: Handle collection listing success
          const syncCollectionToDatabase = async () => {
            try {
              console.log('🔍 Syncing collection to database from transaction:', marketHash)
              
              // Get collection data from window storage
              const collectionData = (window as any).pendingCollectionData as CollectionSellData
              if (!collectionData) {
                console.error('❌ No pending collection data found')
                return
              }
              
              console.log('📋 Collection data to sync:', collectionData)
              
              // Get real listing/collection ID from transaction
              const { listingId, collectionId } = await getListingIdFromTransaction(marketHash)
              const realId = collectionId || listingId
              
              if (!realId) {
                console.error('❌ Could not get collection ID from transaction')
                return
              }
              
              console.log('🆔 Real collection ID:', realId)
              
              // Get detailed NFT metadata for each selected NFT
              const nftDetails = await Promise.all(
                collectionData.tokenIds.map(async (tokenId, index) => {
                  // Find the NFT in our current NFT list
                  const nftFromList = nfts.find(n => 
                    n.contractAddress === collectionData.nftContract && 
                    n.tokenId === tokenId
                  )
                  
                  const price = collectionData.listingType === 'bundle' ? 0 : 
                              collectionData.listingType === 'same-price' ? parseFloat(collectionData.samePricePerItem || '0') :
                              parseFloat(collectionData.individualPrices?.[index] || '0')
                  
                  return {
                    listing_id: collectionData.listingType === 'bundle' ? realId : `${realId}-${tokenId}`,
                    token_id: tokenId,
                    price: price,
                    nft_name: nftFromList?.name || `${collectionData.collectionName} #${tokenId}`,
                    nft_description: nftFromList?.description || collectionData.collectionDescription || '',
                    nft_image: nftFromList?.image || collectionData.collectionImage || '/placeholder-nft.jpg',
                    nft_attributes: JSON.stringify(nftFromList?.attributes || []),
                    nft_rarity: nftFromList?.rarity || 'Common'
                  }
                })
              )
              
              console.log('📊 NFT details for database:', nftDetails)
              
              // Handle IPFS cover image URL (no file ID needed for IPFS)
              const coverImageDriveId = '' // Not used for IPFS URLs
              console.log('🖼️ Cover image URL (IPFS):', collectionData.collectionImage)
              
              // Create collection payload for unified listings table
              const collectionPayload = {
                collection_id: realId,
                name: collectionData.collectionName,
                description: collectionData.collectionDescription || '',
                cover_image_url: collectionData.collectionImage || '',
                cover_image_drive_id: coverImageDriveId,
                creator_address: address || '',
                contract_address: collectionData.nftContract,
                is_bundle: collectionData.listingType === 'bundle',
                bundle_price: collectionData.bundlePrice ? parseFloat(collectionData.bundlePrice) : null,
                listing_type: collectionData.listingType === 'bundle' ? 1 : collectionData.listingType === 'same-price' ? 2 : 0,
                tx_hash: marketHash,
                total_items: collectionData.tokenIds.length,
                items: nftDetails
              }
              
              console.log('🚀 Sending collection payload to API:', collectionPayload)
              
              const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(collectionPayload)
              })
              
              if (response.ok) {
                const result = await response.json()
                console.log('✅ Collection synced to database successfully:', result)
                
                // Clear pending data
                delete (window as any).pendingCollectionData
                
                toast({
                  title: "💾 Collection Saved",
                  description: `Successfully saved ${result.total_items} NFTs to marketplace database`,
                  duration: 5000,
                })
                
              } else {
                const errorData = await response.json()
                console.error('❌ Failed to sync collection to database:', errorData)
                
                toast({
                  title: "⚠️ Database Sync Warning",
                  description: "Collection was listed on blockchain but database sync failed. Contact support if needed.",
                  variant: "destructive",
                  duration: 10000,
                })
              }
              
            } catch (error) {
              console.error('❌ Error syncing collection to database:', error)
              
              toast({
                title: "⚠️ Database Sync Error",
                description: "Collection was listed on blockchain but database sync failed. Contact support if needed.",
                variant: "destructive",
                duration: 10000,
              })
            }
          }
          
          // Execute async sync
          syncCollectionToDatabase()
        }

        const isCollection = currentTransactionType === 'collection'

        toast({
          title: isCollection ? "🎉 Collection Listed Successfully!" : "🎉 NFT Listed Successfully!",
          description: (
            <div className="space-y-2">
              <p>{isCollection ? "Your collection has been listed on the marketplace!" : "Your NFT has been listed on the marketplace!"}</p>
              <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                Tx: {marketHash.slice(0, 10)}...{marketHash.slice(-6)}
              </div>
              <a
                href={`https://testnet.explorer.sapphire.oasis.dev/tx/${marketHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs block"
              >
                View on Explorer →
              </a>
            </div>
          ),
          duration: 15000,
        })

        // ✅ Reset loading states only
        setIsListingNFT(false)
        setIsCollectionListing(false)

        // ✅ Delayed refresh
        const timeoutId = setTimeout(() => {
          refetch()
        }, 3000)

        return () => clearTimeout(timeoutId)
      }
    }
  }, [isMarketConfirmed, marketHash, lastTransactionHash, selectedNFT, sellPrice, currentTransactionType, refetch])

  // ✅ Update transaction status based on market state
  React.useEffect(() => {
    if (isMarketPending) {
      setTransactionStatus('pending')
    } else if (isMarketConfirming) {
      setTransactionStatus('confirming')
    }
  }, [isMarketPending, isMarketConfirming])

  // ✅ Reset transaction hash when starting new transaction
  React.useEffect(() => {
    if (isMarketPending && lastTransactionHash) {
      setLastTransactionHash('')
      setTransactionStatus('pending')
    }
  }, [isMarketPending, lastTransactionHash])

  // ✅ NEW: Effect to handle post-approval state management
  React.useEffect(() => {
    if (transactionStatus === 'approval_success' && selectedNFT) {
      // Add a delay to ensure blockchain state is updated
      const timeoutId = setTimeout(() => {
        console.log('🔄 Clearing approval cache after successful approval to force fresh check on next listing attempt')
        // Don't clear the cache immediately - let user try listing first
        // Only clear if they encounter issues
      }, 5000)

      return () => clearTimeout(timeoutId)
    }
  }, [transactionStatus, selectedNFT])

  // ✅ NEW: Clear approval cache periodically to ensure fresh checks
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Clear approval cache every 2 minutes to ensure fresh checks
      if (Object.keys(marketplaceApprovalStatus).length > 0) {
        console.log('🧹 Periodic cleanup of approval cache')
        setMarketplaceApprovalStatus({})
      }
    }, 120000) // 2 minutes

    return () => clearInterval(interval)
  }, [marketplaceApprovalStatus])
  React.useEffect(() => {
    if (marketError) {
      setTransactionStatus('error')

      const isCollection = currentTransactionType === 'collection'
      const isApproval = currentTransactionType === 'approval'

      let title = "❌ Transaction Failed"
      if (isApproval) {
        title = isCollection ? "❌ Collection Approval Failed" : "❌ NFT Approval Failed"
      } else {
        title = isCollection ? "❌ Collection Listing Failed" : "❌ NFT Listing Failed"
      }

      toast({
        title,
        description: marketError.message || "Transaction failed. Please try again.",
        variant: "destructive"
      })

      setIsListingNFT(false)
      setIsCollectionListing(false)
    }
  }, [marketError, currentTransactionType])

  // Safe format address function
  const formatAddress = (addr?: string) => {
    if (!addr || addr.length < 10) return 'Unknown Address'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Copy address function
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  // Fetch user data
  useEffect(() => {
    if (address && isConnected) {
      fetchUserData()
    }
  }, [address, isConnected])

  const fetchUserData = async () => {
    if (!address) return

    setUserLoading(true)
    try {
      const response = await fetch(`/api/users?address=${address}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser({
          name: 'User',
          description: 'Digital art enthusiast and NFT collector',
          w_address: address,
          m_img: undefined,
          b_img: undefined
        })
      }
    } catch (error) {
      console.log(error)
      setUser({
        name: 'User',
        description: 'Digital art enthusiast and NFT collector',
        w_address: address,
        m_img: '',
        b_img: ''
      })
    } finally {
      setUserLoading(false)
    }
  }

  const handleSaveSettings = async (updatedUser: UserProfile) => {
    setUser(updatedUser)
    setShowSettings(false)

    setTimeout(async () => {
      await fetchUserData()
      await refreshProfile()
      refetch()
    }, 1000)
  }

  // ✅ Check collection approval status
  const checkCollectionApproval = async (contractAddress: string) => {
    try {
      const approvalResponse = await fetch('/api/check-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          owner: address,
          marketAddress: '0x8002ac81e5f35fA4C4a3972f021e317EC2fCa4fF'
        })
      })

      if (approvalResponse.ok) {
        const result = await approvalResponse.json()
        setCollectionApprovalStatus(prev => ({
          ...prev,
          [contractAddress]: result.isApproved
        }))
        return result.isApproved
      }
    } catch (error) {
      console.log(error)
      // Fallback to false if check fails
    }
    return false
  }

  // ✅ FIXED: Collection listing function with proper approval handling
  const handleListCollection = async (data: CollectionSellData) => {
    setIsCollectionListing(true)
    setTransactionStatus('idle')
    setLastTransactionHash('')
    setCurrentTransactionType('collection')

    try {
      // ✅ STEP 1: Check if collection is approved for marketplace
      toast({
        title: "🔍 Checking Collection Approval",
        description: "Verifying marketplace permissions...",
      })

      const isApproved = await checkCollectionApproval(data.nftContract)

      // ✅ STEP 2: If not approved, request approval first
      if (!isApproved) {
        toast({
          title: "🔒 Approval Required",
          description: "Please approve your NFT collection for marketplace first. This is a one-time action per collection.",
        })

        try {
          setCurrentTransactionType('approval')
          await approveNFT(data.nftContract)

          toast({
            title: "✅ Approval Sent",
            description: "Please confirm the approval transaction, then try 'List Collection' again after approval is confirmed.",
            duration: 10000,
          })

          setIsCollectionListing(false)
          setTransactionStatus('waiting_approval')
          setCurrentTransactionType('approval')
          return

        } catch (approvalError) {
          const errorMessage = approvalError as string || approvalError?.toString() || ''

          if (errorMessage.toLowerCase().includes('user rejected') ||
            errorMessage.toLowerCase().includes('user denied')) {
            toast({
              title: "❌ Approval Cancelled",
              description: "You cancelled the approval transaction.",
            })
          } else {
            toast({
              title: "❌ Approval Failed",
              description: errorMessage || "Failed to approve NFT collection. Please try again.",
              variant: "destructive"
            })
          }

          setIsCollectionListing(false)
          setTransactionStatus('error')
          setCurrentTransactionType(null)
          return
        }
      }

    
      toast({
        title: "🚀 Submitting Collection Listing",
        description: "Please confirm the listing transaction in your wallet...",
      })

      // Store collection data for later database sync
      ;(window as any).pendingCollectionData = data
      setCurrentTransactionType('collection')

      if (data.listingType === 'bundle') {
        if (!data.bundlePrice) {
          throw new Error('Bundle price is required for bundle listing')
        }

        await listCollectionBundle(
          data.nftContract,
          data.tokenIds,
          data.bundlePrice,
          data.collectionName
        )

      } else if (data.listingType === 'individual') {
        if (!data.individualPrices || data.individualPrices.length !== data.tokenIds.length) {
          throw new Error('Individual prices are required and must match the number of tokens')
        }

        await listCollectionIndividual(
          data.nftContract,
          data.tokenIds,
          data.individualPrices,
          data.collectionName
        )

      } else if (data.listingType === 'same-price') {
        if (!data.samePricePerItem) {
          throw new Error('Same price per item is required for same-price listing')
        }

        await listCollectionSamePrice(
          data.nftContract,
          data.tokenIds,
          data.samePricePerItem,
          data.collectionName
        )

      } else {
        throw new Error(`Unknown listing type: ${data.listingType}`)
      }

      toast({
        title: "⏳ Transaction Submitted",
        description: "Waiting for blockchain confirmation...",
      })

    } catch (error) {
      const errorMessage = error as string || error?.toString() || ''

      if (errorMessage.toLowerCase().includes('user rejected') ||
        errorMessage.toLowerCase().includes('user denied')) {
        toast({
          title: "❌ Transaction Cancelled",
          description: "You cancelled the transaction.",
        })
      } else if (errorMessage.toLowerCase().includes('not approved')) {
        toast({
          title: "❌ Approval Required",
          description: "Your NFT collection needs to be approved for the marketplace first.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "❌ Collection Listing Failed",
          description: errorMessage || "Failed to list collection. Please try again.",
          variant: "destructive"
        })
      }

      setIsCollectionListing(false)
      setTransactionStatus('error')
      setCurrentTransactionType(null)
    }
  }

  // ✅ Fixed Single NFT listing function with proper approval handling
  const handleListSingleNFT = async () => {
    if (!selectedNFT || !sellPrice || parseFloat(sellPrice) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      })
      return
    }

    console.log('🚀 Starting NFT listing process for:', selectedNFT.contractAddress, selectedNFT.tokenId)
    console.log('💰 Price:', sellPrice, 'ROSE')
    console.log('📋 Current approval cache:', marketplaceApprovalStatus)

    setIsListingNFT(true)
    setTransactionStatus('idle')
    setCurrentTransactionType('single')

    try {
      // ✅ STEP 1: Check if NFT is approved for marketplace
      toast({
        title: "🔍 Checking NFT Approval",
        description: "Verifying marketplace permissions...",
      })

      let isApproved = false

      // ✅ First check local cache
      const cachedApproval = marketplaceApprovalStatus[selectedNFT.contractAddress]
      if (cachedApproval) {
        console.log('✅ Using cached approval status for', selectedNFT.contractAddress)
        isApproved = true
      } else {
        // ✅ Check via API and fallback to direct contract call
        try {
          const approvalResponse = await fetch('/api/check-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress: selectedNFT.contractAddress,
              owner: address,
              marketAddress: '0x8002ac81e5f35fA4C4a3972f021e317EC2fCa4fF'
            })
          })

          if (approvalResponse.ok) {
            const result = await approvalResponse.json()
            isApproved = result.isApproved
            console.log('📋 API approval check result:', isApproved)
          }
        } catch (apiError) {
          console.log('⚠️ API check failed, trying direct contract call', apiError)
          try {
            const approvalStatus = await readContract(config, {
              address: selectedNFT.contractAddress as `0x${string}`,
              abi: ERC721_ABI,
              functionName: 'isApprovedForAll',
              args: [address as `0x${string}`, '0xd1DCE6BF2716310753Fc662B044D323a9EFC3B4' as `0x${string}`]
            })
            isApproved = Boolean(approvalStatus)
            console.log('🔗 Direct contract approval check result:', isApproved)
          } catch (contractError) {
            console.error('❌ Contract approval check failed:', contractError)
            isApproved = false
          }
        }

        // ✅ Update local cache if approved
        if (isApproved) {
          setMarketplaceApprovalStatus(prev => ({
            ...prev,
            [selectedNFT.contractAddress]: true
          }))
        }
      }

      console.log('🎯 Final approval status for', selectedNFT.contractAddress, ':', isApproved)

      // ✅ STEP 2: If not approved, request approval first
      if (!isApproved) {
        console.log('❌ NFT not approved for marketplace, requesting approval...')
        toast({
          title: "🔒 Approval Required",
          description: "Please approve your NFT for marketplace first. This is a one-time action per collection.",
        })

        try {
          setCurrentTransactionType('approval')
          await approveNFT(selectedNFT.contractAddress)

          toast({
            title: "✅ Approval Sent",
            description: "Please confirm the approval transaction. The listing dialog will remain open - click 'List for Sale' again after approval is confirmed.",
            duration: 8000,
          })

          setIsListingNFT(false)
          setTransactionStatus('waiting_approval')
          setCurrentTransactionType('approval')
          return

        } catch (approvalError) {
          const errorMessage = approvalError as string || approvalError?.toString() || ''
          console.error('❌ Approval failed:', errorMessage)

          if (errorMessage.toLowerCase().includes('user rejected') ||
            errorMessage.toLowerCase().includes('user denied')) {
            toast({
              title: "❌ Approval Cancelled",
              description: "You cancelled the approval transaction.",
            })
          } else {
            toast({
              title: "❌ Approval Failed",
              description: errorMessage || "Failed to approve NFT. Please try again.",
              variant: "destructive"
            })
          }

          setIsListingNFT(false)
          setTransactionStatus('error')
          setCurrentTransactionType(null)
          return
        }
      }

      console.log('✅ NFT is approved for marketplace, proceeding with listing...')

      // ✅ STEP 3: NFT is approved, proceed with listing
      toast({
        title: "🚀 Submitting NFT Listing",
        description: "Please confirm the listing transaction in your wallet...",
      })

      setCurrentTransactionType('single')
      await listSingleNFT(
        selectedNFT.contractAddress,
        selectedNFT.tokenId,
        sellPrice
      )

      toast({
        title: "⏳ Transaction Submitted",
        description: "Waiting for blockchain confirmation...",
      })

    } catch (error) {
      const errorMessage = error as string || error?.toString() || ''

      if (errorMessage.toLowerCase().includes('user rejected') ||
        errorMessage.toLowerCase().includes('user denied')) {
        toast({
          title: "❌ Transaction Cancelled",
          description: "You cancelled the transaction.",
        })
      } else if (errorMessage.toLowerCase().includes('not approved')) {
        toast({
          title: "❌ Approval Required",
          description: "Your NFT needs to be approved for the marketplace first.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "❌ Listing Failed",
          description: errorMessage || "Failed to list NFT. Please try again.",
          variant: "destructive"
        })
      }

      setIsListingNFT(false)
      setTransactionStatus('error')
      setCurrentTransactionType(null)
    }
  }

  // ✅ Manual close functions
  const handleCloseSingleNFTDialog = () => {
    setSelectedNFT(null)
    setSellPrice('')
    setSellDescription('')
    setSellCategory('')
    setTransactionStatus('idle')
    setLastTransactionHash('')
    setCurrentTransactionType(null)
    setSuccessfulNFTId(null) // ✅ Reset successful NFT tracking
  }

  const handleCloseCollectionDialog = () => {
    setShowCollectionSelector(false)
    setTransactionStatus('idle')
    setLastTransactionHash('')
    setCurrentTransactionType(null)
    setSuccessfulNFTId(null) // ✅ Reset successful NFT tracking
  }

  // ✅ NEW: Clear approval cache for a specific contract
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearApprovalCache = (contractAddress: string) => {
    setMarketplaceApprovalStatus(prev => {
      const updated = { ...prev }
      delete updated[contractAddress]
      return updated
    })
  }

  // ✅ NEW: Success notification helper
  const showSuccessMessage = (message: string, txHash: string) => {
    setSuccessNotificationMessage(`${message} | Tx: ${txHash.slice(0, 8)}...${txHash.slice(-6)}`)
    setShowSuccessNotification(true)
    setTimeout(() => setShowSuccessNotification(false), 5000)
  }

  // ✅ NEW: Auction approval effects
  React.useEffect(() => {
    if (isApprovalConfirmed && approvalHash) {
      showSuccessMessage("✅ Approved for Auction!", approvalHash)
      refetchAuctionApproval()
    }
  }, [isApprovalConfirmed, approvalHash, refetchAuctionApproval])

  React.useEffect(() => {
    if (isAuctionConfirmed && auctionHash) {
      showSuccessMessage("🎉 Auction Created Successfully!", auctionHash)
      setShowAuctionDialog(false)
      setShowAuctionCollectionSelector(false)
      setSelectedAuctionNFT(null)
    }
  }, [isAuctionConfirmed, auctionHash])

  // ✅ NEW: Handle single NFT auction
  const handleCreateSingleAuction = async (nft: ProcessedNFT) => {
    if (!address || !auctionData.title || !auctionData.startingPrice || !auctionData.reservePrice) return

    try {
      if (!isAuctionApproved) {
        await approveForAuction()
        return
      }

      await createSingleNFTAuction(
        nft.contractAddress,
        nft.tokenId,
        auctionData.startingPrice,
        auctionData.reservePrice,
        auctionData.minBidIncrement,
        auctionData.duration * 3600,
        auctionData.allowPublicReveal,
        auctionData.title,
        auctionData.description
      )
    } catch (error) {
      console.error('Auction creation failed:', error)
    }
  }

  // ✅ NEW: Handle collection auction
  const handleCreateCollectionAuction = async (data: CollectionAuctionData) => {
    if (!address) return

    try {
      // Validation
      if (!data.nftContract || data.tokenIds.length < 2) {
        throw new Error('Collection auction requires at least 2 NFTs from the same contract')
      }

      if (!data.startingPrice || parseFloat(data.startingPrice) <= 0) {
        throw new Error('Starting price must be greater than 0')
      }

      if (!data.reservePrice || parseFloat(data.reservePrice) < parseFloat(data.startingPrice)) {
        throw new Error('Reserve price must be greater than or equal to starting price')
      }

      if (!data.title.trim()) {
        throw new Error('Auction title is required')
      }

      console.log('Creating collection auction with data:', data)

      await createCollectionAuction(
        data.nftContract,
        data.tokenIds,
        data.startingPrice,
        data.reservePrice,
        data.minBidIncrement,
        data.duration, // Already converted to seconds in AuctionCollectionSelector
        data.allowPublicReveal,
        data.title,
        data.description
      )
      
      toast({
        title: "🎉 Collection Auction Created!",
        description: "Your collection auction has been successfully created.",
      })

    } catch (error) {
      console.error('Collection auction creation failed:', error)
      const errorMessage = error as string || error?.toString() || "Failed to create collection auction"

      toast({
        title: "❌ Auction Creation Failed",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  // ✅ NEW: Handle auction dialog open
  const handleOpenAuction = (nft: ProcessedNFT) => {
    setSelectedAuctionNFT(nft)
    setAuctionData(prev => ({
      ...prev,
      title: `${nft.name} Auction`,
      description: `Auction for ${nft.name} from ${nft.collectionName || 'Collection'}`
    }))
    setShowAuctionDialog(true)
  }

  // Show loading state if not connected or user data is loading
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to view your profile.
            </p>
            <Button onClick={() => window.location.reload()}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 relative">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="container mx-auto px-4">
          <div className="relative -mt-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-32 h-32 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your profile information and preferences</p>
            </div>
            <UserSettings
              user={user}
              onSave={handleSaveSettings}
              onCancel={() => setShowSettings(false)}
            />
          </div>
        </div>
      </div>
    )
  }

  const handleEditProfile = () => {
    setShowSettings(true)
  }

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
      case "Unique":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSellNFT = (nft: ProcessedNFT) => {
    setSelectedNFT(nft)
    setSellPrice("")
    setSellType("fixed")
    setSellDescription("")
    setSellCategory("")
    setTransactionStatus('idle')
    setLastTransactionHash('')
    setCurrentTransactionType(null)
    setIsListingNFT(false)
    setSuccessfulNFTId(null) // ✅ Reset successful NFT tracking when opening new dialog
  }

  // Use user data from state instead of mock data
  const userProfile = {
    address: address || "Unknown",
    name: user?.name || "User",
    username: formatAddress(address),
    bio: user?.description || "Digital art enthusiast and NFT collector",
    description: user?.description || "Digital art enthusiast and NFT collector",
    avatar: user?.m_img || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
    banner: user?.b_img || "",
    verified: true,
    joined: "March 2022",
    website: "https://cryptocollector.io",
    twitter: "@cryptocollector",
    discord: "CryptoCollector#1234",
    stats: {
      owned: total || 0,
      created: 23,
      sold: 45,
      totalVolume: "234.5 ROSE",
      floorValue: "89.2 ROSE",
    },
  }

  // ✅ FIXED: Single NFT dialog - properly sized with fixed buttons
  const renderSellDialog = (nft: ProcessedNFT) => {
    const isCurrentNFTLoading = selectedNFT?.id === nft.id && (isListingNFT || isMarketPending || isMarketConfirming)
    const isCurrentNFTSelected = selectedNFT?.id === nft.id

    // ✅ FIXED: Check if THIS specific NFT has transaction status
    const currentNFTId = `${nft.contractAddress}-${nft.tokenId}`
    const hasTransactionStatus = transactionStatus !== 'idle' &&
      (currentTransactionType === 'single' && selectedNFT?.id === nft.id)

    // ✅ FIXED: Check if THIS specific NFT was successfully listed
    const isThisNFTSuccessful = successfulNFTId === currentNFTId && transactionStatus === 'success'
    const isThisNFTApprovalSuccess = currentTransactionType === 'approval' &&
      selectedNFT?.id === nft.id &&
      transactionStatus === 'approval_success'

    return (
      <Dialog open={isCurrentNFTSelected}>
        <DialogTrigger asChild>
          <Button
            className="flex-1"
            size="sm"
            onClick={() => handleSellNFT(nft)}
          >
            <Tag className="h-4 w-4 mr-2" />
            Sell
          </Button>
        </DialogTrigger>

        {/* ✅ FIXED: Proper dialog sizing and layout */}
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set your price and listing type for {nft.name}.
            </DialogDescription>
          </DialogHeader>

          {/* ✅ FIXED: Flexible content area with proper scrolling */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* ✅ Show NFT info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 relative flex-shrink-0">
                  <Image
                    src={nft.image || '/placeholder-nft.jpg'}
                    alt={nft.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{nft.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{nft.collectionName}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="price">Price (ROSE)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.0"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  disabled={isCurrentNFTLoading}
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Add a description for your NFT listing..."
                  value={sellDescription}
                  onChange={(e) => setSellDescription(e.target.value)}
                  disabled={isCurrentNFTLoading}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={sellCategory}
                  onValueChange={setSellCategory}
                  disabled={isCurrentNFTLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="art">Art</SelectItem>
                    <SelectItem value="collectibles">Collectibles</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="virtual-worlds">Virtual Worlds</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sell-type">Sale Type</Label>
                <Select
                  value={sellType}
                  onValueChange={setSellType}
                  disabled={isCurrentNFTLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="auction">Auction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                

              {/* ✅ FIXED: Transaction status display within scrollable area */}
              {(isCurrentNFTLoading || hasTransactionStatus) && (
                <div className={`p-3 rounded-lg border ${isThisNFTSuccessful ? 'bg-green-50 border-green-200' :
                    isThisNFTApprovalSuccess ? 'bg-blue-50 border-blue-200' :
                      transactionStatus === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                  }`}>
                  <div className={`flex items-center gap-2 ${isThisNFTSuccessful ? 'text-green-700' :
                      isThisNFTApprovalSuccess ? 'text-blue-700' :
                        transactionStatus === 'error' ? 'text-red-700' :
                          'text-blue-700'
                    }`}>
                    {isThisNFTSuccessful ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : isThisNFTApprovalSuccess ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : transactionStatus === 'error' ? (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">
                      {transactionStatus === 'pending' ? (
                        currentTransactionType === 'approval' ?
                          'Waiting for approval confirmation...' :
                          'Waiting for listing confirmation...'
                      ) :
                        transactionStatus === 'confirming' ? (
                          currentTransactionType === 'approval' ?
                            'Approval confirming on blockchain...' :
                            'Listing confirming on blockchain...'
                        ) :
                          isThisNFTSuccessful ? 'NFT listed successfully!' :
                            isThisNFTApprovalSuccess ? 'Approval successful! You can now list your NFT.' :
                              transactionStatus === 'error' ? 'Transaction failed' :
                                'Processing transaction...'}
                    </span>
                  </div>

                  {/* ✅ FIXED: Transaction hash display - contained within status box */}
                  {(isThisNFTSuccessful || isThisNFTApprovalSuccess) && lastTransactionHash && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs bg-white p-2 rounded border">
                        <div className="font-medium mb-1">Transaction Hash:</div>
                        <div className="font-mono break-all text-gray-600 text-[10px]">
                          {lastTransactionHash}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <a
                          href={`https://testnet.explorer.sapphire.oasis.dev/tx/${lastTransactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          View on Block Explorer
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(lastTransactionHash)
                            toast({
                              title: "Copied!",
                              description: "Transaction hash copied to clipboard",
                            })
                          }}
                          className="w-full text-xs h-8"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Transaction Hash
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ✅ FIXED: Buttons always visible at bottom */}
          <div className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0">
            <Button
              onClick={handleListSingleNFT}
              disabled={isCurrentNFTLoading || !sellPrice || parseFloat(sellPrice) <= 0 || isThisNFTSuccessful}
              className="flex-1"
            >
              {isCurrentNFTLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {transactionStatus === 'pending' ? (
                    currentTransactionType === 'approval' ? 'Confirm Approval...' : 'Confirm Listing...'
                  ) : 'Processing...'}
                </>
              ) : isThisNFTSuccessful ? (
                'Listed Successfully!'
              ) : isThisNFTApprovalSuccess ? (
                'List for Sale'
              ) : (
                'List for Sale'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCloseSingleNFTDialog}
              className="flex-1"
            >
              {isThisNFTSuccessful || isThisNFTApprovalSuccess ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section */}
      <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20" />
        {userProfile.banner && (
          <Image
            src={userProfile.banner}
            alt="Profile banner"
            fill
            className="object-cover"
          />
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-0 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
              <AvatarFallback className="text-2xl">
                {userProfile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{userProfile.name}</h1>
                {userProfile.verified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Star className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <span>{userProfile.username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <p className="text-muted-foreground mb-4 max-w-2xl">
                {userProfile.bio}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Joined {userProfile.joined}
                </Badge>
                {userProfile.website && (
                  <Badge variant="outline" className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Website
                  </Badge>
                )}
                {userProfile.twitter && (
                  <Badge variant="outline" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Twitter
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-semibold">{userProfile.stats.owned}</span>
                  <span className="text-muted-foreground ml-1">Owned</span>
                </div>
                <div>
                  <span className="font-semibold">{userProfile.stats.created}</span>
                  <span className="text-muted-foreground ml-1">Created</span>
                </div>
                <div>
                  <span className="font-semibold">{userProfile.stats.sold}</span>
                  <span className="text-muted-foreground ml-1">Sold</span>
                </div>
                <div>
                  <span className="font-semibold">{userProfile.stats.totalVolume}</span>
                  <span className="text-muted-foreground ml-1">Volume</span>
                </div>
                <div>
                  <span className="font-semibold">{userProfile.stats.floorValue}</span>
                  <span className="text-muted-foreground ml-1">Floor Value</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleEditProfile}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={() => setShowCollectionSelector(true)}>
                <Package className="h-4 w-4 mr-2" />
                {Object.values(collectionApprovalStatus).some(approved => !approved) ? "Approve Collection" : "List Collection"}
              </Button>
              {/* ✅ NEW: Auction Collection Button */}
              <Button variant="outline" onClick={() => setShowAuctionCollectionSelector(true)}>
                <Gavel className="h-4 w-4 mr-2" />
                Auction Collection
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="owned">Owned ({userProfile.stats.owned})</TabsTrigger>
              <TabsTrigger value="created">Created ({userProfile.stats.created})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="offers">Offers</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search NFTs..." className="pl-10 w-64" />
              </div>
            </div>
          </div>

          <TabsContent value="owned">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-64 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Alert className="max-w-md mx-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading NFTs: {error}
                  </AlertDescription>
                </Alert>
                <Button onClick={() => refetch()} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any NFTs in your wallet yet.
                </p>
                <Button asChild>
                  <Link href="/explore">Explore Marketplace</Link>
                </Button>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
                }`}>
                {nfts.map((nft) => (
                  <Card key={`${nft.contractAddress}-${nft.tokenId}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square">
                      <Image
                        src={nft.image || '/placeholder-nft.jpg'}
                        alt={nft.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        {nft.rarity && (
                          <Badge className={getRarityColor(nft.rarity)}>
                            {nft.rarity}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg mb-1">{nft.name}</h3>
                        <p className="text-sm text-muted-foreground">{nft.collectionName}</p>
                      </div>

                      {nft.attributes && nft.attributes.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {nft.attributes.slice(0, 3).map((attr, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {attr.trait_type}: {attr.value}
                              </Badge>
                            ))}
                            {nft.attributes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{nft.attributes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {renderSellDialog(nft)}
                        {/* ✅ Replace View with Auction button */}
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenAuction(nft)}>
                          <Gavel className="h-4 w-4 mr-2" />
                          Auction
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="created">
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Edit className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Created NFTs</h3>
              <p className="text-muted-foreground">
                NFTs you&apos;ve created will appear here.
              </p>
            </div>
          </TabsContent>



          <TabsContent value="activity">
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Activity className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Activity Feed</h3>
              <p className="text-muted-foreground">
                Your trading activity will appear here.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="offers">
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Gavel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Offers</h3>
              <p className="text-muted-foreground">
                Offers on your NFTs will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ✅ FIXED: Collection Selector Dialog - Always show transaction status outside CollectionSelector */}
      {showCollectionSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative flex flex-col">
            {/* ✅ Manual close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseCollectionDialog}
              className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>

            {/* ✅ FIXED: Transaction status always visible at top - outside CollectionSelector */}
            {(isCollectionListing || isMarketPending || isMarketConfirming ||
              (transactionStatus !== 'idle' && currentTransactionType === 'collection') ||
              (transactionStatus !== 'idle' && currentTransactionType === 'approval' && showCollectionSelector)) && (
                <div className={`m-4 p-3 rounded-lg border flex-shrink-0 ${transactionStatus === 'success' ? 'bg-green-50 border-green-200' :
                    transactionStatus === 'approval_success' ? 'bg-blue-50 border-blue-200' :
                      transactionStatus === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                  }`}>
                  {/* Status message */}
                  <div className={`flex items-center gap-2 ${transactionStatus === 'success' ? 'text-green-700' :
                      transactionStatus === 'approval_success' ? 'text-blue-700' :
                        transactionStatus === 'error' ? 'text-red-700' :
                          'text-blue-700'
                    }`}>
                    {transactionStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : transactionStatus === 'approval_success' ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : transactionStatus === 'error' ? (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">
                      {transactionStatus === 'pending' ? (
                        currentTransactionType === 'approval' ?
                          'Waiting for collection approval confirmation...' :
                          'Waiting for collection listing confirmation...'
                      ) :
                        transactionStatus === 'confirming' ? (
                          currentTransactionType === 'approval' ?
                            'Collection approval confirming on blockchain...' :
                            'Collection listing confirming on blockchain...'
                        ) :
                          transactionStatus === 'success' ? 'Collection listed successfully!' :
                            transactionStatus === 'approval_success' ? 'Collection approval successful! You can now list your collection.' :
                              transactionStatus === 'error' ? 'Transaction failed' :
                                'Processing collection transaction...'}
                    </span>
                  </div>

                  {/* ✅ FIXED: Transaction hash display for both approval and listing success */}
                  {(transactionStatus === 'success' || transactionStatus === 'approval_success') && lastTransactionHash && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs bg-white p-2 rounded border">
                        <div className="font-medium mb-1">Transaction Hash:</div>
                        <div className="font-mono break-all text-gray-600 text-[10px]">
                          {lastTransactionHash}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={`https://testnet.explorer.sapphire.oasis.dev/tx/${lastTransactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          View on Block Explorer
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(lastTransactionHash)
                            toast({
                              title: "Copied!",
                              description: "Transaction hash copied to clipboard",
                            })
                          }}
                          className="sm:ml-auto text-xs h-8"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Transaction Hash
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* ✅ CollectionSelector in scrollable container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <CollectionSelector
                nfts={nfts}
                isLoading={isCollectionListing || isMarketPending || isMarketConfirming}
                onClose={handleCloseCollectionDialog}
                onSell={handleListCollection}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Auction Dialog */}
      {showAuctionDialog && selectedAuctionNFT && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden relative flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuctionDialog(false)}
              className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            <div className="p-6 space-y-4 overflow-y-auto">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Create Auction for {selectedAuctionNFT.name}
              </h2>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 relative flex-shrink-0">
                  <Image
                    src={selectedAuctionNFT.image || '/placeholder-nft.jpg'}
                    alt={selectedAuctionNFT.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedAuctionNFT.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{selectedAuctionNFT.collectionName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Starting Price (ROSE)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={auctionData.startingPrice}
                    onChange={e => setAuctionData(d => ({ ...d, startingPrice: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Reserve Price (ROSE)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={auctionData.reservePrice}
                    onChange={e => setAuctionData(d => ({ ...d, reservePrice: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Bid Increment (ROSE)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={auctionData.minBidIncrement}
                    onChange={e => setAuctionData(d => ({ ...d, minBidIncrement: e.target.value }))}
                    placeholder="0.1"
                  />
                </div>
                <div>
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="720"
                    value={auctionData.duration}
                    onChange={e => setAuctionData(d => ({ ...d, duration: Number(e.target.value) }))}
                    placeholder="24"
                  />
                </div>
              </div>
              <div>
                <Label>Auction Title</Label>
                <Input
                  value={auctionData.title}
                  onChange={e => setAuctionData(d => ({ ...d, title: e.target.value }))}
                  placeholder="Auction title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  value={auctionData.description}
                  onChange={e => setAuctionData(d => ({ ...d, description: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  rows={2}
                  placeholder="Describe your auction..."
                />
              </div>
              
              {/* Public Reveal Option - Made more prominent */}
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="allowPublicReveal"
                    checked={auctionData.allowPublicReveal}
                    onCheckedChange={v => setAuctionData(d => ({ ...d, allowPublicReveal: !!v }))}
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
              
              {/* Status & Actions */}
              <div className="flex flex-col gap-2 mt-4">
                {!isAuctionApproved ? (
                  <Button
                    onClick={approveForAuction}
                    disabled={isApprovalPending || isApprovalConfirming}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isApprovalPending || isApprovalConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Approve for Auction
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCreateSingleAuction(selectedAuctionNFT)}
                    disabled={isAuctionPending || isAuctionConfirming || !auctionData.startingPrice || !auctionData.reservePrice || !auctionData.title}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {isAuctionPending || isAuctionConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create Auction
                  </Button>
                )}
              </div>
              {/* Success notification */}
              {showSuccessNotification && (
                <div className="mt-4 p-3 rounded bg-green-100 text-green-800 text-center font-medium animate-fade-in">
                  {successNotificationMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Auction Collection Selector Dialog */}
      {showAuctionCollectionSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative flex flex-col">
            {/* ✅ Manual close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuctionCollectionSelector(false)}
              className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <AuctionCollectionSelector
                nfts={nfts}
                isLoading={isAuctionPending || isAuctionConfirming}
                onClose={() => setShowAuctionCollectionSelector(false)}
                onCreateAuction={handleCreateCollectionAuction}
              />
            </div>
            {showSuccessNotification && (
              <div className="absolute left-0 right-0 top-0 mx-auto mt-4 w-fit p-3 rounded bg-green-100 text-green-800 text-center font-medium animate-fade-in z-30">
                {successNotificationMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
