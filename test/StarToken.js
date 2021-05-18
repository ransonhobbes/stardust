const {expect} = require("chai");
const {ethers} = require("hardhat");
const {singletons, constants} = require("@openzeppelin/test-helpers");

describe("StarToken", function() {
    before(async function () {
        const initialSupply = 100;
        const defaultOperators = [];
        const [registryFunder, creator, operator] = await ethers.getSigners();
        const StarToken = await ethers.getContractFactory("StarToken", creator);
        await singletons.ERC1820Registry(registryFunder.address);
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

    it("has a name", async function () {
        expect(await this.token.name()).to.equal("StarToken");
    });

    it("has a symbol", async function () {
        expect(await this.token.symbol()).to.equal("STAR");
    });

    it("assigns the initial total supply to the creator", async function () {
        const totalSupply = await this.token.totalSupply();
        const creatorBalance = await this.token.balanceOf(this.creator.address);
        await expect(creatorBalance).to.equal(totalSupply);
    });

    it("should contain zero balance once deployed", async function () {
        expect(await this.token.totalSupply()).to.equal(100);
        const response = await this.token.mint(this.operator.address, 100);
        const receipt = await response.wait();
        expect(receipt.status).to.equal(1);
        await expect(response).to.emit(this.token, "Minted").withArgs(
            this.creator.address, this.operator.address, 100, "0x", "0x"
        );
        await expect(response).to.emit(this.token, "Transfer").withArgs(
            constants.ZERO_ADDRESS, this.operator.address, 100
        );
        expect(await this.token.totalSupply()).to.equal(200);
        expect(await this.token.balanceOf(this.operator.address)).to.equal(100);
    });

    it("allows operator burn", async function () {
        const creatorBalance = await this.token.balanceOf(this.creator.address);
        const data = web3.utils.sha3('StarToken');
        const operatorData = web3.utils.sha3('Simple777OperatorData');

        const response = await this.token.authorizeOperator(this.operator.address);
        const receipt = await response.wait();
        expect(receipt.status).to.equal(1);
        await expect(response).to.emit(this.token, "AuthorizedOperator").withArgs(this.operator.address, this.creator.address);
        const response2 = await this.token.connect(this.operator).operatorBurn(this.creator.address, creatorBalance, data, operatorData);
        const receipt2 = await response2.wait();
        expect(receipt2.status).to.equal(1);
        await expect(response2).to.emit(this.token, "Transfer").withArgs(this.creator.address, constants.ZERO_ADDRESS, 100);
        await expect(response2).to.emit(this.token, "Burned").withArgs(this.operator.address, this.creator.address, 100, data, operatorData);
        expect(await this.token.balanceOf(this.creator.address)).to.equal(0);
    });
});
