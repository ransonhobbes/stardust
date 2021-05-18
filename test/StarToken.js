const {ethers} = require("hardhat");
const {singletons} = require("@openzeppelin/test-helpers");

describe("StarToken", function() {
    before(async function () {
        const initialSupply = 100;
        const defaultOperators = [];
        const [registryFunder, creator, operator] = await ethers.getSigners();
        const StarToken = await ethers.getContractFactory("StarToken", creator);
        await singletons.ERC1820Registry(registryFunder.address);
        this.token = await StarToken.deploy(initialSupply, defaultOperators);
        this.creator = creator;
        this.operator = operator;
    });

    it("has a name", async function () {
        assert.equal(await this.token.name(), "StarToken");
    });

    it("has a symbol", async function () {
        assert.equal(await this.token.symbol(), "STAR");
    });

    it("assigns the initial total supply to the creator", async function () {
        const totalSupply = await this.token.totalSupply();
        const creatorBalance = await this.token.balanceOf(this.creator.address);
        assert.equal(creatorBalance.toString(), totalSupply.toString());

        // await expectEvent.inConstruction(this.token, 'Transfer', {
        //   from: ZERO_ADDRESS,
        //   to: creator,
        //   value: totalSupply,
        // });
    });

    it("Should contain zero balance once deployed", async function () {
        assert.equal(await this.token.totalSupply(), 100);
        await this.token.mint(this.operator.address, 100);
        assert.equal(await this.token.totalSupply(), 200);
        assert.equal(await this.token.balanceOf(this.operator.address), 100);
    });

    it('allows operator burn', async function () {
        const creatorBalance = await this.token.balanceOf(this.creator.address);
        const data = web3.utils.sha3('StarToken');
        const operatorData = web3.utils.sha3('Simple777OperatorData');

        await this.token.authorizeOperator(this.operator.address);
        await this.token.attach(this.operator.address).operatorBurn(this.creator.address, creatorBalance, data, operatorData);
        const creatorBalanceNew = await this.token.balanceOf(this.creator.address);
        assert.equal(creatorBalanceNew.toString(), "0");
    });
});
