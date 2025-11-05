/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight, Award, Binary, Clock3, Eye, Swords } from "lucide-react";
import { Toaster, toast } from "sonner";

import { useAccount } from "wagmi";

import { useCloakAndClash, type DecryptedMatch, type DecryptedStats } from "@/hooks/useCloakAndClash";

// Import MatchViewOutput type
type MatchViewOutput = Awaited<ReturnType<import("ethers").Contract["getMatch"]>>;
import { usePlayerMatches, type PlayerMatch } from "@/hooks/usePlayerMatches";

const MOVE_LABELS = ["Rock", "Paper", "Scissors"] as const;
const STATUS_LABELS: Record<number, string> = {
  0: "Waiting for opponent",
  1: "Awaiting resolution",
  2: "Resolved",
  3: "Cancelled",
};

type MoveChoice = (typeof MOVE_LABELS)[number];

function moveToNumber(move: MoveChoice): number {
  return MOVE_LABELS.indexOf(move);
}

function numberToMove(value?: number) {
  if (value === undefined || value < 0 || value > 2) return "Hidden";
  return MOVE_LABELS[value];
}

const statusLabels: Record<PlayerMatch["status"], string> = {
  waitingOpponent: "Waiting for opponent",
  awaitingResolution: "Awaiting resolution",
  resolved: "Resolved",
  cancelled: "Cancelled",
  unknown: "Unknown status",
};

