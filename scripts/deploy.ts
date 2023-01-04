import { ethers } from "hardhat";

let hostAddress;
let cfaAddress;

async function main() {

  console.log("Network: ", hre.hardhatArguments.network);

  if(hre.hardhatArguments.network == "mumbai") {
    // Mumbai Network Tokens: SF Host, CFA, and fDAIx
    hostAddress = "0xEB796bdb90fFA0f28255275e16936D25d3418603";
    cfaAddress = "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873";
  } else if(hre.hardhatArguments.network == "polygon") {
    // Mainnet Polygon Network Tokens: SF Host, CFA, RIC Token
    hostAddress = "0x3E14dC1b13c488a8d5D310918780c983bD5982E7";
    cfaAddress = "0x6EeE6060f715257b970700bc2656De21dEdF074C";
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const WaterDrops = await ethers.getContractFactory("WaterDrops");
  const waterDrops = await WaterDrops.deploy(hostAddress, cfaAddress);
  await waterDrops.deployed();
  console.log("WaterDrops has been deployed at:", waterDrops.address);

  // TODO: Setup the first waterdrop?

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
