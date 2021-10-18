const {expect} = require("chai");
const {ethers} = require("hardhat");
const {constants} = require("@openzeppelin/test-helpers");

describe("StarToken", function() {
    before(async function () {
        const initialSupply = 100;
        const defaultOperators = [];
        const [creator, operator] = await ethers.getSigners();
        const StarToken = await ethers.getContractFactory("StarToken", creator);
        this.token = await StarToken.deploy(initialSupply, defaultOperators);
        const receipt = await this.token.deployTransaction.wait();
        const totalSupply = await this.token.totalSupply();
        expect(receipt.status).to.equal(1);
        await expect(this.token.deployTransaction).to.emit(this.token, 'Transfer').withArgs(
            constants.ZERO_ADDRESS, creator.address, totalSupply
        );

        this.creator = creator;
        this.operator = operator;
    });

    it("has a name", async function() {
        expect(await this.token.name()).to.equal("StarToken");
    });

    it("has a symbol", async function() {
        expect(await this.token.symbol()).to.equal("STAR");
    });

    it("assigns the initial total supply to the creator", async function() {
        const totalSupply = await this.token.totalSupply();
        const creatorBalance = await this.token.balanceOf(this.creator.address);
        expect(creatorBalance).to.equal(totalSupply);
    });

    it("should contain zero balance once deployed", async function() {
        expect(await this.token.totalSupply()).to.equal(100);
        const response = await this.token.mint(this.operator.address, 100);
        const receipt = await response.wait();
        expect(receipt.status).to.equal(1);
        await expect(response).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.operator.address, 100
        );
        expect(await this.token.totalSupply()).to.equal(200);
        expect(await this.token.balanceOf(this.operator.address)).to.equal(100);
    });
});
