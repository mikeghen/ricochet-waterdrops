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

/**
 * @title WaterDrop: Contract for Managing Token Claims
 * @author Ricochet Exchange
 * @notice Allows users to make claims on a specific token at a rate for a set duration, with automatic claim closure
 * @dev Uses Superfluid and Constant Flow Agreement libraries to manage claims
 */
contract WaterDrop is Ownable {

  // Use the CFAv1Library for the CFAv1Library.InitData struct
  using CFAv1Library for CFAv1Library.InitData;

  /**
   * @dev Struct for storing claim information
   * @param token ISuperToken being claimed
   * @param rate Flow rate of the claim
   * @param duration Duration of the claim
   * @param deadline Deadline for the claim to be made 
   */
  struct Claim {
    ISuperToken token;
    int96 rate;
    uint duration;
    uint deadline;
  }

  // Claims tracking variables
  /**
   * @notice The current claim information
   */
  Claim public waterDrop;

  /**
   * @notice Mapping to track user claims
   */
  mapping(address=>bool) public userClaims;

  /**
   * @notice Count of claims made
   */
  uint public claimCount = 0;

  /**
   * @notice Queue of users waiting to close their claims
   */
  address[] public closureQueue;

  /**
   * @notice Index of the next user to close their claim
   */
  uint public queueIndex;

  /**
   * @notice Mapping to track if a user has already claimed
   */
  mapping(address=>bool) public hasClaimed;

  // Superfluid variables
  /**
   * @notice CFAv1 init data struct
   */
  CFAv1Library.InitData internal cfaV1;

  /**
   * @notice Superfluid host contract
   */
  ISuperfluid internal host;

  /**
   * @notice The stored constant flow agreement class address
   */
  IConstantFlowAgreementV1 internal cfa;

  // Events
  /**
   * @notice Emitted when a new claim is created
   * @param token The ISuperToken being claimed
   * @param rate The flow rate of the claim
   * @param duration The duration of the claim
   * @param deadline The deadline for the claim to be made
   */
  event NewWaterdrop(ISuperToken token, int96 rate, uint duration, uint deadline);
  
  /**
   * @notice Emitted when a user is added to be eligible for a claim
   * @param recipient The address of the user that was added
   */
  event NewUserClaim(address recipient);

  /**
   * @notice Emitted when a user makes a claim
   * @param user The address of the user who made the claim
   * @param rate The flow rate of the claim
   */
  event Claimed(address user, int96 rate);

  /**
   * @notice Emitted when a user's claim is closed
   * @param user The address of the user whose claim was closed
   * @param token The address of the token that was claimed
   */
  event StreamClosed(
      address user,
      address token
  );

  /**
   * @dev Constructor to initialize the contract
   * @param _host Superfluid host for calling agreements
   * @param _cfa Constant Flow Agreement contract
   * @param _claimToken The ISuperToken being claimed
   * @param _rate The flow rate of the claim
   * @param _duration The duration of the claim
   * @param _deadline The deadline for the claim to be made
   */
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

  /**
   * @dev Allows the contract owner to add a user to be eligible for a claim
   * @param recipient The address of the user to be added
   * @notice Emits NewUserClaim(recipient) when a user is added
   */
  function addUserClaim(address recipient) public onlyOwner {
    userClaims[recipient] = true;
    emit NewUserClaim(recipient);
  }

  /**
   * @dev Allows a user to make a claim
   * @notice Anyone can claim as long as they meet the conditions:
   * * The deadline has not passed.
   * * They have not already claimed.
   * * They have a user claim
   * @param msg.sender The address of the user making the claim
   */
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

  /**
   * @notice Closes the next claim in the queue
   * @dev Streams are opened sequentially, so they can be closed sequentially if 
          everyone in the claim is claiming the same amount. Only one claim can run at one time
   */
  function closeNext() public {
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

  /**
   * @dev Returns the flow information for a specific recipient
   * @param recipient The address of the recipient to get the flow information
   * @return timestamp The timestamp of when the flow started
   * @return flowRate The flow rate of the claim
   * @return deposit The deposit for the claim
   * @return owedDeposit The owed deposit for the claim
   */
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