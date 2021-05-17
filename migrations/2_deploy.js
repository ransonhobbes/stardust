const StarToken = artifacts.require('StarToken');

require('@openzeppelin/test-helpers/configure')({ provider: web3.currentProvider, environment: 'truffle' });

const { singletons } = require('@openzeppelin/test-helpers');

const initialSupply = 100;
const defaultOperators = [];

module.exports = async (deployer, network, accounts) => {
  if (network === 'development') {
    // In a test environment an ERC777 token requires deploying an ERC1820 registry
    await singletons.ERC1820Registry(accounts[0]);
  }

  await deployer.deploy(StarToken, initialSupply, defaultOperators);
  await StarToken.deployed();
};
