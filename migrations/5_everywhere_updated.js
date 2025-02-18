const { upgradeProxy, forceImport } = require('@openzeppelin/truffle-upgrades');
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");

module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  if (network === "development") {
    return;
  }

  const addr = network === "mumbai" ? "0x49DbD1e788c22a641Ea8A7d940852fCb1b7D808b" : "0x225062C239719061C3a7104F9AE0524A76ED3eDF";
  /* upgrade */
  let inst = await MetabloxEverywhere.at(addr)
  console.log(inst.address)
  // let newInst = await forceImport(inst.address, MetabloxEverywhere, { deployer })
  let newInst = await upgradeProxy(inst.address, MetabloxEverywhere, { deployer })
  console.log(newInst.address)


};
