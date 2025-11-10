
/**
 * Integration tests for CloakAndClash contract on Sepolia testnet
 *
 * These tests verify the end-to-end functionality of the FHEVM-based
 * Rock Paper Scissors game on the Sepolia test network.
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers, fhevm } from "hardhat";

const CONTRACT_NAME = "CloakAndClash";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

function progress(step: number, total: number, message: string) {
  console.log(`${step}/${total} ${message}`);
}

describe("CloakAndClashSepolia", function () {
  let signers: Signers;
  let totalSteps: number;
  let currentStep: number;
  let contractAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This test suite only targets Sepolia (real FHEVM)");
      this.skip();
    }

    try {
      const deployment = await deployments.get(CONTRACT_NAME);
      contractAddress = deployment.address;
    } catch (error) {
      (error as Error).message += `. Make sure to deploy with 'npx hardhat deploy --network sepolia'`;
      throw error;
    }

    const ethSigners = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    currentStep = 0;
    totalSteps = 9;
  });

  it("runs an end-to-end encrypted match on Sepolia", async function () {
    this.timeout(6 * 60 * 1000); // plenty of time for remote oracle

    const contract = await ethers.getContractAt(CONTRACT_NAME, contractAddress);

    await fhevm.initializeCLIApi();

    currentStep += 1;
    progress(currentStep, totalSteps, "Encrypting Alice move (Rock)");
    const aliceCipher = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(0).encrypt();

    currentStep += 1;
    progress(currentStep, totalSteps, "Submitting createMatch transaction");
    const txCreate = await contract
      .connect(signers.alice)
      .createMatch(signers.bob.address, aliceCipher.handles[0], aliceCipher.inputProof);
    await txCreate.wait();

    const nextId = await contract.nextMatchId();
    const matchId = nextId - 1n;

    currentStep += 1;
    progress(currentStep, totalSteps, "Encrypting Bob move (Scissors)");
    const bobCipher = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add8(2).encrypt();

    currentStep += 1;
    progress(currentStep, totalSteps, "Bob submits the counter move");
    const txSubmit = await contract
      .connect(signers.bob)
      .submitMove(matchId, bobCipher.handles[0], bobCipher.inputProof);
    await txSubmit.wait();

    currentStep += 1;
    progress(currentStep, totalSteps, "Resolving match outcome");
    const txResolve = await contract.connect(signers.alice).resolveMatch(matchId);
    await txResolve.wait();

    currentStep += 1;
    progress(currentStep, totalSteps, "Fetching on-chain match view");
    const matchView = await contract.getMatch(matchId);
    expect(matchView.outcomeReady).to.eq(true);

    currentStep += 1;
    progress(currentStep, totalSteps, "Decrypting outcome");
    const outcome = await fhevm.userDecryptEuint(FhevmType.euint8, matchView.outcome, contractAddress, signers.alice);
    progress(currentStep, totalSteps, `Outcome decrypted: ${outcome.toString()}`);
    expect(outcome).to.eq(1n);

    currentStep += 1;
    progress(currentStep, totalSteps, "Decrypting Alice stats");
    const statsAlice = await contract.getPlayerStats(signers.alice.address);
    const aliceWins = await fhevm.userDecryptEuint(FhevmType.euint32, statsAlice.wins, contractAddress, signers.alice);
    progress(currentStep, totalSteps, `Alice wins (decrypted): ${aliceWins.toString()}`);

    currentStep += 1;
    progress(currentStep, totalSteps, "Decrypting Bob stats");
    const statsBob = await contract.getPlayerStats(signers.bob.address);
    const bobLosses = await fhevm.userDecryptEuint(FhevmType.euint32, statsBob.losses, contractAddress, signers.bob);
    progress(currentStep, totalSteps, `Bob losses (decrypted): ${bobLosses.toString()}`);

    expect(aliceWins).to.eq(1n);
    expect(bobLosses).to.eq(1n);
  });

  it("Should handle multiple matches and accumulate statistics correctly", async function () {
    const { contract, contractAddress } = await loadFixture(deployCloakAndClashFixture);

    // First match: Alice wins
    const { handle: handle1, proof: proof1 } = await encryptMove(contractAddress, signers.alice, 0); // Rock
    const { handle: handle2, proof: proof2 } = await encryptMove(contractAddress, signers.bob, 2);   // Scissors

    await contract.connect(signers.alice).createMatch(signers.bob.address, handle1, proof1);
    await contract.connect(signers.bob).submitMove(1, handle2, proof2);
    await contract.connect(signers.alice).resolveMatch(1);

    // Second match: Bob wins
    const { handle: handle3, proof: proof3 } = await encryptMove(contractAddress, signers.alice, 1); // Paper
    const { handle: handle4, proof: proof4 } = await encryptMove(contractAddress, signers.bob, 0);   // Rock

    await contract.connect(signers.bob).createMatch(signers.alice.address, handle4, proof4);
    await contract.connect(signers.alice).submitMove(2, handle3, proof3);
    await contract.connect(signers.bob).resolveMatch(2);

    // Check accumulated statistics
    const aliceStats = await contract.getPlayerStats(signers.alice.address);
    const bobStats = await contract.getPlayerStats(signers.bob.address);

    const aliceWins = await fhevm.userDecryptEuint(FhevmType.euint32, aliceStats.wins, contractAddress, signers.alice);
    const aliceLosses = await fhevm.userDecryptEuint(FhevmType.euint32, aliceStats.losses, contractAddress, signers.alice);
    const bobWins = await fhevm.userDecryptEuint(FhevmType.euint32, bobStats.wins, contractAddress, signers.bob);
    const bobLosses = await fhevm.userDecryptEuint(FhevmType.euint32, bobStats.losses, contractAddress, signers.bob);

    expect(aliceWins).to.eq(1n);
    expect(aliceLosses).to.eq(1n);
    expect(bobWins).to.eq(1n);
    expect(bobLosses).to.eq(1n);
  });
});
