// SPDX-License-Identifier: Business Source License
pragma solidity ^0.8.9;

import {ISuperfluid, ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {CFAv1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract ConditionalWaterDrop is Ownable {
    // ConditionalWaterDrop is a single airdrop using a condtional
    // this contract's condition:
    // - has streamed at least 5000 RIC >> rexSHIRT
    // - has streamed for at least 1 month RIC >> rexSHIRT

    using CFAv1Library for CFAv1Library.InitData;

    event Claimed(address user, int96 rate);
    event StreamClosed(
        address user,
        address token,
        uint256 duration,
        uint256 timestamp,
        int96 flowRate,
        uint256 deposit,
        uint256 owedDeposit
    );

    struct Claim {
        ISuperToken token;
        int96 rate;
        uint duration;
        uint deadline;
    }

    // Claims tracking Variables
    Claim public waterDrop;
    uint public claimCount = 0;
    address[] public closureQueue;
    uint public queueIndex;
    mapping(address => bool) public hasClaimed;

    // Sueprfluid Variables
    CFAv1Library.InitData internal cfaV1;
    ISuperfluid internal host; // Superfluid host contract
    IConstantFlowAgreementV1 internal cfa; // The stored constant flow agreement class address

    // Variables for Conditional
    ISuperToken public reqTokenAddress; // Token thats being streamed into the conditional receiver
    uint public reqAmount; // The amount that has to be streamed as part of the conditional
    uint public reqDuration; // The duration that a stream has to be open as part of the conditional
    address public recipient; // The receiver of the stream for the conditional

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

    function closeNext() public {
        // Streams are opened sequentially, so they can be closed sequentially iff
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

    // Convenience method for getting flow information
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
