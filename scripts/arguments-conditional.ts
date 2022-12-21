  let hostAddress, cfaAddress, dropToken, reqToken;
  let duration, rate, deadline;
  let reqRecipient, reqAmount, reqDuration;

  if(hre.hardhatArguments.network === "mumbai") { 
    console.log("Deploying to Matic Mumbai Network");
    // Matic Mumbai
    hostAddress = "0xEB796bdb90fFA0f28255275e16936D25d3418603";
    cfaAddress = "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873";
    dropToken = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f";
    duration = 600; // 10 minutes
    rate = 1000000;  // tokens per second to claim
    deadline = 1764811946; // 2025

  } else if(hre.hardhatArguments.network === "polygon") {
    console.log("Deploying to Matic Mainnet Network");
    
    // Matic Mainnet 
    hostAddress = "0x3E14dC1b13c488a8d5D310918780c983bD5982E7";
    cfaAddress = "0x6EeE6060f715257b970700bc2656De21dEdF074C";
    dropToken = "0x19cA69C66768B487D28226C0a60Ab2B2aa8E5c5C"; // rexSHIRT
    duration = 60 * 24 * 60 * 60; // Over 60 days it will stream 0.25 rexSHIRT
    rate = "48225308642";  // tokens per second to claim 0.25 rexSHIRT
    deadline = 1672614405; // 2023-01-01

  }

module.exports = [
  hostAddress,
  cfaAddress,
  dropToken,
  rate,
  duration,
  deadline
];
