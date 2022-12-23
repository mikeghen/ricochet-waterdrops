// SPDX-License-Identifier: Business Source License
pragma solidity ^0.8.0;

import "./WaterDrops.sol";

abstract contract WaterDropsFactory is WaterDrops {
   address public waterDropsAddress;

    constructor(address _waterDropsAddress){
        waterDropsAddress = _waterDropsAddress;
        owner = msg.sender;
    }

    function forward() external returns (bytes memory){
        (bool success, bytes memory data) = waterDropsAddress.delegatecall(msg.data);
        require(success);
        return data;
    }
}