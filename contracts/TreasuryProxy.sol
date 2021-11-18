// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./interface/IAzimuth.sol";

contract TreasuryProxy is ERC1967Proxy {
    IAzimuth immutable azimuth;

    bytes32 constant frozenSlot = bytes32(uint256(keccak256("TreasuryProxy.frozen")) - 1);

    constructor(IAzimuth _azimuth, address _impl) ERC1967Proxy(_impl, "") {
        azimuth = _azimuth;
    }

    modifier ifEcliptic() {
        require(msg.sender == azimuth.owner(), "Only Ecliptic");
        _;
    }

    function frozen() internal pure returns (StorageSlot.BooleanSlot storage) {
        return StorageSlot.getBooleanSlot(frozenSlot);
    }

    function upgradeTo(address _impl) external ifEcliptic returns (bool) {
        require(!frozen().value, "upgradeTo: contract frozen");
        _upgradeTo(_impl);
        return true;
    }
    
    function freeze() external ifEcliptic returns (bool) {
        frozen().value = true;
        return true;
    }
}
