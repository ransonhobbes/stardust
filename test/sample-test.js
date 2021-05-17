const { expect } = require("chai");
// const { accounts } = require('@openzeppelin/test-environment');
const { singletons } = require("@openzeppelin/test-helpers");

contract("StarToken", function(accounts) {
  beforeEach(async function () {
    const funder = accounts[0]; // account that will be used to fund the deployment
    this.erc1820 = await singletons.ERC1820Registry(funder);
  });

  it("Should contain zero balance once deployed", async function() {
    const StarToken = await ethers.getContractFactory("StarToken");
    const token = await StarToken.deploy(0, []);
    const accounts = await ethers.getSigners();
    const someAddress = accounts[0].address;
    
    await token.deployed();
    expect(await token.totalSupply()).to.equal(0);

    await token.mint(someAddress, 100);
    expect(await token.totalSupply()).to.equal(100);
    expect(await token.balanceOf(someAddress)).to.equal(100);
  });
});
