// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

//  StarToken: ERC777-compatible fungible wrapped star token
//
//    This contract implements a simple ERC777-compatible fungible token. It's deployed
//    and owned by the Treasury. The Treasury mints and burns these tokens when it
//    processes deposits and withdrawals.

contract StarToken is Context, Ownable, ERC777 {
    constructor(
        uint256 initialSupply,
        address[] memory defaultOperators
    )
        Ownable()
        ERC777("WrappedStar", "WSTR", defaultOperators)
    {
        _mint(_msgSender(), initialSupply, "", "");
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount, "", "");
    }

    function ownerBurn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount, "", "");
    }
}
