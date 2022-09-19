// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {
    ISuperfluid
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {
    IConstantFlowAgreementV1
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
    CFAv1Library
} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract WaterDrops {

  using CFAv1Library for CFAv1Library.InitData;

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
  CFAv1Library.InitData public cfaV1;
  IConstantFlowAgreementV1 internal cfa; // The stored constant flow agreement class address


  constructor(ISuperfluid host, IConstantFlowAgreementV1 _cfa) {

    cfa = _cfa;
    cfaV1 = CFAv1Library.InitData(host, IConstantFlowAgreementV1(address(host.getAgreementClass(keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")))));
  }

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
    cfaV1.createFlow(msg.sender, claims[userClaims[msg.sender]].token, fclaims[userClaims[msg.sender]].rate);

  }

  closeNext() public {

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
    timestamp = block.timestamp - timestamp;

    // Is that larger than the duration?
    if (timestamp > duration) {
      // Streams over, close stram to toClose
      cfaV1.deleteFlow(toClose, claims[userClaims[toClose]].token);
    } else {
      // If we don't need to close, revert with message for Gelato
      revert('not ready to close');
    }

  }

}
