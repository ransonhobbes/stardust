const Azimuth = artifacts.require('AzimuthImporter');

require('@openzeppelin/test-helpers/configure')({ provider: web3.currentProvider, environment: 'truffle' });

module.exports = async (deployer, network, accounts) => {
  if (network === 'development') {
    await deployer.deploy(Azimuth);
    await Azimuth.deployed();
  }
};
