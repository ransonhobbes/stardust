// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "./interface/IAzimuth.sol";
import "./interface/IEcliptic.sol";
import "./StarToken.sol";

//  Treasury: star wrapper
//
//    This contract implements an extremely simple wrapper for stars.
//    It allows owners of Azimuth star points to deposit them and mint new WSTR (wrapped star) tokens,
//    and in turn to redeem WSTR tokens for Azimuth stars.

contract Treasury is Context {
    // MODEL

    //  assets: stars currently held in this pool
    //
    uint16[] public assets;

    //  azimuth: points state data store
    //
    IAzimuth public azimuth;

    // deploy a new token contract with no balance
    StarToken public startoken = new StarToken(0);

    uint256 constant public ONE_STAR = 1e18;

    // EVENTS

    event Deposit(
        uint32 indexed prefix,
        uint32 indexed star,
        address sender
    );

    event Redeem(
        uint32 indexed prefix,
        uint32 indexed star,
        address sender
    );

    // IMPLEMENTATION

    //  constructor(): configure the points data store and token contract address
    //
    constructor(IAzimuth _azimuth)
    {
        azimuth = _azimuth;
    }

    //  getAllAssets(): return array of assets held by this contract
    //
    //    Note: only useful for clients, as Solidity does not currently
    //    support returning dynamic arrays.
    //
    function getAllAssets()
        view
        external
        returns (uint16[] memory allAssets)
    {
        return assets;
    }

    //  getAssetCount(): returns the number of assets held by this contract
    //
    function getAssetCount()
        view
        external
        returns (uint256 count)
    {
        return assets.length;
    }

    //  deposit(star): deposit a star you own, receive a newly-minted wrapped star token in exchange
    //
    function deposit(uint16 _star) external
    {
        require(azimuth.getPointSize(_star) == IAzimuth.Size.Star);
        IEcliptic ecliptic = IEcliptic(azimuth.owner());

        // case (1):
        // the caller can transfer the star, and the star has spawned no planets (and, implicitly, the treasury is
        // transfer proxy for the star)
        // note: we check canTransfer() here, rather than isOwner(), because the owner can authorize a third-party
        // operator to transfer.
        if (
            azimuth.canTransfer(_star, _msgSender()) &&
            azimuth.getSpawnCount(_star) == 0
        ) {
            // transfer ownership of the _star to :this contract
            ecliptic.transferPoint(_star, address(this), true);
        }

        // case (2):
        // the caller owns the galaxy (and, implicitly, the treasury is spawn proxy for the galaxy, and the
        // star is inactive)
        // note: we check canSpawnAs() here but, unlike transfer (see case 1), spawning does not allow an operator,
        // so in practice only the owner can call this.
        else if (azimuth.canSpawnAs(azimuth.getPrefix(_star), _msgSender())) {
            // spawn the _star directly to :this contract
            ecliptic.spawn(_star, address(this));
        }
        else {
            revert();
        }

        //  update state to include the deposited star
        //
        assets.push(_star);

        //  mint a star token and grant it to the :msg.sender
        //
        startoken.mint(_msgSender(), ONE_STAR);
        emit Deposit(azimuth.getPrefix(_star), _star, _msgSender());
    }

    //  redeem(): burn one star token, receive ownership of the most recently deposited star in exchange
    //
    function redeem() external {
        // must have sufficient balance
        require(startoken.balanceOf(_msgSender()) >= ONE_STAR);

        // there must be at least one star in the asset list
        require(assets.length > 0);

        // remove the star to be redeemed
        uint16 _star = assets[assets.length-1];
        assets.pop();

        // burn the tokens
        startoken.ownerBurn(_msgSender(), ONE_STAR);

        // transfer ownership
        // note: Treasury should be the owner of the point and able to transfer it. this check happens inside
        // transferPoint().
        IEcliptic ecliptic = IEcliptic(azimuth.owner());
        ecliptic.transferPoint(_star, _msgSender(), true);

        emit Redeem(azimuth.getPrefix(_star), _star, _msgSender());
    }
}
