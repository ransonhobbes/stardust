const {expect} = require("chai");
const {ethers} = require("hardhat");
const {constants} = require("@openzeppelin/test-helpers");

describe("StarToken", function() {
    before(async function () {
        const [creator, operator] = await ethers.getSigners();
        const StarToken = await ethers.getContractFactory("StarToken", creator);
        this.token = await StarToken.deploy();
        const receipt = await this.token.deployTransaction.wait();
        expect(receipt.status).to.equal(1);

        this.creator = creator;
        this.operator = operator;
    });

    it("has a name", async function() {
        expect(await this.token.name()).to.equal("WrappedStar");
    });

    it("has a symbol", async function() {
        expect(await this.token.symbol()).to.equal("WSTR");
    });

    it("should contain zero balance once deployed", async function() {
        expect(await this.token.totalSupply()).to.equal(0);
    });

    it("owner can mint", async function() {
        const response = await this.token.mint(this.operator.address, 100);
        const receipt = await response.wait();
        expect(receipt.status).to.equal(1);
        await expect(response).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.operator.address, 100
        );
        expect(await this.token.totalSupply()).to.equal(100);
        expect(await this.token.balanceOf(this.operator.address)).to.equal(100);
    });
});
