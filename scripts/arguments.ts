import { ethers } from "hardhat";

let tokenAddress;
let hostAddress;
let cfaAddress;

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

module.exports = [
  hostAddress,
  cfaAddress
];
