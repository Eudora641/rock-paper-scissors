"use client";

import { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";

import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { CloakAndClashABI } from "@/abi/CloakAndClashABI";
import { CloakAndClashAddresses } from "@/abi/CloakAndClashAddresses";
import { useAppFhevm } from "@/app/providers";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";

type MatchViewOutput = Awaited<ReturnType<ethers.Contract["getMatch"]>>;

export type DecryptedMatch = {
  matchId: bigint;
  moveA?: number;
  moveB?: number;
  outcome?: number;
  aWins?: boolean;
  bWins?: boolean;
  isTie?: boolean;
};

export type DecryptedStats = {
  wins: number;
  losses: number;
  ties: number;
};

type ContractMetadata = {
  address?: `0x${string}`;
  chainName?: string;
  abi: typeof CloakAndClashABI.abi;
};

function getContractMetadata(chainId: number | undefined): ContractMetadata {
  if (!chainId) {
    return { abi: CloakAndClashABI.abi };
  }
  const entry =
    CloakAndClashAddresses[chainId.toString() as keyof typeof CloakAndClashAddresses];
  if (!entry || entry.address === ethers.ZeroAddress) {
    return { abi: CloakAndClashABI.abi, chainName: entry?.chainName };
  }
  return {
    address: entry.address as `0x${string}`,
    chainName: entry.chainName,
    abi: CloakAndClashABI.abi,
  };
}

function assertInstance(instance: FhevmInstance | undefined): asserts instance is FhevmInstance {
  if (!instance) {
    throw new Error("FHE instance is not ready yet.");
  }
}

export function useCloakAndClash() {
  const { instance, signer, provider, chainId, address, isConnected } = useAppFhevm();
  const { storage } = useInMemoryStorage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  const contractInfo = useMemo(() => getContractMetadata(chainId), [chainId]);

  const readOnlyProvider = useMemo(() => provider ?? undefined, [provider]);

  const contractWithSigner = useMemo(() => {
    if (!signer || !contractInfo.address) {
      return undefined;
    }
    return new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
  }, [contractInfo, signer]);

  const contractReadOnly = useMemo(() => {
    if (!readOnlyProvider || !contractInfo.address) {
      return undefined;
    }
    return new ethers.Contract(
      contractInfo.address,
      contractInfo.abi,
      readOnlyProvider,
    );
  }, [contractInfo, readOnlyProvider]);

  const ensureContractAvailable = useCallback(() => {
    if (!contractInfo.address) {
      throw new Error(
        contractInfo.chainName
          ? `CloakAndClash is not deployed on ${contractInfo.chainName}.`
          : "Contract deployment not found for the selected network.",
      );
    }
    if (!isConnected) {
      throw new Error("Connect your wallet to interact with the arena.");
    }
    if (!contractWithSigner) {
      throw new Error("Signer is unavailable. Switch network or reconnect wallet.");
    }
  }, [contractInfo, isConnected, contractWithSigner]);

  const encryptMove = useCallback(
    async (move: number) => {
      assertInstance(instance);
      if (!address) {
        throw new Error("Wallet address missing.");
      }
      ensureContractAvailable();
      const input = instance.createEncryptedInput(contractInfo.address!, address);
      input.add8(move);
      return input.encrypt();
    },
    [instance, address, ensureContractAvailable, contractInfo.address],
  );

  const extractMatchId = useCallback(
    (logs: readonly ethers.Log[]) => {
      if (!contractWithSigner) return undefined;
      for (const log of logs ?? []) {
        if (!log || String(log.address).toLowerCase() !== String(contractWithSigner.target).toLowerCase()) {
          continue;
        }
        try {
          const parsed = contractWithSigner.interface.parseLog(log);
          if (parsed && parsed.name === "MatchCreated") {
            const value = parsed.args?.matchId ?? parsed.args?.[0];
            if (typeof value === "bigint") {
              return value;
            }
          }
        } catch {
          // ignore non-matching logs
        }
      }
      return undefined;
    },
    [contractWithSigner],
  );

  const createMatch = useCallback(
    async (opponent: string, move: number) => {
      setError(undefined);
      setTxHash(undefined);
      ensureContractAvailable();
      if (!ethers.isAddress(opponent)) {
        throw new Error("Opponent address is invalid.");
      }
      if (move < 0 || move > 2) {
        throw new Error("Move must be 0 (Rock), 1 (Paper), or 2 (Scissors).");
      }
      const enc = await encryptMove(move);
      setIsProcessing(true);
      try {
        const tx = await contractWithSigner!.createMatch(
          opponent,
          enc.handles[0],
          enc.inputProof,
        );
        setTxHash(tx.hash);
        const receipt = await tx.wait();
        const matchId = extractMatchId(receipt?.logs ?? []);
        return {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          matchId: matchId ?? undefined,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    [contractWithSigner, encryptMove, ensureContractAvailable],
  );

  const submitMove = useCallback(
    async (matchId: bigint, move: number) => {
      setError(undefined);
      setTxHash(undefined);
      ensureContractAvailable();
      const enc = await encryptMove(move);
      setIsProcessing(true);
      try {
        const tx = await contractWithSigner!.submitMove(
          matchId,
          enc.handles[0],
          enc.inputProof,
        );
        setTxHash(tx.hash);
        const receipt = await tx.wait();
        return {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          matchId: matchId ?? undefined,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    [contractWithSigner, ensureContractAvailable, encryptMove],
  );

  const resolveMatch = useCallback(
    async (matchId: bigint) => {
      setError(undefined);
      setTxHash(undefined);
      ensureContractAvailable();
      setIsProcessing(true);
      try {
        const tx = await contractWithSigner!.resolveMatch(matchId);
        setTxHash(tx.hash);
        const receipt = await tx.wait();
        return {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          matchId: matchId ?? undefined,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    [contractWithSigner, ensureContractAvailable],
  );

  const fetchMatch = useCallback(
    async (matchId: bigint) => {
      if (!contractReadOnly) {
        throw new Error("Read provider unavailable for this network.");
      }
      return contractReadOnly.getMatch(matchId) as Promise<MatchViewOutput>;
    },
    [contractReadOnly],
  );

  const decryptMatch = useCallback(
    async (matchId: bigint, match: MatchViewOutput): Promise<DecryptedMatch> => {
      assertInstance(instance);
      ensureContractAvailable();
      if (!signer) {
        throw new Error("Wallet signer required for decryption.");
      }
      const handles = [
        match.moveA,
        match.moveB,
        match.outcome,
        match.aWins,
        match.bWins,
        match.isTie,
      ];

      const uniqueHandles = Array.from(new Set(handles.filter((h) => h && h !== ethers.ZeroHash)));
      if (uniqueHandles.length === 0) {
        return { matchId };
      }

      const signature = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractInfo.address!],
        signer,
        storage,
      );

      if (!signature) {
        throw new Error("Unable to sign decryption request.");
      }

      const response = await instance.userDecrypt(
        uniqueHandles.map((handle) => ({ handle, contractAddress: contractInfo.address! })),
        signature.privateKey,
        signature.publicKey,
        signature.signature,
        signature.contractAddresses,
        signature.userAddress,
        signature.startTimestamp,
        signature.durationDays,
      );

      const getValue = (handle: string) =>
        response[handle] !== undefined ? response[handle] : undefined;

      return {
        matchId,
        moveA: getValue(match.moveA) !== undefined ? Number(getValue(match.moveA)) : undefined,
        moveB: getValue(match.moveB) !== undefined ? Number(getValue(match.moveB)) : undefined,
        outcome:
          getValue(match.outcome) !== undefined ? Number(getValue(match.outcome)) : undefined,
        aWins: getValue(match.aWins) !== undefined ? Boolean(getValue(match.aWins)) : undefined,
        bWins: getValue(match.bWins) !== undefined ? Boolean(getValue(match.bWins)) : undefined,
        isTie: getValue(match.isTie) !== undefined ? Boolean(getValue(match.isTie)) : undefined,
      };
    },
    [instance, ensureContractAvailable, signer, storage, contractInfo.address],
  );

  const fetchAndDecryptStats = useCallback(
    async (account: string) => {
      assertInstance(instance);
      ensureContractAvailable();
      if (!signer) {
        throw new Error("Wallet signer required for decryption.");
      }
      if (!contractReadOnly) {
        throw new Error("Read provider unavailable for this network.");
      }

      const stats = await contractReadOnly.getPlayerStats(account);
      const signature = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractInfo.address!],
        signer,
        storage,
      );

      if (!signature) {
        throw new Error("Unable to sign decryption request.");
      }

      const response = await instance.userDecrypt(
        [stats.wins, stats.losses, stats.ties].map((handle) => ({
          handle,
          contractAddress: contractInfo.address!,
        })),
        signature.privateKey,
        signature.publicKey,
        signature.signature,
        signature.contractAddresses,
        signature.userAddress,
        signature.startTimestamp,
        signature.durationDays,
      );

      const safeNumber = (value: unknown) =>
        typeof value === "bigint" ? Number(value) : Number(value ?? 0);

      return {
        wins: safeNumber(response[stats.wins]),
        losses: safeNumber(response[stats.losses]),
        ties: safeNumber(response[stats.ties]),
      } satisfies DecryptedStats;
    },
    [instance, ensureContractAvailable, signer, contractReadOnly, contractInfo.address, storage],
  );

  return {
    contractAddress: contractInfo.address,
    chainName: contractInfo.chainName,
    isConnected,
    isProcessing,
    error,
    txHash,
    createMatch,
    submitMove,
    resolveMatch,
    fetchMatch,
    decryptMatch,
    fetchAndDecryptStats,
  };
}

