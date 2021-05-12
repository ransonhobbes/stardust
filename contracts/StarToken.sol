// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StarToken is Ownable, ERC777 {
    constructor(
        uint256 initialSupply,
        address[] memory defaultOperators,
        address _owner
    )
        public
        Ownable()
        ERC777("StarToken", "STAR", defaultOperators)
    {
        _mint(msg.sender, msg.sender, initialSupply, "", "");
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}