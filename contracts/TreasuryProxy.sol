// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./interface/IAzimuth.sol";

contract TreasuryProxy is ERC1967Proxy {
    IAzimuth immutable azimuth;

    constructor(IAzimuth _azimuth, address _impl) ERC1967Proxy(_impl, "") {
        azimuth = _azimuth;
    }

    modifier ifEcliptic() {
        require(msg.sender == azimuth.owner(), "Only Ecliptic");
        _;
    }

    function upgradeTo(address _impl) external ifEcliptic returns (bool) {
        _upgradeTo(_impl);
        return true;
    }
}
