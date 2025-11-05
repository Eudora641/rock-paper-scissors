/**
 * Hardhat task to display available accounts
 *
 * This task prints all available signer accounts for the current network,
 * useful for development and testing purposes.
 */

import { task } from "hardhat/config";

task("accounts", "Prints the list of accounts", async (_taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(`${account.address}`);
  }
});
