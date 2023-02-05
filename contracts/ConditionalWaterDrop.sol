// SPDX-License-Identifier: Business Source License
pragma solidity ^0.8.9;

import {ISuperfluid, ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {CFAv1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

/**
 * @title Conditional WaterDrop: Contract for Managing Token Claims with a Condition
 * @author Ricochet Exchange
 * @notice Allows users to make claims on a specific token at a rate for a set duration, 
           with automatic claim closure, based on a pre-determined condition
 * @dev Uses Superfluid and Constant Flow Agreement libraries to manage claims and check 
        for the conditional requirement
 */
contract ConditionalWaterDrop is Ownable {
    // ConditionalWaterDrop is a single airdrop using a condtional
    // this contract's condition:
    // - has streamed at least 5000 RIC >> rexSHIRT
    // - has streamed for at least 1 month RIC >> rexSHIRT

    // Use the CFAv1Library for the CFAv1Library.InitData struct
    using CFAv1Library for CFAv1Library.InitData;

    /**
     * @notice Emitted when a user makes a claim on the token
     * @param user The user who made the claim
     * @param rate The rate at which the claim is being made
     */
    event Claimed(address user, int96 rate);

    /**
     * @notice Emitted when a stream is closed by the contract
     * @param user The user who closed the stream
     * @param token The token being streamed
     * @param duration The duration of the stream
     * @param timestamp The timestamp of the stream
     * @param flowRate The flow rate of the stream
     * @param deposit The deposit of the stream
     * @param owedDeposit The owed deposit of the stream
     */
    event StreamClosed(
        address user,
        address token,
        uint256 duration,
        uint256 timestamp,
        int96 flowRate,
        uint256 deposit,
        uint256 owedDeposit
    );

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

    // Variables for Conditional
    /**
     * @notice Token that is being streamed into the conditional receiver
     */
    ISuperToken public reqTokenAddress;

    /**
     * @notice The amount that has to be streamed as part of the conditional
     */
    uint public reqAmount; 

    /**
     * @notice The duration that a stream has to be open as part of the conditional
     */
    uint public reqDuration;

    /**
     * @notice The receiver of the stream for the conditional
     */
    address public recipient;

    /**
     * @dev Constructor to initialize the contract
     * @param _host Superfluid host for calling agreements
     * @param _cfa Constant Flow Agreement contract
     * @param _claimToken The ISuperToken being claimed
     * @param _rate The flow rate of the claim
     * @param _duration The duration of the claim
     * @param _deadline The deadline for the claim to be made
     */
    constructor(
        ISuperfluid _host,
        IConstantFlowAgreementV1 _cfa,
        ISuperToken _claimToken,
        int96 _rate,
        uint _duration,
        uint _deadline
    ) {
        host = _host;
        cfa = _cfa;
        // initialize InitData struct, and set equal to cfaV1
        cfaV1 = CFAv1Library.InitData(host, cfa);
        // Save the claim info
        waterDrop = Claim(_claimToken, _rate, _duration, _deadline);
    }

    /**
     * @dev Initializes the contract with the required token, amount, duration and recipient for the conditional
     * @param _reqTokenAddress ISuperToken address for the conditional requirement
     * @param _reqAmount Amount required to be streamed for the conditional requirement
     * @param _reqDuration Duration required for the stream to be open for the conditional requirement
     * @param _recipient Address of the recipient for the conditional requirement
     */
    function initialize(
        ISuperToken _reqTokenAddress,
        uint _reqAmount,
        uint _reqDuration,
        address _recipient
    ) public {
        require(reqAmount == 0, "already initialized");
        reqTokenAddress = _reqTokenAddress;
        reqAmount = _reqAmount;
        reqDuration = _reqDuration;
        recipient = _recipient;
    }

    /**
     * @notice Allows user to make a claim on a specific token at a set rate 
               for a set duration, with automatic claim closure
     * @dev Checks if user meets the conditions for making a claim and marks the claim as made, 
            adds the user to the end of the closure queue and creates a flow for the user.
     * @dev Uses the IConstantFlowAgreementV1 library to get the flow information of the user
     * @dev Emits the Claimed event with the user address and the rate of the claim
     */
    function claim() public {
        // Anyone can claim as long as they meet the conditions below
        require(hasClaimed[msg.sender] == false, "already claimed");
        (
            uint256 timestamp,
            int96 flowRate,
            uint256 deposit,
            uint256 owedDeposit
        ) = cfa.getFlow(reqTokenAddress, msg.sender, recipient);
        // Check msg.sender meets the condition
        require(timestamp > 0, "ineligible: no stream");
        uint duration = block.timestamp - timestamp;
        // - has streamed for at least 1 month RIC >> rexSHIRT
        require(duration >= reqDuration, "ineligible: stream longer");
        // - has streamed at least 5000 RIC >> rexSHIRT
        require(
            duration * uint(int(flowRate)) >= reqAmount,
            "ineligible: stream more"
        );

        // Mark as claimed and add them to the end of the closure queue
        hasClaimed[msg.sender] = true;
        closureQueue.push(msg.sender);
        cfaV1.createFlow(msg.sender, waterDrop.token, waterDrop.rate);

        emit Claimed(msg.sender, waterDrop.rate);
    }

    /**
     * @notice Closes the next stream in the queue, if it has passed its duration
     * @dev The streams are closed sequentially, if all the claims are of the same rate and duration
     * @dev Uses getFlow method from the Constant Flow Agreement library to retrieve the stream's information
     * @dev Uses deleteFlow method from the Constant Flow Agreement library to close the stream
     * @dev Emits the StreamClosed event after the stream is closed
     */
    function closeNext() public {
        // Streams are opened sequentially, so they can be closed sequentially if
        // everyone in the claim is claiming the same rate and duration.

        address toClose = closureQueue[queueIndex];

        (
            uint256 timestamp,
            int96 flowRate,
            uint256 deposit,
            uint256 owedDeposit
        ) = cfa.getFlow(waterDrop.token, address(this), toClose);

        // Two ways to check:
        // 1. When did the stream start? Has duration amount of time passed?

        // How much time has passed?
        uint256 duration = block.timestamp - timestamp;

        // Is that larger than the claim's duration?
        if (duration > waterDrop.duration) {
            // Streams over, close stram to toClose
            cfaV1.deleteFlow(address(this), toClose, waterDrop.token);
            // Increment queue index and gelato will check on the next to close
            queueIndex += 1;

            // Emit event after Stream is closed
            emit StreamClosed(
                toClose,
                address(waterDrop.token),
                waterDrop.duration,
                timestamp,
                flowRate,
                deposit,
                owedDeposit
            );
        } else {
            // If we don't need to close, revert with message for Gelato
            revert("not ready to close");
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
    function getFlow(
        address recipient
    )
        public
        view
        returns (
            uint256 timestamp,
            int96 flowRate,
            uint256 deposit,
            uint256 owedDeposit
        )
    {
        (timestamp, flowRate, deposit, owedDeposit) = cfa.getFlow(
            waterDrop.token,
            address(this),
            recipient
        );
    }
}