const { expect } = require("chai");

describe("StarToken", function() {
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
