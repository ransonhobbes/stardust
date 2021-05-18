// Unfortunately truffle only supports pinning a single version of solc. We have code that relies
// on an older, legacy version of solidity, and code that relies on new solidity, and the two are
// not compatible, so we need to keep them isolated in two different contracts folders. This config
// file is used only to compile the legacy code, using an older solc.

module.exports = {
  contracts_directory: "./contracts-legacy",

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.4.24",
      settings: {
       optimizer: {
         enabled: true,
         runs: 200
       }
      }
    }
  }
};
