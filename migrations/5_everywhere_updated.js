const { upgradeProxy, forceImport } = require('@openzeppelin/truffle-upgrades');
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");

module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  if (network === "development") {
    return;
  }

  const addr = network === "mumbai" ? "0xcd7f6902e5918F830163d02209D67B4f4ecE22DA" : "0x225062C239719061C3a7104F9AE0524A76ED3eDF";
  /* upgrade */
  let inst = await MetabloxEverywhere.at(addr)
  console.log(inst.address)
  // let newInst = await forceImport(inst.address, MetabloxEverywhere, { deployer })
  let newInst = await upgradeProxy(inst.address, MetabloxEverywhere, { deployer })
  console.log(newInst.address)


};
