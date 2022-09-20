// SPDX-License-Identifier: UNLICENSED
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

  mapping(uint => Claim) claims;
  uint claimCount = 0;
  mapping(address => uint) userClaims;
  address[] closureQueue;
  uint queueIndex;
  CFAv1Library.InitData public cfaV1;
  IConstantFlowAgreementV1 internal cfa; // The stored constant flow agreement class address


  constructor(ISuperfluid host, IConstantFlowAgreementV1 _cfa) {

    cfa = _cfa;
    cfaV1 = CFAv1Library.InitData(host, IConstantFlowAgreementV1(address(host.getAgreementClass(keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")))));
  }

  function addClaim(ISuperToken token, int96 rate, uint duration, uint deadline) public onlyOwner {

    // NOTE: Maybe require no streams so you can't run two claims at a time
    Claim memory claim = Claim(token, rate, duration, deadline);
    claimCount += 1;
    claims[claimCount] = claim;

  }

  function addUserClaim(address recipient, uint claimIndex) public onlyOwner {

    userClaims[recipient] = claimIndex;

  }

  function claim() public {

    require(userClaims[msg.sender] != 0, 'no claims');
    closureQueue.push(msg.sender);
    cfaV1.createFlow(msg.sender, claims[userClaims[msg.sender]].token, claims[userClaims[msg.sender]].rate);

  }

  function closeNext() public {

    address toClose = closureQueue[queueIndex];

    ( uint256 timestamp,
      int96 flowRate,
      uint256 deposit,
      uint256 owedDeposit) = cfa.getFlow(
        claims[userClaims[toClose]].token,
        toClose,
        address(this)
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
    } else {
      // If we don't need to close, revert with message for Gelato
      revert('not ready to close');
    }


    // 2. How much has been streamed to this recipient so far? Is it more than rate * duration?
    // TODO
  }

}
