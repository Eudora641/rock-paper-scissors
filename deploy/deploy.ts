/**
 * Deployment script for CloakAndClash contract
 *
 * This script handles the deployment of the FHEVM-based Rock Paper Scissors contract
 * to various networks including localhost and Sepolia testnet.
 */

import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cloakAndClash = await deploy("CloakAndClash", {
    from: deployer,
    log: true,
  });

  console.log(`CloakAndClash contract deployed at: ${cloakAndClash.address}`);
};
export default func;
func.id = "deploy_cloak_and_clash"; // id required to prevent reexecution
func.tags = ["CloakAndClash"];
