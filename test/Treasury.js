const {expect} = require("chai");
const {ethers} = require("hardhat");
const {singletons, constants} = require("@openzeppelin/test-helpers");

const
    pointGalaxyZero  = 0x0,
    pointStarZero    = 0x00000100, // 256
    pointStarOne     = 0x00000101,
    pointFirstPlanet = 0x00010100; // 65792

describe("Treasury", function() {
    before(async function () {
        const [registryFunder, creator, operator] = await ethers.getSigners();
        this.creator = creator;

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
        const Treasury = await ethers.getContractFactory("Treasury", creator);
        this.StarToken = await ethers.getContractFactory("StarToken");
        await singletons.ERC1820Registry(registryFunder.address);
        this.treasury = await Treasury.deploy(this.azimuth.address);

        // register some points for testing
        expect(await this.azimuth.isOwner(pointGalaxyZero, constants.ZERO_ADDRESS)).to.be.true;
        let response = await this.ecliptic.createGalaxy(pointGalaxyZero, this.creator.address);
        await expect(response).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, pointGalaxyZero
        );
        expect(await this.azimuth.isOwner(pointGalaxyZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.isActive(pointGalaxyZero)).to.be.true;
        expect(await this.azimuth.getSpawnCount(pointGalaxyZero)).to.equal(0);

        response = await this.ecliptic.configureKeys(
            pointGalaxyZero,
            // these need to be bytes32
            web3.utils.padLeft(web3.utils.numberToHex(1), 64),
            web3.utils.padLeft(web3.utils.numberToHex(2), 64),
            1,
            false);
        await expect(response).to.emit(this.azimuth, "ChangedKeys");

        expect(await this.azimuth.isOwner(pointStarZero, constants.ZERO_ADDRESS)).to.be.true;
        const prefix = await this.azimuth.getPrefix(pointStarZero);
        expect((await this.azimuth.getPointSize(prefix)) + 1).to.equal(await this.azimuth.getPointSize(pointStarZero));
        expect(await this.azimuth.hasBeenLinked(prefix)).to.be.true;
        expect(await this.azimuth.canSpawnAs(prefix, this.creator.address)).to.be.true;
        response = await this.ecliptic.spawn(pointStarZero, this.creator.address);
        await expect(response).to.emit(this.ecliptic, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.creator.address, pointStarZero
        );
        // response = await this.azimuth.setSpawnProxy(pointGalaxyZero, this.treasury.address);
        // await expect(response).to.emit(this.azimuth, "ChangedSpawnProxy").withArgs(
        //     pointGalaxyZero, this.treasury.address
        // );
        expect(await this.azimuth.getTransferProxy(pointStarZero)).to.equal(constants.ZERO_ADDRESS);
        expect(this.treasury.address).not.to.equal(constants.ZERO_ADDRESS);
        response = await this.azimuth.setTransferProxy(pointStarZero, this.treasury.address);
        // await expect(response).to.emit(this.azimuth, "ChangedTransferProxy").withArgs(
        //     pointStarZero, this.treasury.address
        // );

        // case (1): star already spawned, transfer ownership
        expect(await this.azimuth.isOwner(pointStarZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.hasBeenLinked(pointStarZero)).to.be.false;
        expect(await this.azimuth.isTransferProxy(pointStarZero, this.treasury.address)).to.be.true;

        // case (2): star not yet spawned, spawn directly into treasury
        expect(await this.azimuth.isOwner(pointGalaxyZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.isActive(pointStarZero)).to.be.false;
        expect(await this.azimuth.isSpawnProxy(pointGalaxyZero, this.treasury.address)).to.be.true;
    });

    it("has no assets when deployed", async function() {
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });

    it("knows how to find azimuth", async function() {
        expect(await this.treasury.azimuth()).to.equal(this.azimuth.address);
    });

    it("deploys a token contract with no initial supply", async function() {
        const tokenAddress = await this.treasury.startoken();
        const token = this.StarToken.attach(tokenAddress);
        expect(await token.name()).to.equal("StarToken");
        expect(await token.symbol()).to.equal("STAR");
        expect(await token.totalSupply()).to.equal(0);
    });

    it("allows deposit from asset owner", async function() {
        let res = await this.treasury.deposit(pointStarZero);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            pointGalaxyZero, pointStarZero, this.creator.address
        );
    });

    it("doesn't allow deposit from non-owner", async function() {

    });

    it("allows redeem from token holder", async function() {

    });

    it("doesn't allow redeem from non-holder", async function () {

    });
});
