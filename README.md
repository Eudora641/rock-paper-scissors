<<<<<<< HEAD
# Cloak & Clash — Privacy-Preserving Rock Paper Scissors

Cloak & Clash is an MVP that demonstrates how to build a full-stack game on top of the Zama FHEVM.  
Players submit encrypted Rock/Paper/Scissors moves, the contract decides the winner homomorphically, and each player maintains encrypted win/loss/tie statistics that only they can decrypt.

- **Smart contract**: `contracts/CloakAndClash.sol` (Hardhat + FHEVM plugin)
- **Frontend**: Next.js 15 + RainbowKit + wagmi (in `frontend/`)
- **Demo video**: [Watch the UI walkthrough](./cloak-and-clash.mp4) (≈1.6 MB)
- **Live deployment**: https://cloak-and-clash-k89x.vercel.app/

## Demo Highlights

- RainbowKit wallet connect (MetaMask / WalletConnect) pinned to the top-right, matching the latest UI design.
- “My Matches” panel lists only unfinished matches. Users cannot create a new match while one is active.
- Buttons for creating a match, joining, resolving, decrypting outcomes, and decrypting player statistics are wired directly to the Sepolia or local deployment.

## Smart Contract Overview

`contracts/CloakAndClash.sol` covers the entire match flow:

```solidity
function createMatch(
    address opponent,
    externalEuint8 encryptedMove,
    bytes calldata inputProof
) external returns (uint256 matchId);

function submitMove(
    uint256 matchId,
    externalEuint8 encryptedMove,
    bytes calldata inputProof
) external;

function resolveMatch(uint256 matchId) external;
function requestMatchDecryption(uint256 matchId) external returns (uint256 requestId);
function getMatch(uint256 matchId) external view returns (MatchView memory);
function getPlayerStats(address player) external view returns (PlayerStats memory);
```

Key encrypted data:

- `Match.moveA / moveB`: stored as `euint8` handles, created via `FHE.fromExternal`.
- `_computeOutcome`: uses `FHE.eq`, `FHE.and`, `FHE.or`, `FHE.select` to evaluate Rock/Paper/Scissors without revealing the moves.
- `_updatePlayerStats`: increments encrypted `wins`, `losses`, `ties` using `FHE.select` and `FHE.add`, and grants ACL permissions so each player can decrypt their own stats.

Decryption flow:

1. Resolve a match → stores `encryptedOutcome`, plus encrypted booleans for `aWins`, `bWins`, `isTie`.
2. UI calls `requestMatchDecryption` → `FHE.requestDecryption` emits oracle request.
3. Players decrypt with the FHEVM SDK (frontend uses `FhevmDecryptionSignature`) and reveal the cleartext result on demand.

## Running the Project

### 1. Install dependencies

```bash
# In the project root (Smart contracts & scripts)
npm install

# Frontend app
cd frontend
npm install
```

### 2. Environment variables

The Hardhat configuration reads either environment variables or `hardhat vars`.

```bash
# Local-only mnemonic (optional)
npx hardhat vars set MNEMONIC

# For Sepolia or any RPC provider
setx INFURA_API_KEY "<YOUR_INFURA_KEY>"
setx PRIVATE_KEY "<0xYOUR_PRIVATE_KEY>"   # account that will deploy to Sepolia
```

> **Tip:** When deploying from CI or Vercel, provide `INFURA_API_KEY` and `PRIVATE_KEY` as environment variables instead of saving through `hardhat vars`.

### 3. Local workflow

```bash
# 1. Start a local FHEVM-compatible node
npx hardhat node

# 2. Deploy the contract
npx hardhat deploy --network localhost

# 3. Generate frontend ABI & address files
cd frontend
npm run genabi

# 4. Start the frontend dev server
npm run dev
```

Open http://localhost:3000, connect a wallet (RainbowKit button at top-right), and use the UI to create/join matches. The “My Matches” panel will show any match that is still waiting for an opponent or resolution.

### 4. Sepolia deployment

```bash
# From the project root, with PRIVATE_KEY & INFURA_API_KEY set
npx hardhat deploy --network sepolia

# Update frontend ABI/address files
cd frontend
npm run genabi

# Build for production (used by Vercel)
npm run build
```

After deployment, copy the Sepolia address from the Hardhat output (also written into `frontend/abi/CloakAndClashAddresses.ts`). The frontend automatically switches between localhost and Sepolia based on the connected wallet chain.

### 5. Tests

```bash
# Hardhat unit tests (uses FHEVM mock node)
npx hardhat test

# Frontend type check & lint
cd frontend
npm run lint
npm run build   # runs `next build` which includes type checking
```

## Frontend Implementation Notes

- **Providers** (`frontend/app/providers.tsx`): wraps RainbowKit + wagmi, QueryClient, FHEVM context, and in-memory signature storage.
- **Hook** (`frontend/hooks/useCloakAndClash.tsx`): encapsulates all contract calls, encryption/decryption, match tracking, and player stats refresh.
- **My Matches store** (`frontend/hooks/usePlayerMatches.ts`): keeps unfinished matches in `localStorage`, preventing duplicate match creation while one is active.
- **UI** (`frontend/app/page.tsx`): matches the Cloak & Clash design: hero banner, “How it works”, action forms, inspect/decrypt panels, and statistics.

## Repository Layout

```
project-root/
├── contracts/
│   └── CloakAndClash.sol          # Rock/Paper/Scissors FHE contract
├── deploy/
│   └── deploy.ts                  # Hardhat-deploy script
├── frontend/
│   ├── app/page.tsx               # Main UI (matches latest design)
│   ├── hooks/useCloakAndClash.tsx # Contract/FHE integration
│   ├── hooks/usePlayerMatches.ts  # Local match tracking
│   ├── abi/CloakAndClashABI.ts    # Generated ABI
│   └── abi/CloakAndClashAddresses.ts # Generated addresses (localhost & Sepolia)
├── test/CloakAndClash.test.ts     # Local FHEVM mock tests
├── README.md
└── cloak-and-clash.mp4            # Demo walk-through (compressed to ≈1.6 MB)
```

## License

This project remains under the BSD-3-Clause-Clear License. See [LICENSE](./LICENSE) for details.

## Support & References

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Guides](https://docs.zama.ai/protocol/solidity-guides)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [wagmi Documentation](https://wagmi.sh/)
=======
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f424d3dc-0db6-4fe3-bdbd-ffc296d0da0e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f424d3dc-0db6-4fe3-bdbd-ffc296d0da0e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f424d3dc-0db6-4fe3-bdbd-ffc296d0da0e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
>>>>>>> c5b2b8cd2843637e1a7e65346fd634124022e073
