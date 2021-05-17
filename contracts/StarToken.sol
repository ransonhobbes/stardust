// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract StarToken is Context, Ownable, ERC777 {
    constructor(
        uint256 initialSupply,
        address[] memory defaultOperators
    )
        public
        Ownable()
        ERC777("StarToken", "STAR", defaultOperators)
    {
        _mint(_msgSender(), _msgSender(), initialSupply, "", "");
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}