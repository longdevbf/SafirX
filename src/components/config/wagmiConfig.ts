import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sapphireTestnet } from 'wagmi/chains';

const oasisSapphire = {
  id: 0x5afe,
  name: 'Oasis Sapphire',
  nativeCurrency: {
    decimals: 18,
    name: 'ROSE',
    symbol: 'ROSE',
  },
  rpcUrls: {
    default: {
      http: ['https://sapphire.oasis.io'],
    },
    public: {
      http: ['https://sapphire.oasis.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Oasis Explorer', url: 'https://explorer.oasis.io/mainnet/sapphire' },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Oasis',
  projectId: `${process.env.PROJECT_ID}`, 
  chains: [oasisSapphire, sapphireTestnet, mainnet],
  ssr: true,
});