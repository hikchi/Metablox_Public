const { deployProxy, upgradeProxy, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxV2WithAccessControl = artifacts.require("MetabloxV2WithAccessControl");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

const MetabloxController = artifacts.require("MetabloxController");
const MetabloxMemories = artifacts.require("MetabloxMemories");

const fs = require('fs');
const moment = require("moment-timezone");


module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  console.log({ network, accounts });
  // Use deployer to state migration tasks.
  if (network !== "polygon") {
    if (network === "development") {
      return;
    }

    if (network === "mumbai") {
      console.log("Deploy with SF on Mumbai...")
      // get existing contract of tier, level, and memories
      // const _propertyTierInstance = await PropertyTier.at("0xb8B4E8ad8e5Bbbc3c724B296273F2845eC81A7F0");
      // const _propertyLevelInstance = await PropertyLevel.at("0xc5f8EcDF5dE7C96003138b1AfD4138C5f360636e");
      // const _memoriesInstance = await MetabloxMemories.at("0x72A71A03fF0E8B034e5767FC0365D3fC501E569F");
      await deployer.deploy(PropertyTier)
      await deployer.deploy(PropertyLevel)
      await deployer.deploy(MetabloxMemories)
      const _propertyTierInstance = await PropertyTier.deployed();
      const _propertyLevelInstance = await PropertyLevel.deployed();
      const _memoriesInstance = await MetabloxMemories.deployed();
      console.log(`Deployed property tier on ${network} with address ${_propertyTierInstance.address}`);
      console.log(`Deployed property level on ${network} with address ${_propertyLevelInstance.address}`);
      console.log(`Deployed memories on ${network} with address ${_memoriesInstance.address}`);
      // testnet addressees
      const USDT_ADDRESS = "0x0d1A71446BCc1751a096682893Ca70E02cC65Ee5";
      const WETH_ADDRESS = "0x3e002d7e1645baBca1f52A0049422c5a64907024";
      const WMATIC_ADDRESS = "0x7361A3D0aaE76083e7DEBCdE76C5F8a4F5D848e4";
      const WETH_CHAINLINK = "0x0715A7794a1dc8e42615F059dD6e406A6594651A";
      const MATIC_CHAINLINK = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";
      // deploy metablox v2
      const _metabloxV2Instance = await deployProxy(MetabloxV2WithAccessControl, [
        "Metablox",
        "Blox-SF",
        accounts[0],
        _propertyTierInstance.address,
        _propertyLevelInstance.address,
        [USDT_ADDRESS, WETH_ADDRESS, WMATIC_ADDRESS, WETH_CHAINLINK, MATIC_CHAINLINK],
      ], { deployer });
      // set blox contract and memory
      await _memoriesInstance.setBloxContract(_metabloxV2Instance.address);

      await deployer.deploy(MetabloxController,
        _metabloxV2Instance.address,    // blox contract
        _memoriesInstance.address,      // memori contract
        _propertyLevelInstance.address, // property level contract
      )
      // get controller instance
      await _memoriesInstance.setBloxController(_controllerInstance.address);

      // Set up for property level
      const ATTACH_ROLE = await _propertyLevelInstance.ATTACH_ROLE()
      await _propertyLevelInstance.grantRole(ATTACH_ROLE, _metabloxV2Instance.address)

      // await _propertyLevelInstance.mintBatch(
      //   [1, 2, 3, 4],
      //   ["level", "memory marks", "memory slot", "metarent storage"],
      //   ["level", "memory marks", "memory slot", "metarent storage"],
      //   ["level", "memory marks", "memory slot", "metarent storage"],
      // );
      // set up blox supply
      await _metabloxV2Instance.setTotalBloxSupply(4534);
      await _metabloxV2Instance.setTotalBloxSupplyWithLandmark(4568);
      // to-do: setup landmark list
      // finish
      console.log(`Deployed on ${network} with address ${_metabloxV2Instance.address}`);

      result = {
        usdt_address: USDT_ADDRESS,
        weth_address: WETH_ADDRESS,
        wmatic_address: WMATIC_ADDRESS,
        weth_chainlink: WETH_CHAINLINK,
        matic_chainlink: MATIC_CHAINLINK,
        property_tier: _propertyTierInstance.address,
        property_level: _propertyLevelInstance.address,
        controller: _controllerInstance.address,
        memory: _memoriesInstance.address,
        metablox: _metabloxV2Instance.address,
      }

      console.log("SF:", result)
      fs.writeFileSync(`${__dirname}/../data/${moment().tz('Asia/Taipei').format('YYYYMMDD')}_${network}_sf.json`, JSON.stringify(result, null, 2), {
        encoding: "utf8",
        flag: "wx",
      })
    }

  } else {
    // deploy tier, level, and memories to mainnet
    await deployer.deploy(PropertyTier)
    await deployer.deploy(PropertyLevel)
    await deployer.deploy(MetabloxMemories)
    const _propertyTierInstance = await PropertyTier.deployed();
    const _propertyLevelInstance = await PropertyLevel.deployed();
    const _memoriesInstance = await MetabloxMemories.deployed();
    console.log(`Deployed property tier on ${network} with address ${_propertyTierInstance.address}`);
    console.log(`Deployed property level on ${network} with address ${_propertyLevelInstance.address}`);
    console.log(`Deployed memories on ${network} with address ${_memoriesInstance.address}`);
    // mainnet addresses
    const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
    const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
    const WMATIC_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
    const WETH_CHAINLINK = "0xF9680D99D6C9589e2a93a78A04A279e509205945";
    const MATIC_CHAINLINK = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";
    // deploy metablox v2 contract
    const _metabloxV2Instance = await deployProxy(MetabloxV2WithAccessControl, [
      accounts[1],
      _propertyTierInstance.address,
      _propertyLevelInstance.address,
      [USDT_ADDRESS, WETH_ADDRESS, WMATIC_ADDRESS, WETH_CHAINLINK, MATIC_CHAINLINK],
    ], { deployer });
    // set blox contract and memory
    await _memoriesInstance.setBloxContract(_metabloxV2Instance.address);
    // deploy controller contract
    // await deployer.deploy(MetabloxController,
    //   _metabloxV2Instance.address,    // blox contract
    //   _memoriesInstance.address,      // memori contract
    //   _propertyLevelInstance.address, // property level contract
    // )
    // get controller instance
    // const _controllerInstance = await MetabloxController.deployed();
    // console.log(`Deployed controller on ${network} with address ${_controllerInstance.address}`);
    // Set up for property level
    const ATTACH_ROLE = await _propertyLevelInstance.ATTACH_ROLE();
    await _propertyLevelInstance.grantRole(ATTACH_ROLE, _metabloxV2Instance.address);
    // await _propertyLevelInstance.grantRole(ATTACH_ROLE, _controllerInstance.address);
    await _propertyLevelInstance.mintBatch(
      [1, 2, 3, 4],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
    );
    // set up blox supply
    await _metabloxV2Instance.setTotalBloxSupply(4534);
    await _metabloxV2Instance.setTotalBloxSupplyWithLandmark(4568);
    // setup landmark list
    // await _metabloxV2Instance.setLandmarkNumber([1379, 4282, 3519, 1039, 32, 3434, 3527, 29, 26, 23, 42, 3643, 9, 904, 1043, 1102, 1328, 1369, 8, 1464, 1808, 3521, 3518, 3529, 3638, 4284, 4285, 4281, 4280, 10, 4518, 3646, 4283, 3516], true)
    // finish
    console.log(`Deployed on ${network} with address ${_metabloxV2Instance.address}`);

    result = {
      usdt_address: USDT_ADDRESS,
      weth_address: WETH_ADDRESS,
      wmatic_address: WMATIC_ADDRESS,
      weth_chainlink: WETH_CHAINLINK,
      matic_chainlink: MATIC_CHAINLINK,
      property_tier: _propertyTierInstance.address,
      property_level: _propertyLevelInstance.address,
      controller: "skipped",
      memory: _memoriesInstance.address,
      metablox: _metabloxV2Instance.address,
    }

    fs.writeFileSync(`${__dirname}/../data/${moment().tz('Asia/Taipei').format('YYYYMMDD')}_${network}_sf.json`, JSON.stringify(result, null, 2), {
      encoding: "utf8",
      flag: "wx",
    })
  }
};
