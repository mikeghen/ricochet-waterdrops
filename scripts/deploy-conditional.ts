import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  let hostAddress, cfaAddress, dropToken, reqToken;
  let duration, rate, deadline;
  let reqRecipient, reqAmount, reqDuration;

  if(hre.hardhatArguments.network === "mumbai") { 
    console.log("Deploying to Matic Mumbai Network");
    // Matic Mumbai
    hostAddress = "0xEB796bdb90fFA0f28255275e16936D25d3418603";
    cfaAddress = "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873";
    dropToken = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f";
    reqToken = "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7";

    // Claim info
    duration = 600; // 10 minutes
    rate = 1000000;  // tokens per second to claim
    deadline = 1764811946; // 2025

    // Required condition info
    reqRecipient = deployer.address;
    reqAmount = 600000000;  // 1000000 per second
    reqDuration = 600; // 10 minutes

  } else if(hre.hardhatArguments.network === "polygon") {
    console.log("Deploying to Matic Mainnet Network");
    
    // Condition: Stream  at least 100 USDC into the USDC>>ETH Launchpad 
    // over at least 7 days, get 0.25 rexSHIRT back over 60 days

    // Matic Mainnet 
    hostAddress = "0x3E14dC1b13c488a8d5D310918780c983bD5982E7";
    cfaAddress = "0x6EeE6060f715257b970700bc2656De21dEdF074C";

    // Claim info - will receive 0.25 rexSHIRT over 60 days
    dropToken = "0x19cA69C66768B487D28226C0a60Ab2B2aa8E5c5C"; // rexSHIRT
    duration = 60 * 24 * 60 * 60; // Over 60 days it will stream 0.25 rexSHIRT
    rate = "48225308642";  // tokens per second to claim 0.25 rexSHIRT
    deadline = 1672614405; // 2023-01-01

    // Required condition info - Stream at least 100 USDC over at least 1 week
    reqToken = "0xCAa7349CEA390F89641fe306D93591f87595dc1F"; // USDC token is used to stream into ..
    reqRecipient = "0xF1748222B08193273fd34FF10A28352A2C25Adb0"; // USDC<>ETH REX Market
    reqAmount = "100000000000000000000";  // 100 USDC to meet condition
    reqDuration = 7 * 24 * 60 * 60; // 7 days

    // // Claim info - will receive 0.25 RIC over 60 days
    // dropToken = "0xe91D640fCAEA9602CF94C0d48A251a7f6d946953"; // rexHAT
    // duration = 60 * 24 * 60 * 60; // Over 60 days it will stream 0.25 RIC
    // rate = "48225308642";  // tokens per second to claim 0.25 rexHAT
    // deadline = 1680321600; // 2023-04-01, ~3 months to claim

    // // Required condition info - Must stream at least 1000 RIC over 7 days or more
    // reqToken = "0x263026E7e53DBFDce5ae55Ade22493f828922965"; // RIC token is used to stream into ..
    // reqRecipient = "0x19cA69C66768B487D28226C0a60Ab2B2aa8E5c5C"; // the rexSHIRT Launchpad contract
    // reqAmount = "1000000000000000000000";  // 1000 RIC to meet condition

  }

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ConditionalWaterDrop = await ethers.getContractFactory("ConditionalWaterDrop");
  console.log("Deploying ConditionalWaterDrop with params:", hostAddress, cfaAddress, dropToken, rate, duration, deadline);
  const waterDrops = await ConditionalWaterDrop.deploy(
    hostAddress,
    cfaAddress,
    dropToken,
    rate,
    duration,
    deadline,
  );
  await waterDrops.deployed();
  console.log("WaterDrops has been deployed at:", waterDrops.address);
  console.log("Initializing with params:", reqToken, reqAmount, reqRecipient);

  await waterDrops.initialize(reqToken, reqAmount, reqDuration, reqRecipient);
  console.log("ConditionalWaterDrop initialized.");


  // To test:
  // 1. Start streaming reqToken to the reqRecipient at reqAmount per second over reqDuration seconds
  // 2. Call claim() on the ConditionalWaterDrop contract after meeting reqAmount/reqDuration
  // 3. Verify that you start receiveing dropToken at rate per second for duration seconds

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
