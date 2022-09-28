const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");

module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  if (network === "development") {
    return;
  }

  if (network === "mumbai") {
    /* upgrade */
    let inst = await MetabloxEverywhere.at("0xcd7f6902e5918F830163d02209D67B4f4ecE22DA")
    console.log(inst.address, deployer)
    let newInst = await upgradeProxy(inst.address, MetabloxEverywhere, { deployer })
    console.log(newInst.address, deployer)
   
  } else {
    return;
  }

};
