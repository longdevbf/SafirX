import { useNFTMarket } from './use-market';
import { useCacheSync } from './use-cached-marketplace';
import { useCallback } from 'react';

export function useEnhancedMarket() {
  const market = useNFTMarket();
  const { syncListing, updateCachedData } = useCacheSync();

  const enhancedListSingleNFT = useCallback(async (
    nftContract: string, 
    tokenId: string, 
    priceInROSE: string
  ) => {
    try {
      // Execute the blockchain transaction
      await market.listSingleNFT(nftContract, tokenId, priceInROSE);
      
      // Wait for confirmation
      return new Promise<void>((resolve, reject) => {
        const checkConfirmation = () => {
          if (market.isConfirmed && market.hash) {
            // Sync to cache after successful transaction
            syncListing(market.hash, {
              nftContract,
              tokenId,
              seller: market.hash, // This would be actual seller address
              price: priceInROSE,
              isBundle: false,
              listingType: 'single'
            }).then(() => {
              resolve();
            }).catch(reject);
          } else if (market.error) {
            reject(market.error);
          } else {
            setTimeout(checkConfirmation, 1000);
          }
        };
        checkConfirmation();
      });
    } catch (error) {
      console.error('Error in enhanced list single NFT:', error);
      throw error;
    }
  }, [market, syncListing]);

  const enhancedBuyNFTUnified = useCallback(async (
    id: string, 
    priceInROSE: string
  ) => {
    try {
      // Execute the blockchain transaction
      await market.buyNFTUnified(id, priceInROSE);
      
      // Wait for confirmation
      return new Promise<void>((resolve, reject) => {
        const checkConfirmation = () => {
          if (market.isConfirmed && market.hash) {
            // Update cache to mark as sold
            updateCachedData('listing', id, {
              deactivate: true
            }).then(() => {
              resolve();
            }).catch(reject);
          } else if (market.error) {
            reject(market.error);
          } else {
            setTimeout(checkConfirmation, 1000);
          }
        };
        checkConfirmation();
      });
    } catch (error) {
      console.error('Error in enhanced buy NFT:', error);
      throw error;
    }
  }, [market, updateCachedData]);

  const enhancedCancelListingUnified = useCallback(async (id: string) => {
    try {
      // Execute the blockchain transaction
      await market.cancelListingUnified(id);
      
      // Wait for confirmation
      return new Promise<void>((resolve, reject) => {
        const checkConfirmation = () => {
          if (market.isConfirmed && market.hash) {
            // Update cache to mark as cancelled
            updateCachedData('listing', id, {
              deactivate: true
            }).then(() => {
              resolve();
            }).catch(reject);
          } else if (market.error) {
            reject(market.error);
          } else {
            setTimeout(checkConfirmation, 1000);
          }
        };
        checkConfirmation();
      });
    } catch (error) {
      console.error('Error in enhanced cancel listing:', error);
      throw error;
    }
  }, [market, updateCachedData]);

  return {
    // Enhanced functions with cache sync
    listSingleNFT: enhancedListSingleNFT,
    buyNFTUnified: enhancedBuyNFTUnified,
    cancelListingUnified: enhancedCancelListingUnified,
    
    // Pass through other functions from original hook
    listCollectionBundle: market.listCollectionBundle,
    listCollectionIndividual: market.listCollectionIndividual,
    listCollectionSamePrice: market.listCollectionSamePrice,
    buyNFT: market.buyNFT,
    buyCollectionBundle: market.buyCollectionBundle,
    updatePrice: market.updatePrice,
    updateBundlePrice: market.updateBundlePrice,
    cancelListing: market.cancelListing,
    cancelCollection: market.cancelCollection,
    approveNFT: market.approveNFT,
    
    // Transaction state
    hash: market.hash,
    error: market.error,
    isPending: market.isPending,
    isConfirming: market.isConfirming,
    isConfirmed: market.isConfirmed,
  };
}

// Enhanced auction hook
export function useEnhancedAuction() {
  // This would be implemented similarly for auctions
  // For now, we'll just return the basic hook
  return {
    // TODO: Implement enhanced auction functions
  };
}

// Helper function to extract listing ID from transaction receipt
export function extractListingIdFromReceipt(receipt: {
  logs?: Array<{
    topics?: string[]
  }>
}): string | null {
  try {
    // This would parse the transaction receipt to extract the listing ID
    // The actual implementation depends on your smart contract events
    return receipt?.logs?.[0]?.topics?.[1] || null;
  } catch (error) {
    console.error('Error extracting listing ID:', error);
    return null;
  }
}