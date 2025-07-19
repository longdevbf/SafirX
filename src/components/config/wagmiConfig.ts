import { createSapphireConfig } from '@oasisprotocol/sapphire-wagmi-v2';
import { http } from 'wagmi';
import { sapphire, sapphireTestnet, mainnet } from 'wagmi/chains';

export const config = createSapphireConfig({
    sapphireConfig: {
        replaceProviders: false,
        wrappedProvidersFilter: (rdns) => ['io.metamask'].includes(rdns),
    },
    chains: [sapphire, sapphireTestnet, mainnet],
    transports: {
        [sapphire.id]: http(),
        [sapphireTestnet.id]: http(),
        [mainnet.id]: http(),
    },
});
