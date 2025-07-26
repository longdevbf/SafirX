'use client';

import React, { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/walletContext";
import {config} from '@/components/config/wagmiConfig'
import  {MarketplaceProvider}  from "@/context/marketplaceContext"
import { AuctionDatabaseProvider } from '@/context/auctionDatabaseContext'

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <WalletProvider>
              <MarketplaceProvider>
                <AuctionDatabaseProvider>
                  <div suppressHydrationWarning>
                    {mounted && children}
                  </div>
                </AuctionDatabaseProvider>
              </MarketplaceProvider>
            </WalletProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}