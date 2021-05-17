const {expect} = require("chai");
const {accounts} = require('@openzeppelin/test-environment');
const {singletons} = require("@openzeppelin/test-helpers");

// const StarToken = contract.fromArtifact("StarToken");
const StarToken = artifacts.require("StarToken");

contract("StarToken", () => {
    const [registryFunder, creator, operator] = accounts;
    beforeEach(async function () {
        // const funder = accounts[0]; // account that will be used to fund the deployment
        // await singletons.ERC1820Registry(registryFunder);
        this.erc1820 = await singletons.ERC1820Registry(registryFunder);
        this.token = await StarToken.new(0, [], {from: creator});
        // await this.token.deployed();
        // this.token = await StarToken.new({from: funder});
    });

    it("has a name", async function () {
        (await this.token.name()).should.equal("StarToken");
    });

    it("has a symbol", async function () {
        (await this.token.symbol()).should.equal("STAR");
    });

    it("assigns the initial total supply to the creator", async function () {
        const totalSupply = await this.token.totalSupply();
        const creatorBalance = await this.token.balanceOf(accounts[0]);

        creatorBalance.should.be.bignumber.equal(totalSupply);

        // await expectEvent.inConstruction(this.token, 'Transfer', {
        //   from: ZERO_ADDRESS,
        //   to: creator,
        //   value: totalSupply,
        // });
    });

    // it("Should contain zero balance once deployed", async function() {
    //   const token = await StarToken.deploy(0, []);
    //   const someAddress = accounts[0];
    //   await token.deployed();
    //   expect(await token.totalSupply()).to.equal(0);
    //
    //   await token.mint(someAddress, 100);
    //   expect(await token.totalSupply()).to.equal(100);
    //   expect(await token.balanceOf(someAddress)).to.equal(100);
    // });
});
