const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");

module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  if (network === "development") {
    return;
  }

  if (network === "mumbai") {
    /* upgrade */
    let inst = await MetabloxEverywhere.at("0xEDc924d53d822CD446Bcfb31DFd85f12707d9D0E")
    console.log(inst.address, deployer)
    let newInst = await upgradeProxy(inst.address, MetabloxEverywhere, { deployer })
    console.log(newInst.address, deployer)
   
  } else {
    return;
  }

};
