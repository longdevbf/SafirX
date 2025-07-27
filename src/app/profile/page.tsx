/* eslint-disable react/no-unescaped-entities */
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
  Settings, Copy, ExternalLink, Share2, Grid3X3, List, Filter, Search, Heart, Tag, Activity, Star,
  AlertCircle, RefreshCw, Edit, Gavel, Package, Loader2, X, CheckCircle
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useWallet } from "@/context/walletContext"
import { useWalletNFTs } from "@/hooks/use-walletNFTs"
import { ProcessedNFT } from "@/interfaces/nft"
import UserSettings from "@/components/UserSettings"
import { useUserProfile } from '@/hooks/useUserProfile'
import { useNFTMarket } from "@/hooks/use-market"
import useSealedBidAuction from "@/hooks/use-auction"
import { useAuctionApproval } from "@/hooks/use-auction-approval"
import CollectionSelector, { CollectionSellData } from "@/components/collectionSelection"
import AuctionCollectionSelector, { CollectionAuctionData } from "@/components/AuctionCollectionSelector"
import { toast } from "@/hooks/use-toast"
import { readContract } from "wagmi/actions"
import { ERC721_ABI } from "@/abis/MarketABI"
import { config } from "@/components/config/wagmiConfig"
import { syncListingToDatabase, syncAuctionToDatabase, prepareListingData, prepareAuctionData } from "@/utils/syncToDatabase"
import { getListingIdFromTransaction, getLatestListingIdForUser } from "@/utils/getListingIdFromTransaction"
import { keccak256, toHex } from "viem"
import { getAuctionIdFromTransaction } from "@/utils/getAuctionIdFromTransaction"
// -----------------
// Types
// -----------------
interface UserProfile {
  name: string
  description: string
  w_address: string
  m_img?: string
  b_img?: string
}

type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error' | 'waiting_approval' | 'approval_success'
type TransactionType = 'single' | 'collection' | 'approval' | null

