const {expect} = require("chai");
const {ethers} = require("hardhat");
const {singletons, constants} = require("@openzeppelin/test-helpers");

const
    PointGalaxyZero  = 0x0,
    PointStarZero    = 0x00000100, // 256, first star of galaxy zero
    PointStarOne     = 0x00000200, // 512, second star of galaxy zero
    PointPlanetZero  = 0x00010100; // 65792, first planet of first star of galaxy zero

describe("Treasury", function() {
    before(async function () {
        const [registryFunder, creator, operator] = await ethers.getSigners();
        console.log(registryFunder.address, creator.address, operator.address);
        this.registryFunder = registryFunder;
        this.creator = creator;
        this.operator = operator;

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
        this.StarToken = await ethers.getContractFactory("StarToken", creator);
        await singletons.ERC1820Registry(creator.address);
        this.treasury = await Treasury.deploy(this.azimuth.address);
        const tokenAddress = await this.treasury.startoken();
        this.token = this.StarToken.attach(tokenAddress);
        this.oneStar = await this.treasury.oneStar();

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

    it("has no assets when deployed", async function() {
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });

    it("knows how to find azimuth", async function() {
        expect(await this.treasury.azimuth()).to.equal(this.azimuth.address);
    });

    it("deploys a token contract with no initial supply", async function() {
        expect(await this.token.name()).to.equal("StarToken");
        expect(await this.token.symbol()).to.equal("STAR");
        expect(await this.token.totalSupply()).to.equal(0);
    });

    it("allows deposit of star from owner", async function() {
        // case 1
        let res = await this.treasury.deposit(PointStarZero);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
        await expect(res).to.emit(this.token, "Minted").withArgs(
            this.treasury.address, this.creator.address, this.oneStar, "0x", "0x"
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.oneStar);
        expect(await this.azimuth.isOwner(PointStarZero, this.treasury.address)).to.be.true;

        // case 2
        res = await this.treasury.deposit(PointStarOne);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarOne, this.creator.address
        );
        await expect(res).to.emit(this.token, "Minted").withArgs(
            this.treasury.address, this.creator.address, this.oneStar, "0x", "0x"
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.oneStar.mul(2));
        expect(await this.azimuth.isOwner(PointStarOne, this.treasury.address)).to.be.true;
    });

    it("doesn't allow deposit of non-stars", async function() {
        await expect(this.treasury.deposit(PointGalaxyZero)).to.be.reverted;
        await expect(this.treasury.deposit(PointPlanetZero)).to.be.reverted;
    });

    it("doesn't allow deposit from non-owner", async function() {
        await expect(this.treasury.connect(this.registryFunder).deposit(PointStarZero)).to.be.reverted;
        await expect(this.treasury.connect(this.registryFunder).deposit(PointStarOne)).to.be.reverted;
    });

    it("allows redeem from token holder", async function() {
        // stars come out in FILO order, i.e., there is a stack
        let res = await this.treasury.redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarOne, this.creator.address
        );
        expect(await this.azimuth.getPrefix(PointStarOne)).to.equal(PointGalaxyZero);
        let res2 = await this.treasury.redeem();
        await expect(res2).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
    });

    it("allows deposit-send-redeem pattern", async function() {
        expect(await this.azimuth.isOwner(PointStarZero, this.creator.address)).to.be.true;
        expect(await this.azimuth.getTransferProxy(PointStarZero)).to.equal(constants.ZERO_ADDRESS);
        await this.ecliptic.setTransferProxy(PointStarZero, this.treasury.address);
        let res = await this.treasury.deposit(PointStarZero);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarZero, this.creator.address
        );
        await expect(res).to.emit(this.token, "Minted").withArgs(
            this.treasury.address, this.creator.address, this.oneStar, "0x", "0x"
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.oneStar);

        // transfer the token
        res = await this.token.send(this.operator.address, this.oneStar, "0x");
        await expect(res).to.emit(this.token, "Sent").withArgs(
            this.creator.address, this.creator.address, this.operator.address, this.oneStar, "0x", "0x"
        );
        await expect(res).to.emit(this.token, "Transfer").withArgs(
            this.creator.address, this.operator.address, this.oneStar
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(0);
        expect(await this.token.balanceOf(this.operator.address)).to.equal(this.oneStar);

        // now redeem on the other side
        res = await this.treasury.connect(this.operator).redeem();
        await expect(res).to.emit(this.treasury, "Redeem").withArgs(
            PointGalaxyZero, PointStarZero, this.operator.address
        );
        expect(await this.token.balanceOf(this.operator.address)).to.equal(0);
    });

    it("doesn't allow redeem from non-holder", async function () {
        await expect(this.treasury.connect(this.registryFunder).redeem()).to.be.reverted;
    });

    it("doesn't allow redeem when balance is too low", async function() {
        expect(await this.azimuth.isOwner(PointStarOne, this.creator.address)).to.be.true;
        expect(await this.azimuth.getTransferProxy(PointStarOne)).to.equal(constants.ZERO_ADDRESS);
        await this.ecliptic.setTransferProxy(PointStarOne, this.treasury.address);
        let res = await this.treasury.deposit(PointStarOne);
        await expect(res).to.emit(this.treasury, "Deposit").withArgs(
            PointGalaxyZero, PointStarOne, this.creator.address
        );
        await expect(res).to.emit(this.token, "Minted").withArgs(
            this.treasury.address, this.creator.address, this.oneStar, "0x", "0x"
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.oneStar);

        // burn one token
        // res = await this.token.burn(this.creator.address, 1);
        res = await this.token.burn(1, "0x");
        await expect(res).to.emit(this.token, "Burned").withArgs(
            this.creator.address, this.creator.address, 1, "0x", "0x"
        );
        expect(await this.token.balanceOf(this.creator.address)).to.equal(this.oneStar.sub(1));

        // now redeem should fail
        await expect(this.treasury.redeem()).to.be.reverted;
    });
});
