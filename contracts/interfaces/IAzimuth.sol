// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAzimuth {
    function isOwner(uint32, address) external returns (bool);
    function isActive(uint32) external returns (bool);
    function isSpawnProxy(uint32, address) external returns (bool);
    function isTransferProxy(uint32, address) external returns (bool);
    function hasBeenLinked(uint32) external returns (bool);
    function getPrefix(uint32) external returns (uint16);
    function owner() external returns (address);
}