const { deployProxy, upgradeProxy, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxV2 = artifacts.require("MetabloxV2");
const MetabloxV2WithAccessControl = artifacts.require("MetabloxV2WithAccessControl");

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
      let sf_inst = await MetabloxV2WithAccessControl.at("0xbF4DC3eD93b2c1c47B6a54726072d4B358007550")
      console.log(sf_inst.address, deployer)
      let sf_new_inst = await upgradeProxy(sf_inst.address, MetabloxV2WithAccessControl, { deployer })
      console.log(sf_new_inst.address)

      let mi_inst = await MetabloxV2WithAccessControl.at("0x4c08A46b441b73EfC45B02ceB00a58C91d63ecba")
      console.log(mi_inst.address, deployer)
      let mi_new_inst = await upgradeProxy(mi_inst.address, MetabloxV2WithAccessControl, { deployer })
      console.log(mi_new_inst.address)

      let sg_inst = await MetabloxV2WithAccessControl.at("0xe8cC756Aa679d2428345B191B8689119Bf73FD74")
      console.log(sg_inst.address, deployer)
      let sg_new_inst = await upgradeProxy(sg_inst.address, MetabloxV2WithAccessControl, { deployer })
      console.log(sg_new_inst.address)

      let ny_inst = await MetabloxV2WithAccessControl.at("0x6DA8Bc030263adADa4AF61e50E8d98f39b9cE1f0")
      console.log(ny_inst.address, deployer)
      let ny_new_inst = await upgradeProxy(ny_inst.address, MetabloxV2WithAccessControl, { deployer })
      console.log(ny_new_inst.address)
    }

  } else {
    const sg_inst = await MetabloxV2.at("0xb170b03C505EF44c06381348081077bfE39b5E93")
    const sf_inst = await MetabloxV2.at("0x5761B71B1d7B85a6Fc5F99c06139202891565017")
    const mi_inst = await MetabloxV2.at("0x18d8c8973F4FA685c78b83dE3500c57cD655952F")
    const ny_inst = await MetabloxV2.at("0x43619Ab1D204Eb8384CC37909b0AE5C79D267F2b")
    /* upgrade */
    console.log("upgrading NY contract...", new Date())
    const new_sg_inst = await upgradeProxy(sg_inst.address, MetabloxV2WithAccessControl, { deployer })
    console.log({ new_sg_inst: new_sg_inst.address, })
    const new_sf_inst = await upgradeProxy(sf_inst.address, MetabloxV2WithAccessControl, { deployer })
    console.log({ new_sf_inst: new_sf_inst.address})
    const new_mi_inst = await upgradeProxy(mi_inst.address, MetabloxV2WithAccessControl, { deployer })
    console.log({ new_mi_inst: new_mi_inst.address})
    const new_ny_inst = await upgradeProxy(ny_inst.address, MetabloxV2WithAccessControl, { deployer })
    console.log({ new_ny_inst: new_ny_inst.address})
  }
};
