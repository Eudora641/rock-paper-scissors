/**
 * Hardhat task to display available accounts
 *
 * This task prints all available signer accounts for the current network,
 * useful for development and testing purposes.
 */

import { task } from "hardhat/config";

task("accounts", "Prints the list of accounts", async (_taskArgs, hre) => {
  try {
    const accounts = await hre.ethers.getSigners();

    console.log(`\n📋 Available accounts on ${hre.network.name}:`);
    console.log("=".repeat(50));

    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.address}`);
    });

    console.log(`\nTotal: ${accounts.length} accounts\n`);
  } catch (error) {
    console.error("❌ Error fetching accounts:", error);
    process.exit(1);
  }
});
