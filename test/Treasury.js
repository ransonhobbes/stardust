const {expect} = require("chai");
const {ethers} = require("hardhat");
const {constants} = require("@openzeppelin/test-helpers");

const
    PointGalaxyZero  = 0x0,
    PointStarZero    = 0x00000100, // 256, first star of galaxy zero
    PointStarOne     = 0x00000200, // 512, second star of galaxy zero
    PointStarTwo     = 0x00000300, // 768, third star of galaxy zero
    PointStarThree   = 0x00000400, // 1024, fourth star of galaxy zero
    PointStarFour    = 0x00000500, // 1280, fifth star of galaxy zero
    PointPlanetZero  = 0x00010100; // 65792, first planet of first star of galaxy zero

describe("Treasury", function() {
    before(async function () {
        const [creator, operator, mallory] = await ethers.getSigners();
        this.creator = creator;
        this.operator = operator;
        this.mallory = mallory;

        // initialize Azimuth and Ecliptic for testing
        const Polls = await ethers.getContractFactory("PollsWrapper", creator);
        const Claims = await ethers.getContractFactory("ClaimsWrapper", creator);
        const Azimuth = await ethers.getContractFactory("AzimuthWrapper", creator);
        const Ecliptic = await ethers.getContractFactory("EclipticWrapper", creator);
        this.azimuth = await Azimuth.deploy();
        this.polls = await Polls.deploy(432000, 432000);
        this.claims = await Claims.deploy(this.azimuth.address);
        this.ecliptic = await Ecliptic.deploy(constants.ZERO_ADDRESS, this.azimuth.address, this.polls.address, this.claims.address);
        await this.azimuth.transferOwnership(this.ecliptic.address);
        await this.polls.transferOwnership(this.ecliptic.address);

        // now deploy our contracts
        this.Treasury = await ethers.getContractFactory("Treasury", creator);
        this.StarToken = await ethers.getContractFactory("StarToken", creator);
        const TreasuryProxy = await ethers.getContractFactory("TreasuryProxy", creator);
        this.token = await this.StarToken.deploy();
        const treasuryImpl = await this.Treasury.deploy(this.azimuth.address, this.token.address);
        this.treasuryProxy = await TreasuryProxy.deploy(this.azimuth.address, treasuryImpl.address)
        this.treasury = this.Treasury.attach(this.treasuryProxy.address)
        this.token.transferOwnership(this.treasury.address)
        this.ONE_STAR = await this.treasury.ONE_STAR();

        // register some points for testing
        expect(await this.azimuth.isOwner(PointGalaxyZero, constants.ZERO_ADDRESS)).to.be.true;
        let response = await this.ecliptic.createGalaxy(PointGalaxyZero, this.creator.address);
        await expect(response).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, PointGalaxyZero
        );
        expect(await this.azimuth.isOwner(PointGalaxyZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.isActive(PointGalaxyZero)).to.be.true;
        expect(await this.azimuth.getSpawnCount(PointGalaxyZero)).to.equal(0);

        response = await this.ecliptic.configureKeys(
            PointGalaxyZero,
            // these need to be bytes32
            web3.utils.padLeft(web3.utils.numberToHex(1), 64),
            web3.utils.padLeft(web3.utils.numberToHex(2), 64),
            1,
            false);
        await expect(response).to.emit(this.azimuth, "ChangedKeys");

        expect(await this.azimuth.isOwner(PointStarZero, constants.ZERO_ADDRESS)).to.be.true;
        const prefix = await this.azimuth.getPrefix(PointStarZero);
        expect((await this.azimuth.getPointSize(prefix)) + 1).to.equal(await this.azimuth.getPointSize(PointStarZero));
        expect(await this.azimuth.hasBeenLinked(prefix)).to.be.true;
        expect(await this.azimuth.getSpawnCount(prefix)).to.equal(0);
        expect(await this.azimuth.canSpawnAs(prefix, this.creator.address)).to.be.true;
        response = await this.ecliptic.spawn(PointStarZero, this.creator.address);
        await expect(response).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, PointStarZero
        );
        expect(await this.azimuth.getSpawnCount(prefix)).to.equal(1);
        response = await this.ecliptic.setSpawnProxy(PointGalaxyZero, this.treasury.address);
        await expect(response).to.emit(this.azimuth, "ChangedSpawnProxy").withArgs(
            PointGalaxyZero, this.treasury.address
        );
        expect(await this.azimuth.getTransferProxy(PointStarZero)).to.equal(constants.ZERO_ADDRESS);
        expect(this.treasury.address).not.to.equal(constants.ZERO_ADDRESS);
        response = await this.ecliptic.setTransferProxy(PointStarZero, this.treasury.address);
        await expect(response).to.emit(this.ecliptic, "Approval").withArgs(
            this.creator.address, this.treasury.address, PointStarZero
        );
        await expect(response).to.emit(this.azimuth, "ChangedTransferProxy").withArgs(
            PointStarZero, this.treasury.address
        );

        // case (1): star already spawned, transfer ownership
        expect(await this.azimuth.isOwner(PointStarZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.hasBeenLinked(PointStarZero)).to.be.false;
        expect(await this.azimuth.getSpawnCount(PointStarZero)).to.equal(0);
        expect(await this.azimuth.isTransferProxy(PointStarZero, this.treasury.address)).to.be.true;

        // case (2): star not yet spawned, spawn directly into treasury
        expect(await this.azimuth.isOwner(PointGalaxyZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.isActive(PointStarOne)).to.be.false;
        expect(await this.azimuth.isSpawnProxy(PointGalaxyZero, this.treasury.address)).to.be.true;
    });

    it("can be upgraded", async function () {
        const treasuryImpl = await this.Treasury.deploy(this.azimuth.address, this.token.address);
        await this.ecliptic.upgradeTreasury(this.treasury.address, treasuryImpl.address);
    })

    it("cannot be upgraded by not Ecliptic", async function () {
        const treasuryImpl = await this.Treasury.deploy(this.azimuth.address, this.token.address);
        await expect(this.treasuryProxy.upgradeTo(treasuryImpl.address)).revertedWith("TreasuryProxy: Only Ecliptic");
    })

    it("cannot be frozen by not Ecliptic", async function () {
        await expect(this.treasuryProxy.freeze()).revertedWith("TreasuryProxy: Only Ecliptic");
    })

    it("can be frozen", async function() {
        await this.ecliptic.freezeTreasury(this.treasury.address)
    })

    it("cannot be upgraded after freezing", async function() {
        const treasuryImpl = await this.Treasury.deploy(this.azimuth.address, this.token.address);
        await expect(this.ecliptic.upgradeTreasury(this.treasury.address, treasuryImpl.address))
            .revertedWith("TreasuryProxy: Contract frozen");
    })

    it("has no assets when deployed", async function() {
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });

    it("knows how to find azimuth", async function() {
        expect(await this.treasury.azimuth()).to.equal(this.azimuth.address);
    });

    it("deploys a token contract with no initial supply", async function() {
        expect(await this.token.name()).to.equal("WrappedStar");
        expect(await this.token.symbol()).to.equal("WSTR");
        expect(await this.token.totalSupply()).to.equal(0);
    });

    it("allows deposit of star from owner", async function() {
        // case 1
        let res = await this.treasury.deposit(PointStarZero);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, this.ONE_STAR
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.ONE_STAR);
        expect(await this.azimuth.isOwner(PointStarZero, this.treasury.address)).to.be.true;
        expect(await this.treasury.getAssetCount()).to.equal(1);

        // case 2
        res = await this.treasury.deposit(PointStarOne);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarOne, this.creator.address
        );
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, this.ONE_STAR
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.ONE_STAR.mul(2));
        expect(await this.azimuth.isOwner(PointStarOne, this.treasury.address)).to.be.true;
        expect(await this.treasury.getAssetCount()).to.equal(2);
    });

    it("lists assets in correct order", async function() {
        expect(await this.treasury.getAssetCount()).to.equal(2);
        const assets = await this.treasury.getAllAssets();
        expect(assets).to.have.lengthOf(2);

        // we expect these to be in the order we deposited them
        expect(assets[0]).to.equal(PointStarZero);
        expect(assets[1]).to.equal(PointStarOne);
    });

    it("doesn't allow deposit of non-stars", async function() {
        await expect(this.treasury.deposit(PointGalaxyZero)).to.be.reverted;
        await expect(this.treasury.deposit(PointPlanetZero)).to.be.reverted;
        expect(await this.treasury.getAssetCount()).to.equal(2);
    });

    it("doesn't allow deposit from non-owner", async function() {
        // mallory is not the owner
        await expect(this.treasury.connect(this.mallory).deposit(PointStarZero)).to.be.reverted;
        await expect(this.treasury.connect(this.mallory).deposit(PointStarOne)).to.be.reverted;
        expect(await this.treasury.getAssetCount()).to.equal(2);
    });

    it("allows redeem from token holder", async function() {
        // stars come out in FILO order, i.e., there is a stack

        // first, perform a static call to check the return value
        expect(await this.treasury.callStatic.redeem()).to.equal(PointStarOne);

        // now actually redeem it
        let res = await this.treasury.redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarOne, this.creator.address
        );
        expect(await this.azimuth.getPrefix(PointStarOne)).to.equal(PointGalaxyZero);

        expect(await this.treasury.callStatic.redeem()).to.equal(PointStarZero);
        res = await this.treasury.redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });

    it("allows deposit-send-redeem pattern", async function() {
        expect(await this.azimuth.isOwner(PointStarZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.getTransferProxy(PointStarZero)).to.equal(constants.ZERO_ADDRESS);
        expect(await this.treasury.getAssetCount()).to.equal(0);
        await this.ecliptic.setTransferProxy(PointStarZero, this.treasury.address);
        let res = await this.treasury.deposit(PointStarZero);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, this.ONE_STAR
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.ONE_STAR);
        expect(await this.treasury.getAssetCount()).to.equal(1);

        // transfer the token
        res = await this.token.transfer(this.operator.address, this.ONE_STAR);
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            this.creator.address, this.operator.address, this.ONE_STAR
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(0);
        expect(await this.token.balanceOf(this.operator.address)).to.equal(this.ONE_STAR);

        // now redeem on the other side
        res = await this.treasury.connect(this.operator).redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarZero, this.operator.address
        );
        expect(await this.token.balanceOf(this.operator.address)).to.equal(0);
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });

    it("allows deposit and redeem from authorized operator", async function() {
        // owner authorizes mallory as operator
        expect(await this.azimuth.isOwner(PointStarOne, this.creator.address)).to.be.true;
        expect(await this.treasury.getAssetCount()).to.equal(0);
        let res = await this.ecliptic.setApprovalForAll(this.mallory.address, true);
        await expect(res).to.emit(this.ecliptic, "ApprovalForAll").withArgs(
            this.creator.address, this.mallory.address, true
        );

        // make sure mallory has the transfer rights, as operator
        expect(await this.azimuth.canTransfer(PointStarOne, this.mallory.address)).to.be.true;

        // mallory sets the transfer proxy
        res = await this.ecliptic.connect(this.mallory).setTransferProxy(PointStarOne, this.treasury.address);
        await expect(res).to.emit(this.ecliptic, "Approval").withArgs(
            // note: approval is on behalf of the owner
            this.creator.address, this.treasury.address, PointStarOne
        );
        await expect(res).to.emit(this.azimuth, "ChangedTransferProxy").withArgs(
            PointStarOne, this.treasury.address
        );
        expect(await this.azimuth.isTransferProxy(PointStarOne, this.treasury.address)).to.be.true;

        // test case 1: mallory deposits star
        res = await this.treasury.connect(this.mallory).deposit(PointStarOne);
        expect(await this.treasury.getAssetCount()).to.equal(1);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarOne, this.mallory.address
        );

        // test case 2: mallory tries to spawn another unowned star under the same galaxy
        // this should fail since we do not allow operator spawn
        expect(await this.azimuth.getSpawnCount(PointStarThree)).to.equal(0);
        expect(await this.azimuth.isOwner(PointStarThree, constants.ZERO_ADDRESS)).to.be.true;
        expect(await this.azimuth.isActive(PointStarThree)).to.be.false;
        await expect(this.treasury.connect(this.mallory).deposit(PointStarThree)).to.be.reverted;

        // mallory redeems the star
        res = await this.treasury.connect(this.mallory).redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarOne, this.mallory.address
        );
        expect(await this.treasury.getAssetCount()).to.equal(0);
        expect(await this.azimuth.isOwner(PointStarOne, this.mallory.address)).to.be.true;
    });

    it("doesn't allow redeem from non-holder or when balance is too low", async function() {
        expect(await this.azimuth.isOwner(PointStarFour, constants.ZERO_ADDRESS)).to.be.true;
        expect(await this.azimuth.isActive(PointStarFour)).to.be.false;
        let res = await this.ecliptic.spawn(PointStarFour, this.creator.address);
        await expect(res).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, PointStarFour
        );
        expect(await this.azimuth.isOwner(PointStarFour, this.creator.address)).to.be.true;
        expect(await this.token.balanceOf(this.creator.address)).to.equal(0);
        expect(await this.azimuth.getTransferProxy(PointStarFour)).to.equal(constants.ZERO_ADDRESS);
        await this.ecliptic.setTransferProxy(PointStarFour, this.treasury.address);
        res = await this.treasury.deposit(PointStarFour);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarFour, this.creator.address
        );
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, this.ONE_STAR
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.ONE_STAR);

        // try redeeming from a non token holder
        await expect(this.treasury.connect(this.mallory).redeem()).to.be.reverted;

        // burn one token
        // ERC20 doesn't allow arbitrary burning or transfer to the zero address, so just send
        // the token somewhere else instead.
        res = await this.token.transfer(this.mallory.address, 1);
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            this.creator.address, this.mallory.address, 1
        );
        expect(await this.token.balanceOf(this.mallory.address)).to.equal(1);
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.ONE_STAR.sub(1));

        // now redeem should fail
        await expect(this.treasury.redeem()).to.be.reverted;
    });

    // it's important to prevent this to protect users who don't RTFM
    it("doesn't allow inbound safe transfer", async function() {
        expect(await this.azimuth.isOwner(PointStarTwo, constants.ZERO_ADDRESS)).to.be.true;
        expect(await this.azimuth.isActive(PointStarTwo)).to.be.false;
        let response = await this.ecliptic.spawn(PointStarTwo, this.creator.address);
        await expect(response).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, PointStarTwo
        );
        expect(await this.azimuth.isOwner(PointStarTwo, this.creator.address)).to.be.true;
        expect(await this.azimuth.canTransfer(PointStarTwo, this.creator.address)).to.be.true;
        expect(await this.azimuth.getTransferProxy(PointStarTwo)).to.equal(constants.ZERO_ADDRESS);

        // an inbound transfer of a star should fail if safe transfer is used
        // (use the full method signature to disambiguate)
        await expect(this.ecliptic["safeTransferFrom(address,address,uint256)"](this.creator.address, this.treasury.address, PointStarTwo)).to.be.reverted;

        // however, we cannot prevent an inbound transfer that's unsafe
        await expect(this.ecliptic.transferFrom(this.creator.address, this.treasury.address, PointStarTwo)).not.to.be.reverted;
    });
});
