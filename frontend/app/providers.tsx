"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useAccount, useChainId, usePublicClient, WagmiConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { http } from "wagmi";

import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { useFhevm, type FhevmGoState } from "@/fhevm/useFhevm";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";

type Props = {
  children: ReactNode;
};

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "88306a972a77389d91871e08d26516af";

const wagmiConfig = getDefaultConfig({
  appName: "Cloak & Clash",
  projectId,
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

type AppFhevmContextValue = {
  instance: FhevmInstance | undefined;
  status: FhevmGoState;
  refresh: () => void;
  signer: ethers.JsonRpcSigner | undefined;
  provider: ethers.BrowserProvider | undefined;
  chainId: number | undefined;
  address: `0x${string}` | undefined;
  isConnected: boolean;
};

const AppFhevmContext = createContext<AppFhevmContextValue | undefined>(undefined);

function FhevmProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const eip1193Provider = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    return (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum;
  }, []);

  const { instance, status, refresh } = useFhevm({
    provider: eip1193Provider,
    chainId,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
  });

  const [browserProvider, setBrowserProvider] = useState<ethers.BrowserProvider | undefined>(
    undefined,
  );
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);

  useEffect(() => {
    if (!eip1193Provider) {
      setBrowserProvider(undefined);
      return;
    }
    const provider = new ethers.BrowserProvider(eip1193Provider, chainId);
    setBrowserProvider(provider);
  }, [eip1193Provider, chainId, publicClient]);

  useEffect(() => {
    if (!browserProvider || !address) {
      setSigner(undefined);
      return;
    }
    let ignore = false;

    browserProvider
      .getSigner(address)
      .then((result) => {
        if (!ignore) {
          setSigner(result);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSigner(undefined);
        }
      });

    return () => {
      ignore = true;
    };
  }, [browserProvider, address]);

  const value: AppFhevmContextValue = useMemo(
    () => ({
      instance,
      status,
      refresh,
      signer,
      provider: browserProvider,
      chainId,
      address: address as `0x${string}` | undefined,
      isConnected,
    }),
    [instance, status, refresh, signer, browserProvider, chainId, address, isConnected],
  );

  return <AppFhevmContext.Provider value={value}>{children}</AppFhevmContext.Provider>;
}

export function useAppFhevm() {
  const ctx = useContext(AppFhevmContext);
  if (!ctx) {
    throw new Error("useAppFhevm must be used within FhevmProvider");
  }
  return ctx;
}

export function Providers({ children }: Props) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={darkTheme()}>
          <InMemoryStorageProvider>
            <FhevmProvider>{children}</FhevmProvider>
          </InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
