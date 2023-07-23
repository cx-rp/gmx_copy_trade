import './styles/App.css';
import { Wallet } from "./components/Wallet";
import { Home } from "./components/Home";
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { arbitrum } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

import { useAccount } from 'wagmi';
import { createContext } from "react";

const avalancheChain = {
  id: 43_114,
  name: 'Avalanche',
  network: 'avalanche',
  iconUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=025',
  iconBackground: '#fff',
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: {
      http: ['https://api.avax.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://snowtrace.io' },
    etherscan: { name: 'SnowTrace', url: 'https://snowtrace.io' },
  },
  testnet: false,
};

const { chains, publicClient } = configureChains(
  [arbitrum, avalancheChain],
  [
    alchemyProvider({ apiKey: process.env.ALCHEMY_ID }),
    jsonRpcProvider({
      rpc: chain => ({ http: chain.rpcUrls.default.http[0] }),
    }),
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'My RainbowKit App',
  projectId: 'ee6ee26fbfb5a4ae91cfcad3ebf932b7',
  chains
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

export const WalletContext = createContext();

function App() {
  const { address, isConnected } = useAccount();
  return (
    <WalletContext.Provider value={address}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains}>
          <div className='connect'>
            <Wallet/>
          </div>
          <Home/>
        </RainbowKitProvider>
      </WagmiConfig>
    </WalletContext.Provider>
  )
}

export default App;
