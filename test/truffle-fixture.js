const StarToken = artifacts.require("StarToken");
const { accounts } = require('@openzeppelin/test-environment');
const { singletons } = require("@openzeppelin/test-helpers");

const initialSupply = 100;
const defaultOperators = [];

module.exports = async () => {
    // if (network === "development") {
    await singletons.ERC1820Registry(accounts[0]);
    // }
    const token = await StarToken.new(initialSupply, defaultOperators);
    StarToken.setAsDeployed(token);
    // await deployer.deploy(StarToken, initialSupply, defaultOperators);
};