export default function Page() {
  const { address, isConnected } = useAccount();
  const {
    contractAddress,
    chainName,
    createMatch,
    submitMove,
    resolveMatch,
    fetchMatch,
    decryptMatch,
    fetchAndDecryptStats,
    isProcessing,
  } = useCloakAndClash();
  const { matches, upsertMatch, updateMatch } = usePlayerMatches(address);
  const activeMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status === "waitingOpponent" || match.status === "awaitingResolution",
      ),
    [matches],
  );
  const hasActiveMatch = activeMatches.length > 0;

  const [opponentAddress, setOpponentAddress] = useState("");
  const [creatorMove, setCreatorMove] = useState<MoveChoice>("Rock");

  const [joinMatchId, setJoinMatchId] = useState("");
  const [joinMove, setJoinMove] = useState<MoveChoice>("Paper");

  const [resolveId, setResolveId] = useState("");

  const [inspectId, setInspectId] = useState("");
  const [inspectedMatch, setInspectedMatch] = useState<MatchViewOutput | null>(null);
  const [decryptedMatch, setDecryptedMatch] = useState<DecryptedMatch | undefined>(undefined);

  const [playerStats, setPlayerStats] = useState<DecryptedStats | undefined>(undefined);

  const handleCreateMatch = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (hasActiveMatch) {
        toast.error("Active match in progress", {
          description: "Finish or settle your current match before starting a new one.",
        });
        return;
      }
      try {
        const result = await createMatch(opponentAddress.trim(), moveToNumber(creatorMove));
        if (result?.matchId !== undefined) {
          upsertMatch({
            matchId: result.matchId.toString(),
            role: "creator",
            opponent: opponentAddress.trim(),
            status: "waitingOpponent",
            lastUpdated: Date.now(),
          });
        }
        toast.success("Encrypted duel issued!", {
          description: "Share the match ID with your opponent to start the clash.",
        });
        setOpponentAddress("");
        setCreatorMove("Rock");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error("Failed to create match", { description: message });
      }
    },
    [hasActiveMatch, createMatch, opponentAddress, creatorMove, upsertMatch],
  );

  const handleSubmitMove = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        const id = BigInt(joinMatchId);
        const result = await submitMove(id, moveToNumber(joinMove));
        const matchKey = result.matchId ? result.matchId.toString() : joinMatchId;
        upsertMatch({
          matchId: matchKey,
          role: "challenger",
          opponent: "", // Opponent address will be filled after inspection
          status: "awaitingResolution",
          lastUpdated: Date.now(),
        });
        toast.success("Encrypted move submitted!", {
          description: "Your choice is locked—wait for the arena to resolve.",
        });
        setJoinMatchId("");
        setJoinMove("Paper");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error("Failed to submit move", { description: message });
      }
    },
    [joinMatchId, joinMove, submitMove, upsertMatch],
  );

  const handleResolve = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        const id = BigInt(resolveId);
        const result = await resolveMatch(id);
        const matchKey = result.matchId ? result.matchId.toString() : resolveId;
        updateMatch(matchKey, {
          status: "resolved",
        });
        toast.success("Match resolved!", {
          description: "Outcome is ready to decrypt.",
        });
        if (address) {
          void fetchAndDecryptStats(address)
            .then((stats) => setPlayerStats(stats))
            .catch(() => {});
        }
        setResolveId("");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error("Failed to resolve match", { description: message });
      }
    },
    [address, fetchAndDecryptStats, resolveId, resolveMatch, updateMatch],
  );

  const handleInspect = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setDecryptedMatch(undefined);
      try {
        const id = BigInt(inspectId);
        const match = await fetchMatch(id);
        setInspectedMatch({ id, match });
        updateMatch(inspectId, {
          opponent:
            match.playerA.toLowerCase() === (address ?? "").toLowerCase()
              ? match.playerB
              : match.playerA,
          status:
            match.status === 0n
              ? "waitingOpponent"
              : match.status === 1n
                ? "awaitingResolution"
                : match.status === 2n
                  ? "resolved"
                  : match.status === 3n
                    ? "cancelled"
                    : "unknown",
        });
        toast.success("Match data loaded", {
          description: "Decrypt to reveal the showdown.",
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error("Unable to fetch match", { description: message });
      }
    },
    [address, fetchMatch, inspectId, updateMatch],
  );

  const outcomeLabel = useMemo(() => {
    if (!decryptedMatch) return "Unknown";
    if (decryptedMatch.isTie) return "Draw";
    if (decryptedMatch.aWins) return "Player A wins";
    if (decryptedMatch.bWins) return "Player B wins";
    return "Unknown";
  }, [decryptedMatch]);

  const handleDecryptMatch = useCallback(async () => {
    if (!inspectedMatch) return;
    try {
      const decrypted = await decryptMatch(inspectedMatch.id, inspectedMatch.match);
      setDecryptedMatch(decrypted);
      updateMatch(decrypted.matchId.toString(), {
        status: "resolved",
        note: outcomeLabel,
      });
      toast.success("Match decrypted", {
        description: "Both choices and the verdict are now visible.",
      });
      if (address) {
        void fetchAndDecryptStats(address)
          .then((stats) => setPlayerStats(stats))
          .catch(() => {});
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error("Decryption failed", { description: message });
    }
  }, [address, decryptMatch, fetchAndDecryptStats, inspectedMatch, outcomeLabel, updateMatch]);

  const handleDecryptStats = useCallback(async () => {
    if (!address) return;
    try {
      const stats = await fetchAndDecryptStats(address);
      setPlayerStats(stats);
      toast.success("Stats decrypted", {
        description: "Your encrypted record is now visible.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error("Failed to decrypt stats", { description: message });
    }
  }, [address, fetchAndDecryptStats]);

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8">
      <Toaster position="top-right" richColors />
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/60 shadow-lg shadow-indigo-500/20">
              <img src="/cloak-logo.svg" alt="Cloak & Clash logo" className="h-10 w-10 rounded-xl" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-200/80">
                Cloak & Clash
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Encrypted Rock Paper Scissors Arena
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-slate-300 md:items-end">
            <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
              Network
            </span>
            <span className="text-base font-medium text-white">
              {chainName ?? "Unsupported"}
            </span>
            <span className="text-xs text-slate-400/80">
              Contract: {contractAddress ?? "not deployed"}
            </span>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Binary className="h-6 w-6" />,
              title: "Encrypted Plays",
              body: "Submit rock, paper, or scissors without revealing your move until showdown.",
            },
            {
              icon: <Clock3 className="h-6 w-6" />,
              title: "Three-Minute Timer",
              body: "If your opponent stalls, the oracle rules an automatic defeat.",
            },
            {
              icon: <Eye className="h-6 w-6" />,
              title: "Zero-Knowledge Reveal",
              body: "Decrypt both selections and the verdict once the clash resolves.",
            },
            {
              icon: <Award className="h-6 w-6" />,
              title: "Encrypted Record",
              body: "Wins, losses, and draws remain secret unless you decide to decrypt.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:border-indigo-400/60 hover:bg-indigo-500/10"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200 transition group-hover:scale-105">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{item.body}</p>
            </div>
          ))}
        </section>
      </div>

      <section className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center gap-3 text-indigo-200">
            <Swords className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Start An Encrypted Duel</h2>
          </div>
          <form onSubmit={handleCreateMatch} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-200">
              Opponent wallet address
              <input
                required
                value={opponentAddress}
                onChange={(event) => setOpponentAddress(event.target.value)}
                placeholder="0x..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
              />
            </label>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-slate-200">Your encrypted move</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {MOVE_LABELS.map((label) => (
                  <label
                    key={label}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      creatorMove === label
                        ? "border-indigo-400 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-slate-900/50 text-slate-300 hover:border-indigo-400/50 hover:bg-slate-900/80"
                    }`}
                  >
                    <span>{label}</span>
                    <input
                      type="radio"
                      className="hidden"
                      name="creator-move"
                      value={label}
                      checked={creatorMove === label}
                      onChange={() => setCreatorMove(label)}
                    />
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs uppercase tracking-wide">
                      {moveToNumber(label)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={!isConnected || isProcessing || hasActiveMatch}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              Issue encrypted challenge
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {hasActiveMatch && (
            <p className="text-xs text-rose-300">
              Reminder: You must finish the ongoing match before creating a new one.
            </p>
          )}

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Join An Existing Match</h3>
            <form onSubmit={handleSubmitMove} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <input
                  required
                  value={joinMatchId}
                  onChange={(event) => setJoinMatchId(event.target.value)}
                  placeholder="Match ID"
                  className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                />
                <select
                  value={joinMove}
                  onChange={(event) => setJoinMove(event.target.value as MoveChoice)}
                  className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                >
                  {MOVE_LABELS.map((move) => (
                    <option key={move}>{move}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!isConnected || isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                Submit encrypted move
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center gap-3 text-indigo-200">
            <Eye className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Resolve & Reveal</h2>
          </div>

          <form onSubmit={handleResolve} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-200">
                Match ID
                <input
                  required
                  value={resolveId}
                  onChange={(event) => setResolveId(event.target.value)}
                  placeholder="Match ID"
                  className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!isConnected || isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white/70"
            >
              Resolve match outcome
            </button>
          </form>

          <form onSubmit={handleInspect} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-200">
                Inspect match ID
                <input
                  required
                  value={inspectId}
                  onChange={(event) => setInspectId(event.target.value)}
                  placeholder="Match ID"
                  className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Load match state
              </button>
              <button
                type="button"
                onClick={handleDecryptMatch}
                disabled={!inspectedMatch}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                Decrypt outcome
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-white">Current inspection</h3>
            {inspectedMatch ? (
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <p>
                  Match #{String(inspectedMatch.id)} —{" "}
                  <span className="font-semibold text-white">
                    {STATUS_LABELS[Number(inspectedMatch.match.status)] ?? "Unknown status"}
                  </span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Player A</p>
                    <p className="truncate text-sm text-white">
                      {inspectedMatch.match.playerA}
                    </p>
                    <p className="text-xs text-slate-400">
                      Move handle: {inspectedMatch.match.moveA.slice(0, 10)}…
                    </p>
                    <p className="text-xs text-slate-400">
                      Submitted: {inspectedMatch.match.moveASubmitted ? "yes" : "pending"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Player B</p>
                    <p className="truncate text-sm text-white">
                      {inspectedMatch.match.playerB}
                    </p>
                    <p className="text-xs text-slate-400">
                      Move handle: {inspectedMatch.match.moveB.slice(0, 10)}…
                    </p>
                    <p className="text-xs text-slate-400">
                      Submitted: {inspectedMatch.match.moveBSubmitted ? "yes" : "pending"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Deadline: {Number(inspectedMatch.match.deadline) === 0 ? "—" : inspectedMatch.match.deadline.toString()}
                </p>
                {decryptedMatch && (
                  <div className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4 text-sm text-white">
                    <p className="font-semibold">Outcome: {outcomeLabel}</p>
                    <p className="text-slate-200">
                      Player A played {numberToMove(decryptedMatch.moveA)} • Player B played{" "}
                      {numberToMove(decryptedMatch.moveB)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Load a match to review encrypted moves and decrypt the final verdict.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">My Matches</h2>
            <p className="text-sm text-slate-300">
              Shows only unfinished matches so you can jump back in quickly.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {activeMatches.length === 0 ? (
            <p className="text-sm text-slate-400">
              No active matches. Start or join a duel above to see it listed here.
            </p>
          ) : (
            activeMatches.map((match) => (
              <article
                key={match.matchId}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1 text-sm text-slate-200">
                  <span className="font-semibold text-white">
                    Match #{match.matchId}
                  </span>
                  <span className="text-xs text-slate-400">
                    Role: {match.role === "creator" ? "Creator" : "Challenger"} · Opponent:{" "}
                    {match.opponent ? match.opponent : "Unknown"}
                  </span>
                  <span className="text-xs text-slate-400">
                    Status: {statusLabels[match.status] ?? statusLabels.unknown}
                  </span>
                  {match.note && (
                    <span className="text-xs text-indigo-300">Outcome: {match.note}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      setJoinMatchId(match.matchId);
                      setInspectId(match.matchId);
                      setResolveId(match.matchId);
                      toast.info("Match ID applied", {
                        description: `Match ${match.matchId} has been filled into the forms.`,
                      });
                    }}
                    className="rounded-lg border border-indigo-400/60 px-3 py-1.5 font-medium text-indigo-200 transition hover:border-indigo-300 hover:text-indigo-100"
                  >
                    Use below forms
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(match.matchId).catch(() => {
                        /* ignore */
                      });
                      toast.success("Match ID copied", {
                        description: match.matchId,
                      });
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-slate-200 transition hover:border-white/20"
                  >
                    Copy ID
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-slate-900 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">
              Your encrypted dossier
            </p>
            <h2 className="text-2xl font-semibold text-white">Career stats</h2>
          </div>
          <button
            onClick={handleDecryptStats}
            disabled={!isConnected}
            className="rounded-xl border border-indigo-400/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-indigo-100 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
          >
            Decrypt
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Wins", value: playerStats?.wins ?? null },
            { label: "Losses", value: playerStats?.losses ?? null },
            { label: "Draws", value: playerStats?.ties ?? null },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {item.value === null ? (
                  <span className="text-sm text-slate-500">Encrypted</span>
                ) : (
                  item.value
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
