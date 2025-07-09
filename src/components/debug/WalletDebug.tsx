'use client';

import { useWallet } from '@/context/walletContext';
import { useAccount } from 'wagmi';

export function WalletDebug() {
  const { isConnected, address, disconnect } = useWallet();
  const { isConnected: wagmiConnected, address: wagmiAddress } = useAccount();

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm">
      <h3 className="font-bold mb-2">🔍 Wallet Debug</h3>
      <div className="space-y-1 text-sm">
        <div>Context Connected: {isConnected ? '✅' : '❌'}</div>
        <div>Wagmi Connected: {wagmiConnected ? '✅' : '❌'}</div>
        <div>Context Address: {address ? `${address.slice(0, 6)}...` : 'None'}</div>
        <div>Wagmi Address: {wagmiAddress ? `${wagmiAddress.slice(0, 6)}...` : 'None'}</div>
        <div>Window: {typeof window !== 'undefined' ? '✅' : '❌'}</div>
      </div>
      {isConnected && (
        <button 
          onClick={disconnect}
          className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}