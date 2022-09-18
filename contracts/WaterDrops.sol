// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract WaterDrops {

  struct Claim {
    ISuperToken token
    int96 rate
    uint duration
    uint deadline
  }

  mapping(uint => Claim) claims;
  uint claimCount = 0;
  mapping(address => uint) userClaims;
  address[] closureQueue;
  uint queueIndex;
  address owner;


  addClaim(ISuperToken token, uint rate, uint duration, uint deadline) public onlyOwner {

    // NOTE: Maybe require no streams so you can't run two claims at a time
    Claim claim = new Claim(token, rate, duration, deadline);
    claimCount += 1;
    claims[claimCount] = claim;

  }

  addUserClaim(address recipient, uint claimIndex) public onlyOwner {

    userClaims[receipient] = claimIndex;

  }

  claim() public {

    require(userClaims[msg.sender] != 0, 'no claims');
    closureQueue.push(msg.sender);
    startStreaming(msg.sender, token, rate);

  }

  closeNext() public {

    address toClose = closureQueue[queueIndex];

    // Two ways to check:
    // 1. When did the stream start? Has duration amount of time passed?
    // 2. How much has been streamed to this receipient so far? Is it more than rate * duration?

  }

}