// -----------------
// Component
// -----------------
export default function ProfilePage() {
  // -----------------
  // State Declarations
  // -----------------
  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTab, setSelectedTab] = useState("owned")
  const [showSettings, setShowSettings] = useState(false)

  // User Data States
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(false)

  // Single NFT Listing States
  const [selectedNFT, setSelectedNFT] = useState<ProcessedNFT | null>(null)
  const [sellPrice, setSellPrice] = useState("")
  const [sellType, setSellType] = useState("fixed")
  const [sellDescription, setSellDescription] = useState("")
  const [sellCategory, setSellCategory] = useState("")

  // Collection Listing States
  const [showCollectionSelector, setShowCollectionSelector] = useState(false)

  // Auction States
  const [showAuctionDialog, setShowAuctionDialog] = useState(false)
  const [selectedAuctionNFT, setSelectedAuctionNFT] = useState<ProcessedNFT | null>(null)
  const [showAuctionCollectionSelector, setShowAuctionCollectionSelector] = useState(false)
  const [auctionData, setAuctionData] = useState({
    startingPrice: "",
    reservePrice: "",
    minBidIncrement: "0.1",
    duration: 24,
    title: "",
    description: ""
  })

  // Transaction States
  const [isListingNFT, setIsListingNFT] = useState(false)
  const [isCollectionListing, setIsCollectionListing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle')
  const [currentTransactionType, setCurrentTransactionType] = useState<TransactionType>(null)
  const [lastTransactionHash, setLastTransactionHash] = useState<string>('')
  const [successfulNFTId, setSuccessfulNFTId] = useState<string | null>(null)
  const [processedTransactions, setProcessedTransactions] = useState<Set<string>>(new Set())
  const [marketplaceApprovalStatus, setMarketplaceApprovalStatus] = useState<{ [key: string]: boolean }>({})

  // Success Notification States
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successNotificationMessage, setSuccessNotificationMessage] = useState("")

  // ✅ Collection States - Thiết kế lại từ đầu
  const [collectionListing, setCollectionListing] = useState({
    isOpen: false,
    isLoading: false,
    status: 'idle' as 'idle' | 'approving' | 'listing' | 'success' | 'error',
    currentStep: 1, // 1: Form, 2: Approval (if needed), 3: Listing, 4: Success
    error: null as string | null,
    transactionHash: '',
    needsApproval: false
  })

  // -----------------
  // Hooks
  // -----------------
  const { address, isConnected } = useWallet()
  const { nfts, loading, error, total, refetch } = useWalletNFTs()
  const { refreshProfile } = useUserProfile()
  const { listSingleNFT, listCollectionBundle, listCollectionIndividual, listCollectionSamePrice, approveNFT,
    hash: marketHash, error: marketError, isPending: isMarketPending, isConfirming: isMarketConfirming,
    isConfirmed: isMarketConfirmed } = useNFTMarket()
  const { createSingleNFTAuction, createCollectionAuction, hash: auctionHash, error: auctionError,
    isPending: isAuctionPending, isConfirming: isAuctionConfirming, isConfirmed: isAuctionConfirmed } = useSealedBidAuction()
  const { isApproved: isAuctionApproved, approveForAuction, refetchApproval: refetchAuctionApproval,
    hash: approvalHash, isPending: isApprovalPending, isConfirming: isApprovalConfirming,
    isConfirmed: isApprovalConfirmed } = useAuctionApproval(selectedAuctionNFT?.contractAddress || '', address)

  // -----------------
  // Effects
  // -----------------
  // Fetch user data when address changes
  useEffect(() => {
    if (address && isConnected) fetchUserData()
  }, [address, isConnected])

  // Handle market transaction confirmation
  useEffect(() => {
    if (isMarketConfirmed && marketHash && !processedTransactions.has(marketHash)) {
      setProcessedTransactions(prev => new Set([...prev, marketHash]))
      setLastTransactionHash(marketHash)

      if (currentTransactionType === 'approval') {
        handleApprovalSuccess()
      } else {
        handleListingSuccess()
      }
    }
  }, [isMarketConfirmed, marketHash, currentTransactionType])

  // Update transaction status based on market state
  useEffect(() => {
    if (isMarketPending) setTransactionStatus('pending')
    else if (isMarketConfirming) setTransactionStatus('confirming')
  }, [isMarketPending, isMarketConfirming])

  // Handle market errors
  useEffect(() => {
    if (marketError) {
      handleTransactionError(marketError, "Listing")
        setIsListingNFT(false)
        setIsCollectionListing(false)
    }
  }, [marketError])

  // ✅ Sửa useEffect để chờ transaction thực sự confirm
  useEffect(() => {
    if (isAuctionConfirmed && auctionHash && !processedTransactions.has(auctionHash)) {
      // ✅ Chờ thêm 5 giây để đảm bảo transaction đã được confirm
      setTimeout(async () => {
        try {
          const auctionId = await getAuctionIdFromTransaction(auctionHash as string);
          if (auctionId) {
            setProcessedTransactions(prev => new Set([...prev, auctionHash]))
            setLastTransactionHash(auctionHash)
            await handleAuctionSuccess(auctionId)
              } else {
            console.log('⏳ Transaction not yet confirmed, retrying...')
            // ✅ Retry sau 10 giây nữa
            setTimeout(async () => {
              const retryAuctionId = await getAuctionIdFromTransaction(auctionHash as string);
              if (retryAuctionId) {
                setProcessedTransactions(prev => new Set([...prev, auctionHash]))
                setLastTransactionHash(auctionHash)
                await handleAuctionSuccess(retryAuctionId)
              } else {
                console.error('❌ Failed to get auction ID after retry')
                toast({
                  title: "⚠️ Warning",
                  description: "Auction created but still processing. Please check manually in a few minutes.",
                  variant: "destructive"
                })
              }
            }, 10000)
          }
            } catch (error) {
          console.error('❌ Error in auction confirmation:', error)
        }
      }, 5000)
    }
  }, [isAuctionConfirmed, auctionHash])

  // Handle auction approval confirmation
  useEffect(() => {
    if (isApprovalConfirmed && approvalHash) {
      setShowSuccessNotification(true)
      setSuccessNotificationMessage(`✅ Approved for Auction! | Tx: ${approvalHash.slice(0, 8)}...${approvalHash.slice(-6)}`)
      setTimeout(() => setShowSuccessNotification(false), 5000)
      refetchAuctionApproval()
    }
  }, [isApprovalConfirmed, approvalHash, refetchAuctionApproval])

  // Reset auction states when dialog closes
  useEffect(() => {
    if (!showAuctionDialog && !showAuctionCollectionSelector) {
      resetAuctionStates()
    }
  }, [showAuctionDialog, showAuctionCollectionSelector])

  // -----------------
  // Functions
  // -----------------
  // User Profile Functions
  const fetchUserData = async () => {
    if (!address) return
    setUserLoading(true)
    try {
      const response = await fetch(`/api/users?address=${address}`)
      const userData = response.ok ? await response.json() : defaultUser()
        setUser(userData)
    } catch (err) {
      console.error(err)
      setUser(defaultUser())
    } finally {
      setUserLoading(false)
    }
  }

  const defaultUser = () => ({
        name: 'User',
        description: 'Digital art enthusiast and NFT collector',
    w_address: address!,
        m_img: '',
        b_img: ''
      })

  const handleSaveSettings = async (updatedUser: UserProfile) => {
    setUser(updatedUser)
    setShowSettings(false)
    setTimeout(async () => {
      await fetchUserData()
      await refreshProfile()
      refetch()
    }, 1000)
  }

  // Utility Functions
  const formatAddress = (addr?: string) => addr && addr.length >= 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Unknown Address'
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({ title: "Address Copied", description: "Wallet address copied to clipboard" })
    }
  }

  const checkCollectionApproval = async (contractAddress: string): Promise<boolean> => {
    if (marketplaceApprovalStatus[contractAddress]) return true
    try {
      const response = await fetch('/api/check-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress, owner: address, marketAddress: '0x329Add063f3fcCb700eAb5525AD3E8127ea050a1' })
      })
      const { isApproved } = await response.json()
      if (isApproved) setMarketplaceApprovalStatus(prev => ({ ...prev, [contractAddress]: true }))
      return isApproved
    } catch (err) {
      console.error(err)
      return false
    }
  }

  // Transaction Handlers
  const handleApprovalSuccess = async () => {
    setTransactionStatus('approval_success')
    if (selectedNFT) {
      setMarketplaceApprovalStatus(prev => ({ ...prev, [selectedNFT.contractAddress]: true }))
    }
    
    toast({
      title: "✅ Approval Successful!",
      description: (
        <div className="space-y-2">
          <p>NFT collection approved! Now proceeding with listing...</p>
          <a href={`https://testnet.explorer.sapphire.oasis.dev/tx/${marketHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs block">
            View Approval Transaction →
          </a>
        </div>
      ),
      duration: 6000
    })
    
    // ✅ Auto-proceed with listing after approval
    if (selectedNFT && sellPrice && parseFloat(sellPrice) > 0) {
      try {
        // Wait a moment for the approval to be processed
        setTimeout(async () => {
          setCurrentTransactionType('single')
          setTransactionStatus('pending')
          
          toast({ 
            title: "⏳ Proceeding with Listing", 
            description: "Please confirm the listing transaction...",
            duration: 5000
          })
          
          await listSingleNFT(selectedNFT.contractAddress, selectedNFT.tokenId, sellPrice)
        }, 2000)
        
      } catch (err) {
        handleTransactionError(err, "NFT Listing")
        setIsListingNFT(false)
      }
    }
    
    // ✅ Handle collection approval -> auto-proceed with collection listing
    const pendingCollectionData = (window as any).pendingCollectionData
    
    if (pendingCollectionData && currentTransactionType === 'approval') {
      try {
        // Mark collection as approved
        setMarketplaceApprovalStatus(prev => ({ 
          ...prev, 
          [pendingCollectionData.nftContract]: true 
        }))
        
        // Wait a moment for the approval to be processed
        setTimeout(async () => {
          setCurrentTransactionType('collection')
          setTransactionStatus('pending')
          
          toast({ 
            title: "⏳ Proceeding with Collection Listing", 
            description: "Please confirm the collection listing transaction...",
            duration: 5000
          })
          
          if (pendingCollectionData.listingType === 'bundle') {
            await listCollectionBundle(pendingCollectionData.nftContract, pendingCollectionData.tokenIds, pendingCollectionData.bundlePrice!, pendingCollectionData.collectionName)
          } else if (pendingCollectionData.listingType === 'individual') {
            await listCollectionIndividual(pendingCollectionData.nftContract, pendingCollectionData.tokenIds, pendingCollectionData.individualPrices!, pendingCollectionData.collectionName)
          } else if (pendingCollectionData.listingType === 'same-price') {
            await listCollectionSamePrice(pendingCollectionData.nftContract, pendingCollectionData.tokenIds, pendingCollectionData.samePricePerItem!, pendingCollectionData.collectionName)
          }
        }, 2000)
        
      } catch (err) {
        handleTransactionError(err, "Collection Listing")
        setIsCollectionListing(false)
      }
    }
  }

const handleListingSuccess = async () => {
  setTransactionStatus('success')
  
  if (currentTransactionType === 'single' && selectedNFT) {
    const nftId = `${selectedNFT.contractAddress}-${selectedNFT.tokenId}`
    setSuccessfulNFTId(nftId)
    await syncSingleNFTListing()
  } else if (currentTransactionType === 'collection') {
    await syncCollectionListing()
  }
  
  toast({
    title: currentTransactionType === 'collection' ? "🎉 Collection Listed Successfully!" : "🎉 NFT Listed Successfully!",
    description: (
      <div className="space-y-2">
        <p>{currentTransactionType === 'collection' ? "Your collection has been listed!" : "Your NFT has been listed!"}</p>
        <a href={`https://testnet.explorer.sapphire.oasis.dev/tx/${marketHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs block">
          View on Explorer →
        </a>
      </div>
    ),
    duration: 10000 // Giảm duration vì đã có popup
  })
    
  setIsListingNFT(false)
  setIsCollectionListing(false)
  
  setTimeout(() => refetch(), 3000)
}

// ✅ Sửa handleAuctionSuccess để lưu transaction hash
const handleAuctionSuccess = async (auctionId: string) => {
  const storedAuctionData = (window as any).pendingAuctionData;
  const storedSelectedNFT = (window as any).pendingSelectedNFT;
  
  if (auctionId) {
    const auctionDataForDb = storedSelectedNFT
      ? prepareAuctionData(
          auctionId,
          storedSelectedNFT.contractAddress,
          storedSelectedNFT.tokenId,
          null,
          address!,
          {
            auctionType: 'SINGLE_NFT',
            title: storedAuctionData.title,
            description: storedAuctionData.description,
            startingPrice: storedAuctionData.startingPrice,
            reservePrice: storedAuctionData.reservePrice,
            minBidIncrement: storedAuctionData.minBidIncrement,
            duration: storedAuctionData.duration,
            allowPublicReveal: false,
            collectionImage: storedSelectedNFT.image
          },
          auctionHash as string,
          storedSelectedNFT
        )
      : prepareAuctionData(
          auctionId,
          storedAuctionData.nftContract,
          null,
          storedAuctionData.tokenIds,
          address!,
          {
            auctionType: 'COLLECTION',
            title: storedAuctionData.title,
            description: storedAuctionData.description,
            startingPrice: storedAuctionData.startingPrice,
            reservePrice: storedAuctionData.reservePrice,
            minBidIncrement: storedAuctionData.minBidIncrement,
            duration: storedAuctionData.duration,
            allowPublicReveal: false,
            collectionImage: storedAuctionData.collectionImage,
            individualNftMetadata: storedAuctionData.tokenIds.map((tokenId: string) => {
              const nft = nfts.find(n => 
                n.contractAddress === storedAuctionData.nftContract && 
                String(n.tokenId) === tokenId
              );
              return {
                tokenId: parseInt(tokenId),
                name: nft?.name || `NFT #${tokenId}`,
                description: nft?.description || '',
                image: nft?.image || '/placeholder-nft.jpg',
                attributes: nft?.attributes || [],
                rarity: nft?.rarity || 'Common',
                collectionName: nft?.collectionName || storedAuctionData.title
              };
            })
          },
          auctionHash as string,
          storedAuctionData
        );
    
    const success = await syncAuctionToDatabase(auctionDataForDb)
    
    // ✅ Set success state cho auction và currentTransactionType
    setTransactionStatus('success')
    setCurrentTransactionType(storedSelectedNFT ? 'single' : 'collection') // ✅ Set đúng type
    
    toast({
      title: "🎉 Auction Created Successfully!",
      description: (
        <div className="space-y-2">
          <p>Your auction has been created!</p>
          <div className="text-xs font-mono bg-gray-100 p-2 rounded">
            Auction ID: {auctionId}
          </div>
          <a
            href={`https://testnet.explorer.sapphire.oasis.dev/tx/${auctionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-xs block"
          >
            View on Explorer →
          </a>
        </div>
      ),
      duration: 10000
    })
    
    if (!success) console.error('❌ Failed to sync auction to database')
  }
  
  // ✅ KHÔNG reset states ngay lập tức để popup hiển thị
  setTimeout(() => refetch(), 3000)
}

  const handleTransactionError = (err: any, type: string) => {
    setTransactionStatus('error')
    const message = err.message || `${type} failed. Please try again.`
    toast({ title: `❌ ${type} Failed`, description: message, variant: "destructive" })
    resetTransactionStates(false)
  }

  // Listing Functions
  const handleListSingleNFT = async () => {
    if (!selectedNFT || !sellPrice || parseFloat(sellPrice) <= 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid price greater than 0", variant: "destructive" })
      return
    }
    
    setIsListingNFT(true)
    setTransactionStatus('idle')
    setCurrentTransactionType('single')
    
    try {
      const isApproved = await checkCollectionApproval(selectedNFT.contractAddress)
      
      if (!isApproved) {
        // ✅ Inform user about the 2-step process upfront
        toast({ 
          title: "🔒 Approval Required", 
          description: "First time selling from this collection requires approval. You'll need to confirm 2 transactions: approval first, then listing.",
          duration: 10000 
        })
        
        setTransactionStatus('waiting_approval')
        setCurrentTransactionType('approval')
        
        // Step 1: Request approval
        await approveNFT(selectedNFT.contractAddress)
        toast({ 
          title: "✅ Approval Transaction Sent", 
          description: "Please confirm the approval transaction. After it's confirmed, the listing will proceed automatically.",
          duration: 8000 
        })
        
        // Don't return here - let the useEffect handle the next step
        return
      }
      
      // If already approved, proceed directly to listing
      await listSingleNFT(selectedNFT.contractAddress, selectedNFT.tokenId, sellPrice)
      toast({ title: "⏳ Listing Transaction Submitted", description: "Waiting for blockchain confirmation..." })
      
    } catch (err) {
      handleTransactionError(err, "NFT Listing")
      setIsListingNFT(false)
    }
  }

  const handleListCollection = async (data: CollectionSellData) => {
    setIsCollectionListing(true)
    setTransactionStatus('idle')
    setCurrentTransactionType('collection')
    
    try {
      const isApproved = await checkCollectionApproval(data.nftContract)
      
      if (!isApproved) {
        toast({ 
          title: "🔒 Collection Approval Required", 
          description: "First time listing from this collection requires approval. You'll need to confirm 2 transactions: approval first, then listing.",
          duration: 10000 
        })
        
        setTransactionStatus('waiting_approval')
        setCurrentTransactionType('approval')
        
        // Store collection data for later use
        ;(window as any).pendingCollectionData = data
        
        await approveNFT(data.nftContract)
        toast({ 
          title: "✅ Collection Approval Sent", 
          description: "Please confirm the approval transaction. After it's confirmed, the collection listing will proceed automatically.",
          duration: 8000 
        })
        return
      }
      
      // If already approved, proceed directly to listing
      ;(window as any).pendingCollectionData = data
    
    if (data.listingType === 'bundle') {
      await listCollectionBundle(data.nftContract, data.tokenIds, data.bundlePrice!, data.collectionName)
    } else if (data.listingType === 'individual') {
      await listCollectionIndividual(data.nftContract, data.tokenIds, data.individualPrices!, data.collectionName)
    } else if (data.listingType === 'same-price') {
      await listCollectionSamePrice(data.nftContract, data.tokenIds, data.samePricePerItem!, data.collectionName)
    }
    
    toast({ title: "⏳ Collection Listing Submitted", description: "Waiting for blockchain confirmation..." })
    
    } catch (err) {
      handleTransactionError(err, "Collection Listing")
      setIsCollectionListing(false)
    }
  }

  const requestApproval = async (contractAddress: string) => {
    setCurrentTransactionType('approval')
    await approveNFT(contractAddress)
    toast({ title: "✅ Approval Sent", description: "Please confirm the approval transaction.", duration: 8000 })
    setIsListingNFT(false)
    setIsCollectionListing(false)
    setTransactionStatus('waiting_approval')
  }

// Thêm state này vào đầu component
const [isCreatingAuction, setIsCreatingAuction] = useState(false)

// Sửa handleCreateSingleAuction
const handleCreateSingleAuction = async () => {
  if (!selectedAuctionNFT || !address || !auctionData.title || !auctionData.startingPrice || !auctionData.reservePrice) return
  
  try {
    if (!isAuctionApproved) {
      await approveForAuction()
      toast({ title: "🔒 Approval Required", description: "Please approve your NFT for the auction contract first." })
      return
    }
    
    // ✅ Set loading ngay khi bắt đầu
    setIsCreatingAuction(true)
    
    ;(window as any).pendingSelectedNFT = selectedAuctionNFT
    ;(window as any).pendingAuctionData = auctionData
    
    await createSingleNFTAuction(
      selectedAuctionNFT.contractAddress as `0x${string}`, 
      Number(selectedAuctionNFT.tokenId), 
      auctionData.startingPrice,
      auctionData.reservePrice,
      auctionData.minBidIncrement,
      auctionData.duration,
      auctionData.title,
      auctionData.description
    )
    
    toast({ title: "⏳ Auction Submitted", description: "Please wait for blockchain confirmation..." })
    
  } catch (err) {
    // ✅ Reset loading khi lỗi
    setIsCreatingAuction(false)
    handleTransactionError(err, "Auction Creation")
  }
}

// ✅ Reset loading state khi success hoặc close dialog
useEffect(() => {
  if (transactionStatus === 'success' || !showAuctionDialog) {
    setIsCreatingAuction(false)
  }
}, [transactionStatus, showAuctionDialog])

// Thêm state vào đầu component (sau dòng 113)
const [isCreatingCollectionAuction, setIsCreatingCollectionAuction] = useState(false)

// Sửa handleCreateCollectionAuction
const handleCreateCollectionAuction = async (data: CollectionAuctionData) => {
  if (!address || !data.nftContract || data.tokenIds.length < 2 || !data.startingPrice || !data.reservePrice || !data.title) return
  
  try {
    // ✅ Set loading ngay khi bắt đầu
    setIsCreatingCollectionAuction(true)
    setCurrentTransactionType('collection') // ✅ Set transaction type
    
    ;(window as any).pendingAuctionData = data
    
    await createCollectionAuction(
      data.nftContract as `0x${string}`, 
      data.tokenIds.map(Number), 
      data.startingPrice,
      data.reservePrice,
      data.minBidIncrement,
      data.duration,
      data.title,
      data.description
    )
    
    toast({ 
      title: "⏳ Collection Auction Submitted", 
      description: "Please wait for blockchain confirmation..." 
    })
    
  } catch (err) {
    // ✅ Reset loading khi lỗi
    setIsCreatingCollectionAuction(false)
    setCurrentTransactionType(null)
    handleTransactionError(err, "Collection Auction Creation")
  }
}

// ✅ Reset loading state khi success hoặc close dialog
useEffect(() => {
  if (transactionStatus === 'success' || !showAuctionCollectionSelector) {
    setIsCreatingCollectionAuction(false)
  }
}, [transactionStatus, showAuctionCollectionSelector])
  // Reset Functions
const resetTransactionStates = (closeDialog: boolean = true) => {
  setIsListingNFT(false)
  setIsCollectionListing(false)
  setCurrentTransactionType(null)
  setTransactionStatus('idle')
  setLastTransactionHash('')
  setSuccessfulNFTId(null)
  
  if (closeDialog) {
    setSelectedNFT(null)
    setSellPrice("")
    setSellDescription("")
    setSellCategory("")
    setShowCollectionSelector(false)
  }
}

  const resetAuctionStates = () => {
    setSelectedAuctionNFT(null)
    setIsCreatingAuction(false)
    setIsCreatingCollectionAuction(false) 
    setAuctionData({ 
      startingPrice: "", 
      reservePrice: "", 
      minBidIncrement: "0.1", 
      duration: 1, // ✅ Thay đổi từ 24 thành 1
      title: "", 
      description: "" 
    })
  }

  // Sync Functions
  const syncSingleNFTListing = async () => {
    const { listingId } = await getListingIdFromTransaction(marketHash as string) || await getLatestListingIdForUser(address || '') || { listingId: null }
    if (listingId && selectedNFT) {
      const listingData = prepareListingData(listingId, selectedNFT.contractAddress, selectedNFT.tokenId, address || '', sellPrice, marketHash as string, {
        name: selectedNFT.name,
        description: sellDescription,
        category: sellCategory,
        image: selectedNFT.image || '/placeholder-nft.jpg',
        attributes: selectedNFT.attributes || [],
        rarity: selectedNFT.rarity || 'Common',
        collectionName: selectedNFT.collectionName
      })
      await syncListingToDatabase(listingData)
    }
  }

  const syncCollectionListing = async () => {
    const collectionData = (window as any).pendingCollectionData as CollectionSellData
    if (!collectionData) return
    const { collectionId } = await getListingIdFromTransaction(marketHash as string)
    if (collectionId) {
      const nftDetails = collectionData.tokenIds.map((tokenId, index) => {
        const nft = nfts.find(n => n.contractAddress === collectionData.nftContract && n.tokenId === tokenId)
        const price = collectionData.listingType === 'bundle' ? 0 : collectionData.listingType === 'same-price' ? parseFloat(collectionData.samePricePerItem || '0') : parseFloat(collectionData.individualPrices?.[index] || '0')
        return {
          listing_id: collectionData.listingType === 'bundle' ? collectionId : `${collectionId}-${tokenId}`,
          token_id: tokenId,
          price,
          nft_name: nft?.name || `${collectionData.collectionName} #${tokenId}`,
          nft_description: nft?.description || collectionData.collectionDescription || '',
          nft_image: nft?.image || collectionData.collectionImage || '/placeholder-nft.jpg',
          nft_attributes: JSON.stringify(nft?.attributes || []),
          nft_rarity: nft?.rarity || 'Common'
        }
      })
      const payload = {
        collection_id: collectionId,
        name: collectionData.collectionName,
        description: collectionData.collectionDescription || '',
        cover_image_url: collectionData.collectionImage || '',
        cover_image_drive_id: '',
        creator_address: address!,
        contract_address: collectionData.nftContract,
        is_bundle: collectionData.listingType === 'bundle',
        bundle_price: collectionData.bundlePrice ? parseFloat(collectionData.bundlePrice) : null,
        listing_type: collectionData.listingType === 'bundle' ? 1 : collectionData.listingType === 'same-price' ? 2 : 0,
        tx_hash: marketHash,
        total_items: collectionData.tokenIds.length,
        items: nftDetails
      }
      await fetch('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    delete (window as any).pendingCollectionData
  }

  const renderSellDialog = (nft: ProcessedNFT) => {
    const isCurrentNFTLoading = selectedNFT?.id === nft.id && (isListingNFT || isMarketPending || isMarketConfirming)
    const isCurrentNFTSelected = selectedNFT?.id === nft.id
    const currentNFTId = `${nft.contractAddress}-${nft.tokenId}`
    const isThisNFTSuccessful = successfulNFTId === currentNFTId && transactionStatus === 'success'
    
    // ✅ Thêm check cho approval success
    const isThisNFTApprovalSuccess = selectedNFT?.id === nft.id && transactionStatus === 'approval_success'

    return (
      <Dialog open={isCurrentNFTSelected}>
        <DialogTrigger asChild>
          <Button className="flex-1" size="sm" onClick={() => {
            // ✅ Reset states khi mở dialog mới
            if (selectedNFT?.id !== nft.id) {
              setTransactionStatus('idle')
              setSuccessfulNFTId(null)
            }
            setSelectedNFT(nft)
          }}>
            <Tag className="h-4 w-4 mr-2" /> Sell
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>Set your price and listing type for {nft.name}.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 relative flex-shrink-0">
                  <Image src={nft.image || '/placeholder-nft.jpg'} alt={nft.name} fill className="object-cover rounded" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{nft.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{nft.collectionName}</p>
                </div>
              </div>
              <div>
                <Label htmlFor="price">Price (ROSE)</Label>
                <Input id="price" type="number" placeholder="0.0" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} disabled={isCurrentNFTLoading} />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" placeholder="Add a description..." value={sellDescription} onChange={(e) => setSellDescription(e.target.value)} disabled={isCurrentNFTLoading} />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={sellCategory} onValueChange={setSellCategory} disabled={isCurrentNFTLoading}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
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
              
              {/* ✅ Success state UI */}
              {transactionStatus !== 'idle' && selectedNFT?.id === nft.id && (
                <div className={`p-3 rounded-lg border ${
                  isThisNFTSuccessful ? 'bg-green-50 border-green-200' : 
                  transactionStatus === 'waiting_approval' || transactionStatus === 'approval_success' ? 'bg-yellow-50 border-yellow-200' : 
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`flex items-center gap-2 ${
                    isThisNFTSuccessful ? 'text-green-700' : 
                    transactionStatus === 'waiting_approval' || transactionStatus === 'approval_success' ? 'text-yellow-700' : 
                    'text-blue-700'
                  }`}>
                    {isThisNFTSuccessful ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span className="text-sm font-medium">
                      {transactionStatus === 'waiting_approval' ? 'Step 1/2: Approving collection access...' : 
                       transactionStatus === 'approval_success' ? 'Step 2/2: Preparing to list NFT...' :
                       transactionStatus === 'pending' ? 'Processing listing transaction...' : 
                       transactionStatus === 'confirming' ? 'Confirming on blockchain...' : 
                       transactionStatus === 'success' ? 'NFT listed successfully!' :
                       'Processing transaction...'}
                    </span>
                  </div>
                  
                  {/* ✅ Success transaction hash display */}
                  {isThisNFTSuccessful && lastTransactionHash && (
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
                          className="flex-1"
                        >
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Explorer
                          </Button>
                        </a>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigator.clipboard.writeText(lastTransactionHash)}
                          className="flex-1 text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Hash
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0">

<Button 
  onClick={handleListSingleNFT}
  disabled={isCurrentNFTLoading || !sellPrice || parseFloat(sellPrice) <= 0 || isThisNFTSuccessful}
  className="flex-1"
>
  {isCurrentNFTLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      {transactionStatus === 'waiting_approval' ? 'Approving Collection...' :
       transactionStatus === 'approval_success' ? 'Preparing Listing...' :
       transactionStatus === 'pending' ? (
         currentTransactionType === 'approval' ? 'Confirming Approval...' : 'Confirming Listing...'
       ) : 
       transactionStatus === 'confirming' ? (
         currentTransactionType === 'approval' ? 'Processing Approval...' : 'Processing Listing...'
       ) : 'Processing...'}
    </>
  ) : isThisNFTSuccessful ? (
    'Listed Successfully!'
  ) : (
    'List for Sale'
  )}
</Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // ✅ Nếu success, reset hoàn toàn
                if (isThisNFTSuccessful) {
                  setTransactionStatus('idle')
                  setSuccessfulNFTId(null)
                  setCurrentTransactionType(null)
                }
                resetTransactionStates(true)
              }}
              className="flex-1"
              disabled={isCurrentNFTLoading && transactionStatus === 'waiting_approval'}
            >
              {isThisNFTSuccessful ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const renderAuctionDialog = () => selectedAuctionNFT && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {/* ✅ Success Popup cho auction */}
      {transactionStatus === 'success' && lastTransactionHash && currentTransactionType === 'single' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <Card className="max-w-md w-full mx-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                // Reset states và đóng dialog
                setTransactionStatus('idle')
                setCurrentTransactionType(null)
                setLastTransactionHash('')
                delete (window as any).pendingAuctionData
                delete (window as any).pendingSelectedNFT
                resetAuctionStates()
                setShowAuctionDialog(false)
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auction Created Successfully! 🎉</h3>
              <p className="text-muted-foreground mb-4">
                Your NFT auction has been created and is now live on the marketplace.
              </p>
              <div className="bg-muted p-3 rounded mb-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                <p className="text-sm font-medium break-all">{lastTransactionHash}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    window.open(`https://testnet.explorer.sapphire.oasis.dev/tx/${lastTransactionHash}`, "_blank")
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // Reset và tạo auction mới
                    setTransactionStatus('idle')
                    setCurrentTransactionType(null)
                    setLastTransactionHash('')
                    delete (window as any).pendingAuctionData
                    delete (window as any).pendingSelectedNFT
                    resetAuctionStates()
                    // Không đóng dialog, chỉ reset form
                  }}
                >
                  Create Another
                </Button>
              </div>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  asChild
                >
                  <Link href="/auctions">
                    View in Auctions
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ Main Dialog - ẩn khi success */}
      <div className={`bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden relative flex flex-col ${
        transactionStatus === 'success' && currentTransactionType === 'single' ? 'hidden' : ''
      }`}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            setTransactionStatus('idle')
            setCurrentTransactionType(null)
            setLastTransactionHash('')
            setShowAuctionDialog(false)
          }} 
          className="absolute right-4 top-4 z-20"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="p-6 space-y-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Gavel className="h-5 w-5" />Create Auction for {selectedAuctionNFT.name}</h2>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-12 h-12 relative flex-shrink-0">
              <Image src={selectedAuctionNFT.image || '/placeholder-nft.jpg'} alt={selectedAuctionNFT.name} fill className="object-cover rounded" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedAuctionNFT.name}</p>
              <p className="text-sm text-muted-foreground truncate">{selectedAuctionNFT.collectionName}</p>
            </div>
          </div>

          {/* ✅ Loading/Processing State */}
          {(isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming) && (
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  {isApprovalPending || isApprovalConfirming
                    ? 'Approving NFT for auction...'
                    : isAuctionPending 
                    ? 'Creating auction transaction...' 
                    : 'Confirming auction on blockchain...'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Starting Price (ROSE)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={auctionData.startingPrice} 
                onChange={e => setAuctionData(d => ({ ...d, startingPrice: e.target.value }))} 
                placeholder="0.00"
                disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
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
                disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
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
                disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
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
                disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
              />
            </div>
          </div>
          <div>
            <Label>Auction Title</Label>
            <Input 
              value={auctionData.title} 
              onChange={e => setAuctionData(d => ({ ...d, title: e.target.value }))} 
              placeholder="Auction title"
              disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
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
              disabled={isAuctionPending || isAuctionConfirming || isApprovalPending || isApprovalConfirming}
            />
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {!isAuctionApproved ? (
              <Button 
                onClick={approveForAuction} 
                disabled={isApprovalPending || isApprovalConfirming || isAuctionPending || isAuctionConfirming} 
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isApprovalPending || isApprovalConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isApprovalPending ? 'Approving...' : 'Confirming Approval...'}
                  </>
                ) : (
                  'Approve for Auction'
                )}
              </Button>
            ) : (
              // Trong renderAuctionDialog, sửa phần Create Auction button:

<Button 
  onClick={handleCreateSingleAuction} 
  disabled={
    isCreatingAuction || // ✅ Thêm condition này
    isAuctionPending || 
    isAuctionConfirming || 
    isApprovalPending || 
    isApprovalConfirming ||
    !auctionData.startingPrice || 
    !auctionData.reservePrice || 
    !auctionData.title
  } 
  className="bg-green-600 text-white hover:bg-green-700"
>
  {(isCreatingAuction || isAuctionPending || isAuctionConfirming) ? ( // ✅ Sửa condition
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      {isCreatingAuction && !isAuctionPending ? 'Creating Auction...' : 
       isAuctionPending ? 'Confirming Transaction...' : 
       'Confirming on Blockchain...'}
    </>
  ) : (
    'Create Auction'
  )}
</Button>
            )}
          </div>
          {showSuccessNotification && (
            <div className="mt-4 p-3 rounded bg-green-100 text-green-800 text-center font-medium">
              {successNotificationMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // -----------------
  // JSX Return
  // -----------------
  const userProfile = {
    address: address || "Unknown",
    name: user?.name || "User",
    username: formatAddress(address),
    bio: user?.description || "Digital art enthusiast and NFT collector",
    avatar: user?.m_img || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
    banner: user?.b_img || "",
    verified: true,
    joined: "March 2022",
    stats: { owned: total || 0, created: 23, sold: 45, totalVolume: "234.5 ROSE", floorValue: "89.2 ROSE" }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20" />
        {userProfile.banner && <Image src={userProfile.banner} alt="Profile banner" fill className="object-cover" />}
      </div>
      <div className="container mx-auto px-4">
        <div className="relative -mt-0 mb-8">
          {userLoading ? (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-24" /></div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                <AvatarFallback>{userProfile.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{userProfile.name}</h1>
                  {userProfile.verified && <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Star className="h-3 w-3 mr-1" />Verified</Badge>}
              </div>
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <span>{userProfile.username}</span>
                  <Button variant="ghost" size="sm" onClick={copyAddress} className="h-6 w-6 p-0"><Copy className="h-3 w-3" /></Button>
              </div>
                <p className="text-muted-foreground mb-4 max-w-2xl">{userProfile.bio}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs"><Activity className="h-3 w-3 mr-1" />Joined {userProfile.joined}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className="font-semibold">{userProfile.stats.owned}</span><span className="text-muted-foreground ml-1">Owned</span></div>
                  <div><span className="font-semibold">{userProfile.stats.created}</span><span className="text-muted-foreground ml-1">Created</span></div>
                  <div><span className="font-semibold">{userProfile.stats.sold}</span><span className="text-muted-foreground ml-1">Sold</span></div>
                  <div><span className="font-semibold">{userProfile.stats.totalVolume}</span><span className="text-muted-foreground ml-1">Volume</span></div>
                  <div><span className="font-semibold">{userProfile.stats.floorValue}</span><span className="text-muted-foreground ml-1">Floor Value</span></div>
                </div>
                </div>
            <div className="flex gap-2">
                <Button onClick={() => setShowSettings(true)}><Settings className="h-4 w-4 mr-2" />Edit Profile</Button>
                <Button variant="outline" onClick={() => setShowCollectionSelector(true)}><Package className="h-4 w-4 mr-2" />List Collection</Button>
                <Button variant="outline" onClick={() => setShowAuctionCollectionSelector(true)}><Gavel className="h-4 w-4 mr-2" />Auction Collection</Button>
            </div>
          </div>
          )}
        </div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="owned">Owned ({userProfile.stats.owned})</TabsTrigger>
              <TabsTrigger value="created">Created ({userProfile.stats.created})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="offers">Offers</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
              <div className="relative"><Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search NFTs..." className="pl-10 w-64" /></div>
              </div>
            </div>
          <TabsContent value="owned">
            {loading ? (
              <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Alert className="max-w-md mx-auto"><AlertCircle className="h-4 w-4" /><AlertDescription>Error loading NFTs: {error}</AlertDescription></Alert>
                <Button onClick={() => refetch()} className="mt-4"><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground" /></div>
                <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                <p className="text-muted-foreground mb-4">You don't have any NFTs in your wallet yet.</p>
                <Button asChild><Link href="/explore">Explore Marketplace</Link></Button>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
                {nfts.map(nft => (
                  <Card key={`${nft.contractAddress}-${nft.tokenId}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square">
                      <Image src={nft.image || '/placeholder-nft.jpg'} alt={nft.name} fill className="object-cover" />
                      <div className="absolute top-2 left-2">{nft.rarity && <Badge className={getRarityColor(nft.rarity)}>{nft.rarity}</Badge>}</div>
                      <div className="absolute top-2 right-2"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 hover:bg-white"><Heart className="h-4 w-4" /></Button></div>
                      </div>
                    <CardContent className="p-4">
                      <div className="mb-3"><h3 className="font-semibold text-lg mb-1">{nft.name}</h3><p className="text-sm text-muted-foreground">{nft.collectionName}</p></div>
                      {nft.attributes && nft.attributes.length > 0 && (
                        <div className="mb-3"><div className="flex flex-wrap gap-1">{nft.attributes.slice(0, 3).map((attr, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{attr.trait_type}: {attr.value}</Badge>))}{nft.attributes.length > 3 && <Badge variant="secondary" className="text-xs">+{nft.attributes.length - 3} more</Badge>}</div></div>
                      )}
                      <div className="flex gap-2">{renderSellDialog(nft)}<Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedAuctionNFT(nft); setShowAuctionDialog(true); }}><Gavel className="h-4 w-4 mr-2" />Auction</Button></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="created"><div className="text-center py-12"><div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"><Edit className="h-12 w-12 text-muted-foreground" /></div><h3 className="text-xl font-semibold mb-2">Created NFTs</h3><p className="text-muted-foreground">NFTs you've created will appear here.</p></div></TabsContent>
          <TabsContent value="activity"><div className="text-center py-12"><div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"><Activity className="h-12 w-12 text-muted-foreground" /></div><h3 className="text-xl font-semibold mb-2">Activity Feed</h3><p className="text-muted-foreground">Your trading activity will appear here.</p></div></TabsContent>
          <TabsContent value="offers"><div className="text-center py-12"><div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"><Gavel className="h-12 w-12 text-muted-foreground" /></div><h3 className="text-xl font-semibold mb-2">Offers</h3><p className="text-muted-foreground">Offers on your NFTs will appear here.</p></div></TabsContent>
        </Tabs>
      </div>
      {showCollectionSelector && (
  <CollectionSelector 
    nfts={nfts} 
    isLoading={isCollectionListing || isMarketPending || isMarketConfirming}
    transactionStatus={currentTransactionType === 'collection' ? transactionStatus : 'idle'}
    lastTransactionHash={currentTransactionType === 'collection' ? lastTransactionHash : undefined}
    onClose={() => {
      resetTransactionStates(true) // ✅ Reset và đóng dialog
    }} 
    onSell={handleListCollection} 
  />
)}
      {showAuctionDialog && renderAuctionDialog()}
      {showAuctionCollectionSelector && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    {/* ✅ Success Popup cho collection auction */}
    {transactionStatus === 'success' && lastTransactionHash && currentTransactionType === 'collection' && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
        <Card className="max-w-md w-full mx-4 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => {
              // ✅ Chỉ đóng popup, không đóng main dialog
              setTransactionStatus('idle')
              setCurrentTransactionType(null)
              setLastTransactionHash('')
              setIsCreatingCollectionAuction(false)
              delete (window as any).pendingAuctionData
              // KHÔNG setShowAuctionCollectionSelector(false) ở đây
            }}
          >
            <X className="w-4 h-4" />
          </Button>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Collection Auction Created Successfully! 🎉</h3>
            <p className="text-muted-foreground mb-4">
              Your collection auction has been created and is now live on the marketplace.
            </p>
            <div className="bg-muted p-3 rounded mb-4">
              <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
              <p className="text-sm font-medium break-all">{lastTransactionHash}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  window.open(`https://testnet.explorer.sapphire.oasis.dev/tx/${lastTransactionHash}`, "_blank")
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  // ✅ Reset để tạo auction mới, KHÔNG đóng main dialog
                  setTransactionStatus('idle')
                  setCurrentTransactionType(null)
                  setLastTransactionHash('')
                  setIsCreatingCollectionAuction(false)
                  delete (window as any).pendingAuctionData
                  // Form sẽ được reset trong AuctionCollectionSelector component
                }}
              >
                Create Another
              </Button>
            </div>
            <div className="mt-2">
              <Button 
                variant="outline" 
                className="w-full"
                asChild
              >
                <Link href="/auctions">
                  View in Auctions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {/* ✅ Main Dialog - LUÔN hiển thị, không ẩn khi success */}
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative flex flex-col">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => {
          // ✅ Đóng hoàn toàn main dialog
          setTransactionStatus('idle')
          setCurrentTransactionType(null)
          setLastTransactionHash('')
          setIsCreatingCollectionAuction(false)
          setShowAuctionCollectionSelector(false)
        }} 
        className="absolute right-4 top-4 z-20"
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {/* ✅ Loading/Processing State */}
        {(isAuctionPending || isAuctionConfirming || isCreatingCollectionAuction) && (
          <div className="mb-6 p-4 rounded-lg border bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {isCreatingCollectionAuction && !isAuctionPending
                  ? 'Preparing collection auction...'
                  : isAuctionPending 
                  ? 'Creating collection auction transaction...' 
                  : 'Confirming collection auction on blockchain...'}
              </span>
            </div>
            {(isAuctionConfirming || (isCreatingCollectionAuction && isAuctionPending)) && (
              <div className="mt-2 text-xs text-blue-600">
                ⏳ Collection auctions may take longer to process
              </div>
            )}
          </div>
        )}

        {/* ✅ Status notification khi success */}
        {transactionStatus === 'success' && currentTransactionType === 'collection' && (
          <div className="mb-6 p-4 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Collection auction created successfully! You can create another auction or close this dialog.
              </span>
            </div>
          </div>
        )}

        <AuctionCollectionSelector 
          nfts={nfts} 
          isLoading={isCreatingCollectionAuction || isAuctionPending || isAuctionConfirming} 
          onClose={() => {
            setTransactionStatus('idle')
            setCurrentTransactionType(null)
            setLastTransactionHash('')
            setIsCreatingCollectionAuction(false)
            setShowAuctionCollectionSelector(false)
          }} 
          onCreateAuction={handleCreateCollectionAuction} 
        />
      </div>
      
      {showSuccessNotification && (
        <div className="absolute left-0 right-0 top-0 mx-auto mt-4 w-fit p-3 rounded bg-green-100 text-green-800 text-center font-medium">
          {successNotificationMessage}
        </div>
      )}
    </div>
  </div>
)}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)} 
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>
            <UserSettings
              user={user || defaultUser()}
              onSave={handleSaveSettings} 
              onCancel={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}
    </div>
  )

  function getRarityColor(rarity: string) {
    const colors: { [key: string]: string } = {
      "Common": "bg-gray-100 text-gray-800", "Uncommon": "bg-green-100 text-green-800", "Rare": "bg-blue-100 text-blue-800",
      "Epic": "bg-purple-100 text-purple-800", "Legendary": "bg-orange-100 text-orange-800", "Mythic": "bg-red-100 text-red-800",
      "Unique": "bg-yellow-100 text-yellow-800"
    }
    return colors[rarity] || "bg-gray-100 text-gray-800"
  }
}