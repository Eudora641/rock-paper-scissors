/**
 * Hardhat tasks for CloakAndClash contract interaction
 *
 * This file contains CLI tasks for interacting with the deployed CloakAndClash contract,
 * including match creation, move submission, and match resolution operations.
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "CloakAndClash";

task("clash:address", "Print deployed CloakAndClash address").setAction(async (_args: TaskArguments, hre) => {
  const { deployments } = hre;
  const deployment = await deployments.get(CONTRACT_NAME);
  console.log(`CloakAndClash deployed at: ${deployment.address}`);
});

task("clash:create-match", "Create a match with your encrypted move")
  .addParam("opponent", "Opponent address")
  .addParam("move", "Encrypted move in clear form (0=Rock,1=Paper,2=Scissors)")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    try {
      const move = parseInt(args.move, 10);
      if (!Number.isInteger(move) || move < 0 || move > 2) {
        throw new Error("Move must be 0 (Rock), 1 (Paper), or 2 (Scissors)");
      }

      console.log(`🎯 Creating match with move: ${["Rock", "Paper", "Scissors"][move]}`);
      console.log(`👥 Opponent: ${args.opponent}`);

      await fhevm.initializeCLIApi();

    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const encrypted = await fhevm.createEncryptedInput(deployment.address, signer.address).add8(move).encrypt();

    const tx = await contract
      .connect(signer)
      .createMatch(args.opponent, encrypted.handles[0], encrypted.inputProof);

    console.log(`Submitted createMatch tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`createMatch confirmed in block ${receipt?.blockNumber}`);
    console.log(`✅ Match created successfully!`);
    } catch (error) {
      console.error(`❌ Failed to create match:`, error);
      process.exit(1);
    }
  });

task("clash:submit-move", "Submit the opponent move for an existing match")
  .addParam("id", "Match identifier")
  .addParam("move", "Encrypted move in clear form (0=Rock,1=Paper,2=Scissors)")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    const move = parseInt(args.move, 10);
    if (!Number.isInteger(move) || move < 0 || move > 2) {
      throw new Error("Move must be 0 (Rock), 1 (Paper), or 2 (Scissors)");
    }

    const matchId = BigInt(args.id);

    await fhevm.initializeCLIApi();

    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const encrypted = await fhevm.createEncryptedInput(deployment.address, signer.address).add8(move).encrypt();

    const tx = await contract
      .connect(signer)
      .submitMove(matchId, encrypted.handles[0], encrypted.inputProof);

    console.log(`Submitted submitMove tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`submitMove confirmed in block ${receipt?.blockNumber}`);
  });

task("clash:resolve", "Resolve match outcome (handles forfeits automatically)")
  .addParam("id", "Match identifier")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const matchId = BigInt(args.id);
    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const tx = await contract.connect(signer).resolveMatch(matchId);
    console.log(`Submitted resolveMatch tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`resolveMatch confirmed in block ${receipt?.blockNumber}`);
  });

task("clash:inspect", "Inspect a match and decrypt available data with the CLI wallet")
  .addParam("id", "Match identifier")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const matchId = BigInt(args.id);
    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const matchData = await contract.getMatch(matchId);

    console.log(`Match ${matchId.toString()} status: ${matchData.status}`);
    console.log(`Players: ${matchData.playerA} vs ${matchData.playerB}`);
    console.log(`Created at: ${matchData.createdAt}, deadline: ${matchData.deadline}`);
    console.log(`Move A submitted: ${matchData.moveASubmitted}, Move B submitted: ${matchData.moveBSubmitted}`);
    console.log(`Outcome ready: ${matchData.outcomeReady}`);

    const decrypt = async (type: FhevmType, handle: string) =>
      fhevm.userDecryptEuint(type, handle, deployment.address, signer);

    if (matchData.moveASubmitted) {
      const moveA = await decrypt(FhevmType.euint8, matchData.moveA);
      console.log(`Player A move (decrypted): ${moveA}`);
    }

    if (matchData.moveBSubmitted) {
      const moveB = await decrypt(FhevmType.euint8, matchData.moveB);
      console.log(`Player B move (decrypted): ${moveB}`);
    }

    if (matchData.outcomeReady) {
      const outcome = await decrypt(FhevmType.euint8, matchData.outcome);
      const aWins = await fhevm.userDecryptEbool(FhevmType.ebool, matchData.aWins, deployment.address, signer);
      const bWins = await fhevm.userDecryptEbool(FhevmType.ebool, matchData.bWins, deployment.address, signer);
      const isTie = await fhevm.userDecryptEbool(FhevmType.ebool, matchData.isTie, deployment.address, signer);

      console.log(`Outcome (0=Tie,1=A,2=B): ${outcome}`);
      console.log(`aWins: ${aWins}, bWins: ${bWins}, tie: ${isTie}`);
    }
  });
