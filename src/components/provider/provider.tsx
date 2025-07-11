'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
//import { getDefaultConfig } from '@rainbow-me/rainbowkit';
//import { mainnet, sepolia } from 'wagmi/chains';
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/walletContext";
import {config} from '@/components/config/wagmiConfig'
import  {MarketplaceProvider}  from "@/context/marketplaceContext"
import { AuctionProvider } from '@/context/auctionContext'
import { AuctionDatabaseProvider } from '@/context/auctionDatabaseContext'
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <WalletProvider>
              <MarketplaceProvider>
              <AuctionProvider>
              <AuctionDatabaseProvider>
              {children}
              </AuctionDatabaseProvider>
              </AuctionProvider>
              </MarketplaceProvider>
            </WalletProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}