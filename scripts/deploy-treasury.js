// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

// need to wrap require to read this lib as it's an ECMAScript module from a React project
require = require("esm")(module);
const CONTRACT_ADDRESSES = require("bridge/src/lib/contracts").CONTRACT_ADDRESSES;

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // Azimuth is already deployed here
    // TODO: load this from the bridge library
    const Azimuth = await hre.ethers.getContractFactory("AzimuthWrapper");
    const azimuth = Azimuth.attach(CONTRACT_ADDRESSES.ROPSTEN.azimuth);

    // We get the contract to deploy
    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(azimuth.address);
    await treasury.deployed();

    console.log("Treasury deployed to:", treasury.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
