import { ethers } from "hardhat";

async function main() {

  // Matic Mumbai
  const HOST_ADDRESS = "0xEB796bdb90fFA0f28255275e16936D25d3418603";
  const CFA_ADDRESS = "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873";
  const FDAIX_ADDRESS = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f"

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const WaterDrops = await ethers.getContractFactory("WaterDrops");
  const waterDrops = await WaterDrops.deploy(HOST_ADDRESS, CFA_ADDRESS);
  await waterDrops.deployed();
  console.log("WaterDrops has been deployed at:", waterDrops.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
