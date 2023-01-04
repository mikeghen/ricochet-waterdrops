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
    userClaims.push({address: address, claim: 2});
  }

  if(hre.hardhatArguments.network === "mumbai") { 
    console.log("Adding User Claims on Mumbai");
    waterDropsAddress = "0x2Dfb623Df06946405BAAF59A12CA549c5dF1eBaB";

  } else if(hre.hardhatArguments.network === "polygon") {
    console.log("Adding User Claims on Polygon");
    waterDropsAddress = "0x9dA677c3423E0eBc1e3d7c0a86e9b9a34Bbd2874";

  }

  console.log("Adding User Claims");
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const WaterDrop = await ethers.getContractFactory("WaterDrops");
  const waterdrop = await WaterDrop.attach(waterDropsAddress);
  
  let tx;
  for (const userClaim of userClaims) {
    tx = await waterdrop.addUserClaim(userClaim.address, userClaim.claim);
    await tx.wait(1);
    console.log("Added user claim", userClaim.address, userClaim.claim);
  }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
