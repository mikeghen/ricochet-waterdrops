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

contract WaterDrop is Ownable {

  using CFAv1Library for CFAv1Library.InitData;

  struct Claim {
    ISuperToken token;
    int96 rate;
    uint duration;
    uint deadline;
  }
  // Claims tracking variables
  Claim public waterDrop;
  mapping(address=>bool) public userClaims;
  uint public claimCount = 0;
  address[] public closureQueue;
  uint public queueIndex;
  mapping(address=>bool) public hasClaimed;

  // Superfluid variables
  CFAv1Library.InitData internal cfaV1;
  ISuperfluid internal host; // Superfluid host contract
  IConstantFlowAgreementV1 internal cfa; // The stored constant flow agreement class address

  // Events
  event NewWaterdrop(ISuperToken token, int96 rate, uint duration, uint deadline);
  event NewUserClaim(address recipient);
  event Claimed(address user, int96 rate);
  event StreamClosed(
      address user,
      address token
  );

  constructor(ISuperfluid _host,
    IConstantFlowAgreementV1 _cfa,
    ISuperToken _claimToken,
    int96 _rate,
    uint _duration,
    uint _deadline
  ) {

    host = _host;
    cfa = _cfa;
    // initialize InitData struct, and set equal to cfaV1
    cfaV1 = CFAv1Library.InitData(
        host,
        cfa
    );
    // Save the claim info
    waterDrop = Claim(_claimToken, _rate, _duration, _deadline);
    emit NewWaterdrop(_claimToken, _rate, _duration, _deadline);
  }

  // Used to add accounts to be eligible for the claim
  function addUserClaim(address recipient) public onlyOwner {
    userClaims[recipient] = true;
    emit NewUserClaim(recipient);
  }

  function claim() public {
    // Anyone can claim as long as they meet the conditions below
    require(waterDrop.deadline > block.timestamp, 'deadline past');
    require(hasClaimed[msg.sender] == false, 'already claimed');

    // Require they have a user claim
    require(userClaims[msg.sender] == true, 'no claim for user');

    // Mark as claimed and add them to the end of the closure queue
    hasClaimed[msg.sender] = true;
    closureQueue.push(msg.sender);
    cfaV1.createFlow(msg.sender, waterDrop.token, waterDrop.rate);
    emit Claimed(msg.sender, waterDrop.rate);

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
        waterDrop.token,
        address(this),
        toClose
    );

    // When did the stream start? Has duration amount of time passed?
    // If enough time has passed, close the stream

    // How much time has passed?
    uint256 duration = block.timestamp - timestamp;

    // Is that larger than the claim's duration?
    if (duration > waterDrop.duration) {
      // Streams over, close stram to toClose
      cfaV1.deleteFlow(address(this), toClose, waterDrop.token);
      // Increment queue index and gelato will check on the next to close
      queueIndex += 1;
      // Remove the claim for this user
      userClaims[toClose] = false;
      emit StreamClosed(toClose, address(waterDrop.token));
    } else {
      // If we don't need to close, revert with message for Gelato
      revert('not ready to close');
    }

  }

  // Convinence method for getting flow information
  function getFlow(address recipient) public view returns (uint256 timestamp,
    int96 flowRate,
    uint256 deposit,
    uint256 owedDeposit)
  {
    (timestamp,
      flowRate,
      deposit,
      owedDeposit) = cfa.getFlow(waterDrop.token, address(this), recipient);
  }

}