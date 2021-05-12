// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "azimuth-solidity/contracts/Azimuth.sol";
import "azimuth-solidity/contracts/Ecliptic.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "StarToken.sol";
import "./IStarToken.sol";

contract Treasury is Context {
    // MODEL

    //  assets: stars currently held in this pool
    //
    uint16[] public assets;

    //  azimuth: points state data store
    //
    Azimuth public azimuth;
    StarToken public startoken;
    uint256 constant public oneStar = 65536e18;

    //  assets: stars currently held in this pool
    //
    uint16[] public assets;

    //  assetIndexes: per star, (index + 1) in :assets
    //
    //    We delete assets by moving the last entry in the array to the
    //    newly emptied slot, which is (n - 1) where n is the value of
    //    assetIndexes[star].
    //
    mapping(uint16 => uint256) public assetIndexes;

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

    //  constructor(): configure the points data store
    //
    constructor(Azimuth _azimuth, StarToken _startoken)
        public
    {
        azimuth = _azimuth;
        startoken = _startoken;
    }

    //  getAllAssets(): return array of assets held by this contract
    //
    //    Note: only useful for clients, as Solidity does not currently
    //    support returning dynamic arrays.
    //
    function getAllAssets()
        view
        external
        returns (uint16[] allAssets)
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

//    //  mintable(): returns true if the _star can be minted
//    function mintable(uint32 _star)
//        public
//        view
//        returns (bool result)
//    {
//        return ( //  star must not have an owner yet
//        //
//        azimuth.isOwner(_star, 0x0) &&
//        //
//        //  this contract must be allowed to spawn for the prefix
//        //
//        azimuth.isSpawnProxy(prefix, this) &&
//        //
//        //  prefix must be linked
//        //
//        azimuth.hasBeenLinked(prefix) );
//    }

    function deposit(uint32 _star)
        public
    {
//        require(mintable(_star));
        Ecliptic ecliptic = Ecliptic(azimuth.owner());

        // case (1)
        if (
            azimuth.isOwner(_star, msg.sender) &&
            !azimuth.hasBeenLinked(_star) &&
            azimuth.isTransferProxy(_star, this)
        ) {
            // transfer ownership of the _star to :this contract
            ecliptic.transferPoint(_star, this, true);
        }
        // case (2)
        else if (
            azimuth.isOwner(azimuth.getPrefix(_star), msg.sender) &&
            !azimuth.isActive(_star) &&
            azimuth.isSpawnProxy(azimuth.getPrefix(_star), this)
        ) {
            // spawn the _star directly to :this contract
            ecliptic.spawn(_star, this);
        }
        else {
            revert();
        }

        //  update state to include the deposited star
        //
        assets.push(_star);
        assetIndexes[_star] = assets.length;

        //  mint star tokens and grant them to the :msg.sender
        //
        StarToken token = StarToken(startoken);
        require(token.owner() == address(this), "Wrong owner"); // necessary?
        token.mint(_msgSender(), oneStar);
        emit Deposit(azimuth.getPrefix(_star), _star, _msgSender());
    }

    function redeem() public {
        emit Redeem(azimuth.getPrefix(_star), _star, _msgSender());
    }
}