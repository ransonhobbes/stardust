const {expect} = require("chai");
require("chai").should();
const {accounts, contract} = require('@openzeppelin/test-environment');
const {singletons} = require("@openzeppelin/test-helpers");

const StarToken = contract.fromArtifact("StarToken");

const initialSupply = 100;
const defaultOperators = [];

describe("StarToken", function () {
    const [registryFunder, creator, operator] = accounts;

    beforeEach(async function () {
        await singletons.ERC1820Registry(registryFunder);
        // this.erc1820 = await singletons.ERC1820Registry(funder);
        // const StarToken = await ethers.getContractFactory("StarToken");
        // this.token = await StarToken.deploy(0, []);
        // await this.token.deployed();
        this.token = await StarToken.new(initialSupply, defaultOperators, {from: creator});
    });

    it("has a name", async function () {
        (await this.token.name()).should.equal("StarToken");
    });

    it("has a symbol", async function () {
        (await this.token.symbol()).should.equal("STAR");
    });

    it("assigns the initial total supply to the creator", async function () {
        const totalSupply = await this.token.totalSupply();
        const creatorBalance = await this.token.balanceOf(creator);

        creatorBalance.should.be.bignumber.equal(totalSupply);

        // await expectEvent.inConstruction(this.token, 'Transfer', {
        //   from: ZERO_ADDRESS,
        //   to: creator,
        //   value: totalSupply,
        // });
    });

    it("Should contain zero balance once deployed", async function () {
        (await this.token.totalSupply()).should.be.bignumber.equal("100");
        await this.token.mint(operator, 100, {from: creator});
        (await this.token.totalSupply()).should.be.bignumber.equal("200");
        (await this.token.balanceOf(operator)).should.be.bignumber.equal("100");
    });
});
