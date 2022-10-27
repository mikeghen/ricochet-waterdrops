// SPDX-License-Identifier: Business Source License
pragma solidity ^0.8.9;

import {
    ISuperfluid,
    ISuperToken
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {
    IConstantFlowAgreementV1
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
    CFAv1Library
} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract WaterDrops is Ownable {

  using CFAv1Library for CFAv1Library.InitData;

  struct Claim {
    ISuperToken token;
    int96 rate;
    uint duration;
    uint deadline;
  }

  mapping(uint => Claim) public claims;
  uint claimCount = 0;
  mapping(address => uint) public userClaims;
  address[] closureQueue;
  uint queueIndex;
  CFAv1Library.InitData public cfaV1;
  ISuperfluid internal host; // Superfluid host contract
  IConstantFlowAgreementV1 internal cfa; // The stored constant flow agreement class address


  constructor(ISuperfluid _host, IConstantFlowAgreementV1 _cfa) {

    host = _host;
    cfa = _cfa;
    // initialize InitData struct, and set equal to cfaV1
    cfaV1 = CFAv1Library.InitData(
        host,
        cfa
    );

  }

  function addClaim(ISuperToken token, int96 rate, uint duration, uint deadline) public onlyOwner {

    // NOTE: Maybe require no streams so you can't run two claims at a time
    Claim memory claimm = Claim(token, rate, duration, deadline);
    claimCount += 1;
    claims[claimCount] = claimm;

  }

  function addUserClaim(address recipient, uint claimIndex) public onlyOwner {

    userClaims[recipient] = claimIndex;

  }

  function claim() public {

    require(userClaims[msg.sender] != 0, 'no claims');
    require(claims[userClaims[msg.sender]].deadline > block.timestamp, 'dealine past');
    closureQueue.push(msg.sender);
    cfaV1.createFlow(msg.sender, claims[userClaims[msg.sender]].token, claims[userClaims[msg.sender]].rate);

  }

  function closeNext() public {

    // Streams are opened sequentially, so they can be closed sequentially iff
    // everyone in the claim is claiming the same amount. Only one claim can
    // run at one time

    address toClose = closureQueue[queueIndex];

    ( uint256 timestamp,
      int96 flowRate,
      uint256 deposit,
      uint256 owedDeposit) = cfa.getFlow(
        claims[userClaims[toClose]].token,
        address(this),
        toClose
    );

    // Two ways to check:
    // 1. When did the stream start? Has duration amount of time passed?

    // How much time has passed?
    uint256 duration = block.timestamp - timestamp;

    // Is that larger than the claim's duration?
    if (duration > claims[userClaims[toClose]].duration) {
      // Streams over, close stram to toClose
      cfaV1.deleteFlow(address(this), toClose, claims[userClaims[toClose]].token);
      // Increment queue index and gelato will check on the next to close
      queueIndex += 1;
      // Remove the claim for this user
      userClaims[toClose] = 0;
    } else {
      // If we don't need to close, revert with message for Gelato
      revert('not ready to close');
    }


    // 2. How much has been streamed to this recipient so far? Is it more than rate * duration?
    // TODO
  }

  function getFlow(address recipient) public view returns (uint256 timestamp,
    int96 flowRate,
    uint256 deposit,
    uint256 owedDeposit)
  {
    // If there's no userClaim for the recipient then they don't have a stream
    if (userClaims[recipient] != 0) {
      (timestamp,
        flowRate,
        deposit,
        owedDeposit) = cfa.getFlow(claims[userClaims[recipient]].token, address(this), recipient);
    } else {
      timestamp = 0;
      flowRate = 0;
      deposit = 0;
      owedDeposit = 0;
    }
  }

}
