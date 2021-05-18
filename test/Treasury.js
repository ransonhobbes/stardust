const {expect} = require("chai");
const {ethers} = require("hardhat");
const {singletons} = require("@openzeppelin/test-helpers");

describe("Treasury", function() {
    before(async function () {
        const [registryFunder, creator, operator] = await ethers.getSigners();
        const Azimuth = await ethers.getContractFactory("AzimuthWrapper", creator);
        const Treasury = await ethers.getContractFactory("Treasury", creator);
        await singletons.ERC1820Registry(registryFunder.address);
        const azimuth = await Azimuth.deploy();
        this.treasury = await Treasury.deploy(azimuth.address);
    });

    it("has no assets", async function () {
        expect(await this.treasury.getAssetCount()).to.equal(0);
    });
});
