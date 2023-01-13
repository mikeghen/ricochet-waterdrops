import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  let waterDropsAddress: string = "";
  let userClaims;

  // Open a file and loop over the contents line by line
  const fs = require('fs');
  const readline = require('readline');
  const fileStream = fs.createReadStream('./scripts/user-claims.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  userClaims = [];

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    const address = line;
    userClaims.push({address: address});
  }

  if(hre.hardhatArguments.network === "mumbai") { 
    console.log("Adding User Claims on Mumbai");
    waterDropsAddress = "0x091196943555d3e1513F7775ffA6b5779d3DefE9";

  } else if(hre.hardhatArguments.network === "polygon") {
    console.log("Adding User Claims on Polygon");
    waterDropsAddress = "0x114e5EAbd33B34F3B7f481Df4fc2617dE6cd2B66";

  }

  console.log("Adding User Claims");
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const WaterDrop = await ethers.getContractFactory("WaterDrop");
  const waterdrop = await WaterDrop.attach(waterDropsAddress);
  
  let tx;
  for (const userClaim of userClaims) {
    tx = await waterdrop.addUserClaim(userClaim.address);
    await tx.wait(1);
    console.log("Added user claim for", userClaim.address, "tx:", tx.hash);
  }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
