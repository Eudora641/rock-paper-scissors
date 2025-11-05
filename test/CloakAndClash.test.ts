
/**
 * Test suite for CloakAndClash contract
 *
 * This test suite covers the core functionality of the privacy-preserving
 * Rock Paper Scissors game, including match creation, move submission,
 * outcome resolution, and encrypted statistics tracking.
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import { CloakAndClash, CloakAndClash__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function encryptMove(
  contractAddress: string,
  signer: HardhatEthersSigner,
  move: number,
): Promise<{ handle: string; proof: string }> {
  const cipher = await fhevm.createEncryptedInput(contractAddress, signer.address).add8(move).encrypt();
  return { handle: cipher.handles[0], proof: cipher.inputProof };
}

async function decryptUint8(
  contractAddress: string,
  signer: HardhatEthersSigner,
  handle: string,
): Promise<number> {
  return Number(await fhevm.userDecryptEuint(FhevmType.euint8, handle, contractAddress, signer));
}

async function decryptUint32(
  contractAddress: string,
  signer: HardhatEthersSigner,
  handle: string,
): Promise<number> {
  return Number(await fhevm.userDecryptEuint(FhevmType.euint32, handle, contractAddress, signer));
}

async function decryptBool(contractAddress: string, signer: HardhatEthersSigner, handle: string): Promise<boolean> {
  return fhevm.userDecryptEbool(handle, contractAddress, signer);
}

describe("CloakAndClash", () => {
  let signers: Signers;
  let contract: CloakAndClash;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This test suite requires the FHEVM hardhat mock environment");
      this.skip();
    }

    const factory = (await ethers.getContractFactory("CloakAndClash")) as CloakAndClash__factory;
    contract = await factory.deploy();
    contractAddress = await contract.getAddress();
  });

  it("allows opponent submission and resolves with correct outcome", async () => {
    // Alice chooses Rock (0)
    const aliceEncrypted = await encryptMove(contractAddress, signers.alice, 0);
    await contract.connect(signers.alice).createMatch(signers.bob.address, aliceEncrypted.handle, aliceEncrypted.proof);

    const nextId = await contract.nextMatchId();
    const matchId = nextId - 1n;

    // Bob chooses Scissors (2)
    const bobEncrypted = await encryptMove(contractAddress, signers.bob, 2);
    await contract.connect(signers.bob).submitMove(matchId, bobEncrypted.handle, bobEncrypted.proof);

    await contract.connect(signers.alice).resolveMatch(matchId);

    const matchView = await contract.getMatch(matchId);

    expect(matchView.outcomeReady).to.eq(true);
    expect(matchView.status).to.eq(2); // Resolved

    const outcome = await decryptUint8(contractAddress, signers.alice, matchView.outcome);
    const aWins = await decryptBool(contractAddress, signers.alice, matchView.aWins);
    const bWins = await decryptBool(contractAddress, signers.alice, matchView.bWins);
    const tie = await decryptBool(contractAddress, signers.alice, matchView.isTie);

    expect(outcome).to.eq(1); // Player A wins
    expect(aWins).to.eq(true);
    expect(bWins).to.eq(false);
    expect(tie).to.eq(false);

    const statsAlice = await contract.getPlayerStats(signers.alice.address);
    const statsBob = await contract.getPlayerStats(signers.bob.address);

    expect(await decryptUint32(contractAddress, signers.alice, statsAlice.wins)).to.eq(1);
    expect(await decryptUint32(contractAddress, signers.alice, statsAlice.losses)).to.eq(0);
    expect(await decryptUint32(contractAddress, signers.alice, statsAlice.ties)).to.eq(0);

    expect(await decryptUint32(contractAddress, signers.bob, statsBob.wins)).to.eq(0);
    expect(await decryptUint32(contractAddress, signers.bob, statsBob.losses)).to.eq(1);
    expect(await decryptUint32(contractAddress, signers.bob, statsBob.ties)).to.eq(0);
  });

  it("records ties correctly", async () => {
    const aliceEncrypted = await encryptMove(contractAddress, signers.alice, 1); // Paper
    await contract.connect(signers.alice).createMatch(signers.bob.address, aliceEncrypted.handle, aliceEncrypted.proof);

    const matchId = (await contract.nextMatchId()) - 1n;

    const bobEncrypted = await encryptMove(contractAddress, signers.bob, 1); // Paper
    await contract.connect(signers.bob).submitMove(matchId, bobEncrypted.handle, bobEncrypted.proof);

    await contract.connect(signers.bob).resolveMatch(matchId);

    const matchView = await contract.getMatch(matchId);

    const outcome = await decryptUint8(contractAddress, signers.alice, matchView.outcome);
    const tie = await decryptBool(contractAddress, signers.alice, matchView.isTie);

    expect(outcome).to.eq(0);
    expect(tie).to.eq(true);

    const statsAlice = await contract.getPlayerStats(signers.alice.address);
    const statsBob = await contract.getPlayerStats(signers.bob.address);

    expect(await decryptUint32(contractAddress, signers.alice, statsAlice.ties)).to.eq(1);
    expect(await decryptUint32(contractAddress, signers.bob, statsBob.ties)).to.eq(1);
  });

  it("handles forfeits when opponent misses the deadline", async () => {
    const aliceEncrypted = await encryptMove(contractAddress, signers.alice, 2); // Scissors
    await contract.connect(signers.alice).createMatch(signers.bob.address, aliceEncrypted.handle, aliceEncrypted.proof);

    const matchId = (await contract.nextMatchId()) - 1n;

    // Fast-forward past deadline (> 3 minutes)
    await ethers.provider.send("evm_increaseTime", [181]);
    await ethers.provider.send("evm_mine", []);

    await contract.connect(signers.alice).resolveMatch(matchId);

    const matchView = await contract.getMatch(matchId);
    const outcome = await decryptUint8(contractAddress, signers.alice, matchView.outcome);

    expect(matchView.outcomeReady).to.eq(true);
    expect(outcome).to.eq(1); // Player A wins by default

    const statsAlice = await contract.getPlayerStats(signers.alice.address);
    const statsBob = await contract.getPlayerStats(signers.bob.address);

    expect(await decryptUint32(contractAddress, signers.alice, statsAlice.wins)).to.eq(1);
    expect(await decryptUint32(contractAddress, signers.bob, statsBob.losses)).to.eq(1);
  });
});
