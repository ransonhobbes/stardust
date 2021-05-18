require("@nomiclabs/hardhat-waffle");

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  paths: {
    sources: "./contracts-legacy"
  },
  solidity: {
    version: "0.4.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  }
};
