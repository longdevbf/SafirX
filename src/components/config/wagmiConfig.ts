// wagmiConfig.ts
import { createConfig, http } from 'wagmi';
import { mainnet, sapphireTestnet } from 'wagmi/chains';
import { injectedWithSapphire, sapphireHttpTransport } from '@oasisprotocol/sapphire-wagmi-v2';

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
    default: { name: 'Oasis Explorer', url: 'https://explorer.oasis.io/testnet/sapphire' },
  },
} as const;

export const config = createConfig({
  multiInjectedProviderDiscovery: false,
  chains: [oasisSapphire, sapphireTestnet, mainnet],
  connectors: [injectedWithSapphire()],
  transports: {
    [oasisSapphire.id]: sapphireHttpTransport(),
    [sapphireTestnet.id]: sapphireHttpTransport(),
    [mainnet.id]: http(),
  },
});