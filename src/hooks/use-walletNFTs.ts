import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/context/walletContext';
import { ProcessedNFT } from '@/interfaces/nft';

// Updated interface to match actual API response
interface OasisNFT {
  description: string;
  id: string;
  image: string;
  metadata: {
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
    description?: string;
    image?: string;
    name?: string;
  };
  metadata_accessed: string;
  metadata_uri: string;
  name: string;
  num_transfers: number;
  owner: string;
  owner_eth: string;
  token: {
    contract_addr: string;
    decimals: number;
    eth_contract_addr: string;
    is_verified: boolean;
    name: string;
    num_holders: number;
    num_transfers: number;
    symbol: string;
    total_supply: string;
    type: string;
  };
}

interface OasisAPIResponse {
  evm_nfts: OasisNFT[];
  is_total_count_clipped: boolean;
  total_count: number;
}

export function useWalletNFTs() {
  const [nfts, setNfts] = useState<ProcessedNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // ✅ Add refs to prevent infinite loops
  const fetchCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isManualRefetchRef = useRef(false);
  
  const { address, isConnected } = useWallet();

  const processNFT = useCallback((nft: OasisNFT, index: number): ProcessedNFT => {
    // Get contract address from token object
    const contractAddress = nft.token?.eth_contract_addr || nft.token?.contract_addr || 'unknown';
    const tokenId = nft.id;
    
    // Create truly unique ID
    const uniqueId = `${contractAddress}-${tokenId}-${index}`;
    
    console.log('Processing NFT:', {
      name: nft.name,
      id: nft.id,
      contractAddress,
      tokenName: nft.token?.name,
      tokenSymbol: nft.token?.symbol
    });
    
    // Image is directly available
    let image = nft.image;
    
    // Handle IPFS URLs if needed
    if (image && image.startsWith('ipfs://')) {
      image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    
    // Fallback image if none found
    if (!image) {
      image = '/assets/nft.jpg';
    }

    // Extract attributes from metadata
    let attributes: Array<{ trait_type: string; value: string }> = [];
    if (nft.metadata?.attributes && Array.isArray(nft.metadata.attributes)) {
      attributes = nft.metadata.attributes;
    }

    // Determine rarity based on attributes
    let rarity = 'Common';
    if (attributes && attributes.length > 0) {
      const rarityAttr = attributes.find(attr => 
        attr.trait_type?.toLowerCase().includes('rarity') ||
        attr.trait_type?.toLowerCase().includes('tier')
      );
      if (rarityAttr) {
        rarity = rarityAttr.value;
      } else if (attributes.length >= 7) {
        rarity = 'Legendary';
      } else if (attributes.length >= 5) {
        rarity = 'Epic';
      } else if (attributes.length >= 3) {
        rarity = 'Rare';
      }
    }

    // Get collection name from different sources
    let collectionName = 'Unknown Collection';
    
    // Priority: 
    // 1. Collection attribute from metadata
    // 2. Token name
    // 3. Token symbol
    const collectionAttr = attributes.find(attr => 
      attr.trait_type?.toLowerCase() === 'collection'
    );
    
    if (collectionAttr?.value) {
      collectionName = collectionAttr.value;
    } else if (nft.token?.name) {
      collectionName = nft.token.name;
    } else if (nft.token?.symbol) {
      collectionName = nft.token.symbol;
    }

    return {
      id: uniqueId,
      name: nft.name || `NFT #${tokenId}`,
      collection: collectionName,
      image,
      contractAddress: contractAddress,
      tokenId: tokenId,
      description: nft.description,
      attributes: attributes,
      rarity,
      metadata: nft.metadata,
      // Additional data that might be useful
      owner: nft.owner_eth
    };
  }, []);

  // ✅ Improved fetch function with throttling
  const fetchNFTs = useCallback(async (limit = 100, offset = 0, forceRefresh = false) => {
    if (!address || !isConnected) {
      setNfts([]);
      setTotal(0);
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // ✅ Prevent rapid successive fetches (unless forced)
    if (!forceRefresh && timeSinceLastFetch < 2000) {
      console.log('🚫 Fetch throttled - too soon since last fetch');
      return;
    }

    fetchCountRef.current += 1;
    const currentFetchId = fetchCountRef.current;
    
    console.log(`🚀 Starting fetch #${currentFetchId}:`, { 
      address, 
      limit, 
      offset, 
      forceRefresh,
      isManual: isManualRefetchRef.current 
    });

    setLoading(true);
    setError(null);
    lastFetchTimeRef.current = now;

    try {
      const url = `https://testnet.nexus.oasis.io/v1/sapphire/accounts/${address}/nfts?limit=${limit}&offset=${offset}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // ✅ Check if this fetch is still relevant
      if (currentFetchId !== fetchCountRef.current) {
        console.log(`🚫 Fetch #${currentFetchId} cancelled - newer fetch in progress`);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs: ${response.status} ${response.statusText}`);
      }

      const data: OasisAPIResponse = await response.json();

      if (!Array.isArray(data.evm_nfts)) {
        console.error('EVM NFTs is not an array:', data.evm_nfts);
        setNfts([]);
        setTotal(0);
        return;
      }

      const processedNFTs: ProcessedNFT[] = data.evm_nfts?.map((nft, index) => processNFT(nft, index)) || [];
      
      console.log(`✅ Fetch #${currentFetchId} completed:`, {
        processedCount: processedNFTs.length,
        totalCount: data.total_count,
        isManual: isManualRefetchRef.current
      });
      
      if (offset === 0) {
        setNfts(processedNFTs);
      } else {
        setNfts(prev => [...prev, ...processedNFTs]);
      }
      
      setTotal(data.total_count || processedNFTs.length);
      
      // ✅ Reset manual refetch flag
      isManualRefetchRef.current = false;
      
    } catch (err) {
      if (currentFetchId === fetchCountRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching NFTs';
        setError(errorMessage);
        console.error(`❌ Fetch #${currentFetchId} failed:`, err);
        
        if (offset === 0) {
          setNfts([]);
          setTotal(0);
        }
      }
    } finally {
      if (currentFetchId === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, [address, isConnected, processNFT]);

  // ✅ Manual refetch function
  const refetch = useCallback(() => {
    console.log('🔄 Manual refetch requested');
    isManualRefetchRef.current = true;
    fetchNFTs(100, 0, true);
  }, [fetchNFTs]);

  // ✅ Initial fetch effect - only on mount and address/connection changes
  useEffect(() => {
    console.log('🎯 useEffect triggered:', { address, isConnected });
    
    if (address && isConnected) {
      // ✅ Only auto-fetch on initial load or address change
      fetchNFTs(100, 0, false);
    } else {
      setNfts([]);
      setTotal(0);
      setError(null);
    }
  }, [address, isConnected]); // ✅ Remove fetchNFTs from dependencies

  return {
    nfts,
    loading,
    error,
    total,
    refetch,
    loadMore: useCallback((offset: number) => fetchNFTs(100, offset, false), [fetchNFTs]),
  };
}