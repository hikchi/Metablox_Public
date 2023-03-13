const { deployProxy, upgradeProxy, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxV2 = artifacts.require("MetabloxV2");
const MetabloxV2WithAccessControl = artifacts.require("MetabloxV2WithAccessControl");
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");

module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  console.log({ network, accounts });
  // Use deployer to state migration tasks.
  if (network !== "polygon") {
    if (network === "development") {
      return;
    }

    if (network === "mumbai") {
      /* upgrade */
      // let sf_inst = await MetabloxV2WithAccessControl.at("0xbF4DC3eD93b2c1c47B6a54726072d4B358007550")
      // console.log(sf_inst.address, deployer)
      // let sf_new_inst = await upgradeProxy(sf_inst.address, MetabloxV2WithAccessControl, { deployer })
      // console.log(sf_new_inst.address)

      // let mi_inst = await MetabloxV2WithAccessControl.at("0x4c08A46b441b73EfC45B02ceB00a58C91d63ecba")
      // console.log(mi_inst.address, deployer)
      // let mi_new_inst = await upgradeProxy(mi_inst.address, MetabloxV2WithAccessControl, { deployer })
      // console.log(mi_new_inst.address)

      // let sg_inst = await MetabloxV2WithAccessControl.at("0xe8cC756Aa679d2428345B191B8689119Bf73FD74")
      // console.log(sg_inst.address, deployer)
      // let sg_new_inst = await upgradeProxy(sg_inst.address, MetabloxV2WithAccessControl, { deployer })
      // console.log(sg_new_inst.address)

      // let ny_inst = await MetabloxV2WithAccessControl.at("0x6DA8Bc030263adADa4AF61e50E8d98f39b9cE1f0")
      // console.log(ny_inst.address, deployer)
      // let ny_new_inst = await upgradeProxy(ny_inst.address, MetabloxV2WithAccessControl, { deployer })
      // console.log(ny_new_inst.address)
      /* upgrade */
      console.log("upgrading Everywhere contract...", new Date())
      const new_inst = await upgradeProxy("0x7848b50c57A7112F94351bf2372a6f8072bD6ffE", MetabloxEverywhere, { deployer })
      console.log({ new_inst: new_inst.address, })
    }

  } else {
    const inst = await MetabloxEverywhere.at("0x225062C239719061C3a7104F9AE0524A76ED3eDF")
    /* upgrade */
    console.log("upgrading Everywhere contract...", new Date())
    const new_inst = await upgradeProxy("0x225062C239719061C3a7104F9AE0524A76ED3eDF", MetabloxEverywhere, { deployer })
    console.log({ new_inst: new_inst.address, })
  }
};
