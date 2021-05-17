// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAzimuth.sol";
import "./interfaces/IEcliptic.sol";
import "./StarToken.sol";

contract Treasury is Context, Ownable() {
    // MODEL

    //  assets: stars currently held in this pool
    //
    uint16[] public assets;

    //  azimuth: points state data store
    //
    IAzimuth public azimuth;

    // deploy a new token contract with no balance and no operators
    StarToken public startoken = new StarToken(0, new address[](0));

    uint256 constant public oneStar = 65536e18;

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

    function deposit(uint16 _star)
        public
    {
//        require(mintable(_star));
        IEcliptic ecliptic = IEcliptic(azimuth.owner());

        // case (1)
        if (
            azimuth.isOwner(_star, msg.sender) &&
            !azimuth.hasBeenLinked(_star) &&
            azimuth.isTransferProxy(_star, address(this))
        ) {
            // transfer ownership of the _star to :this contract
            ecliptic.transferPoint(_star, address(this), true);
        }
        // case (2)
        else if (
            azimuth.isOwner(azimuth.getPrefix(_star), msg.sender) &&
            !azimuth.isActive(_star) &&
            azimuth.isSpawnProxy(azimuth.getPrefix(_star), address(this))
        ) {
            // spawn the _star directly to :this contract
            ecliptic.spawn(_star, address(this));
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
//        require(token.owner() == address(this), "Wrong owner"); // necessary?
        token.mint(_msgSender(), oneStar);
        emit Deposit(azimuth.getPrefix(_star), _star, _msgSender());
    }

    function redeem(uint32 _star) public {
        emit Redeem(azimuth.getPrefix(_star), _star, _msgSender());
    }
}