/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import { Address, parseEther } from 'viem';
import { useReadContract, useWriteContract } from 'wagmi';
import { SEALED_BID_AUCTION_CONFIG } from '@/abis/AuctionSealedBid';

interface Bid {
  bidder: Address;
  amount: string;
  timestamp: string;
  deposit: string;
}

const useSealedBidAuction = () => {
  const { writeContractAsync, data, error, isPending, isSuccess } = useWriteContract();

  // Tạo auction cho single NFT
  const createSingleNFTAuction = useCallback(
    async (
      nftContract: Address,
      tokenId: number,
      startingPrice: string,
      reservePrice: string,
      minBidIncrement: string,
      duration: number,
      title: string,
      description: string
    ) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'createSingleNFTAuction',
          args: [
            nftContract,
            BigInt(tokenId),
            parseEther(startingPrice),
            parseEther(reservePrice),
            parseEther(minBidIncrement),
            BigInt(duration),
            title,
            description,
          ],
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi tạo single NFT auction:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Tạo auction cho collection NFT
  const createCollectionAuction = useCallback(
    async (
      nftContract: Address,
      tokenIds: number[],
      startingPrice: string,
      reservePrice: string,
      minBidIncrement: string,
      duration: number,
      title: string,
      description: string
    ) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'createCollectionAuction',
          args: [
            nftContract,
            tokenIds.map(id => BigInt(id)),
            parseEther(startingPrice),
            parseEther(reservePrice),
            parseEther(minBidIncrement),
            BigInt(duration),
            title,
            description,
          ],
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi tạo collection auction:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Đặt bid cho auction
  const placeBid = useCallback(
    async (auctionId: number, bidAmount: string, startingPrice: string) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'placeBid',
          args: [BigInt(auctionId), parseEther(bidAmount)],
          value: parseEther(startingPrice),
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi đặt bid:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Finalize auction
  const finalizeAuction = useCallback(
    async (auctionId: number) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'finalizeAuction',
          args: [BigInt(auctionId)],
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi finalize auction:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Hủy auction
  const cancelAuction = useCallback(
    async (auctionId: number) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'cancelAuction',
          args: [BigInt(auctionId)],
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi hủy auction:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Claim NFT
  const claimNFT = useCallback(
    async (auctionId: number, remainingAmount: string) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'claimNFT',
          args: [BigInt(auctionId)],
          value: parseEther(remainingAmount),
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi claim NFT:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Reclaim NFT
  const reclaimNFT = useCallback(
    async (auctionId: number) => {
      try {
        const tx = await writeContractAsync({
          address: SEALED_BID_AUCTION_CONFIG.address,
          abi: SEALED_BID_AUCTION_CONFIG.abi,
          functionName: 'reclaimNFT',
          args: [BigInt(auctionId)],
        });
        return tx;
      } catch (error) {
        console.error('Lỗi khi reclaim NFT:', error);
        throw error;
      }
    },
    [writeContractAsync]
  );

  // Hook riêng cho getAuctionBids
  const useGetAuctionBids = (auctionId: number) => {
    return useReadContract({
      address: SEALED_BID_AUCTION_CONFIG.address,
      abi: SEALED_BID_AUCTION_CONFIG.abi,
      functionName: 'getAuctionBids',
      args: [BigInt(auctionId)],
      query: { enabled: !!auctionId },
    });
  };

  return {
    createSingleNFTAuction,
    createCollectionAuction,
    placeBid,
    finalizeAuction,
    cancelAuction,
    claimNFT,
    reclaimNFT,
    useGetAuctionBids,
    hash: data, // Transaction hash
    error,
    isPending,
    isConfirming: isPending,
    isConfirmed: isSuccess,
  };
};

export default useSealedBidAuction;
