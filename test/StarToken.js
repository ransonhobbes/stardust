require("chai").should();
const {accounts, contract} = require('@openzeppelin/test-environment');
const {singletons} = require("@openzeppelin/test-helpers");

const StarToken = contract.fromArtifact("StarToken");

const initialSupply = 100;
const defaultOperators = [];

describe("StarToken", function () {
    const [registryFunder, creator, operator] = accounts;

    before(async function () {
        await singletons.ERC1820Registry(registryFunder);
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

    it('allows operator burn', async function () {
        const creatorBalance = await this.token.balanceOf(creator);
        const data = web3.utils.sha3('StarToken');
        const operatorData = web3.utils.sha3('Simple777OperatorData');

        await this.token.authorizeOperator(operator, { from: creator });
        await this.token.operatorBurn(creator, creatorBalance, data, operatorData, { from: operator });
        (await this.token.balanceOf(creator)).should.be.bignumber.equal("0");
    });
});
