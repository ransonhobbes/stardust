// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEcliptic {
    function spawn(uint32, address) external;
    function transferPoint(uint32, address, bool) external;
}
