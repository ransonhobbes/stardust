module.exports = async function (hre) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;

    const {deployer, azimuth} = await getNamedAccounts();

    await deploy('Treasury', {
        from: deployer,
        args: [azimuth],
        log: true,
    })
};
// func.tags = ['Token'];
