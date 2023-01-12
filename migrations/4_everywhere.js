const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

const MetabloxMemories = artifacts.require("MetabloxMemories");

const fs = require('fs');
const moment = require("moment-timezone");


module.exports = async function (deployer, network, accounts) {
  // get network and accounts
  // Use deployer to state migration tasks.
  if (network === "development") {
    return;
  }

  console.log({ network, accounts });

  let USDT_ADDRESS;
  let WETH_ADDRESS;
  let WMATIC_ADDRESS;
  let WETH_CHAINLINK;
  let MATIC_CHAINLINK;

  let BASE_URI;
  let CONTRACT_URI;

  if (network === "mumbai") {
    USDT_ADDRESS = "0x0d1A71446BCc1751a096682893Ca70E02cC65Ee5";
    WETH_ADDRESS = "0x3e002d7e1645baBca1f52A0049422c5a64907024";
    WMATIC_ADDRESS = "0x7361A3D0aaE76083e7DEBCdE76C5F8a4F5D848e4";
    WETH_CHAINLINK = "0x0715A7794a1dc8e42615F059dD6e406A6594651A";
    MATIC_CHAINLINK = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";

    BASE_URI = "https://dev.metablox.co/api/v1/tokenuri/";
		CONTRACT_URI = "https://dev.metablox.co/api/v1/royalty/opensea/metadata/";
  }

  if (network === "polygon") {
    USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
    WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
    WMATIC_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
    WETH_CHAINLINK = "0xF9680D99D6C9589e2a93a78A04A279e509205945";
    MATIC_CHAINLINK = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";

    BASE_URI = "https://metablox.co/api/v1/tokenuri/";
		CONTRACT_URI = "https://metablox.co/api/v1/royalty/opensea/metadata/";
  }

  // get existing contract of tier, level, and memories
  // const _propertyTierInst = await PropertyTier.at("0xbdC34F5bd6f429Eaef982d344E299d4d1b6970e2");
  // const _propertyLevelInst = await PropertyLevel.at("0xbfd85868E83866D8EAAe978E98Bd641354256869");
  // const _memoriesInst = await MetabloxMemories.at("0xdA2b9098bb0a5482155725f6ccd6Ea182f54f6aC");
  await deployer.deploy(PropertyTier)
  await deployer.deploy(PropertyLevel)
  await deployer.deploy(MetabloxMemories)
  const _propertyTierInst = await PropertyTier.deployed();
  const _propertyLevelInst = await PropertyLevel.deployed();
  const _memoriesInst = await MetabloxMemories.deployed();
  console.log(`Deployed property tier on ${network} with address ${_propertyTierInst.address}`);
  console.log(`Deployed property level on ${network} with address ${_propertyLevelInst.address}`);
  console.log(`Deployed memories on ${network} with address ${_memoriesInst.address}`);
  // start deploy everywhere contract
  console.log('Sleep 10 sec to deploy metablox everywhere..')
  await new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
  // deploy metablox v2
  const _mbInst = await deployProxy(MetabloxEverywhere, [
    _propertyTierInst.address,
    _propertyLevelInst.address,
    _memoriesInst.address,
    [USDT_ADDRESS, WMATIC_ADDRESS, WETH_ADDRESS, MATIC_CHAINLINK, WETH_CHAINLINK],
    [accounts[1], accounts[2], accounts[3]],
  ], { deployer });
  // set blox contract and memory
  // await _memoriesInst.setBloxContract(_mbInst.address);

  // Set up for property level
  console.log('Sleep 3 sec to setup property level...')
  await new Promise((resolve) => {
    setTimeout(resolve, 3);
  });
  const ATTACH_ROLE = await _propertyLevelInst.ATTACH_ROLE()
  await _propertyLevelInst.grantRole(ATTACH_ROLE, _mbInst.address)

  await _propertyLevelInst.mintBatch(
    [1, 2, 3, 4],
    ["level", "memory marks", "memory slot", "metarent storage"],
    ["level", "memory marks", "memory slot", "metarent storage"],
    ["level", "memory marks", "memory slot", "metarent storage"],
  );

  console.log('Sleep 3 sec to setup everywhere instance...')
  await new Promise((resolve) => {
    setTimeout(resolve, 3);
  });
  await _mbInst.setBaseURI(BASE_URI);
  await _mbInst.setContractURI(CONTRACT_URI);
  await _mbInst.setDefaultRoyalty(accounts[3], 200);
  // finish
  console.log(`Deployed on ${network}. Address: ${_mbInst.address}`);

  result = {
    usdt_address: USDT_ADDRESS,
    weth_address: WETH_ADDRESS,
    wmatic_address: WMATIC_ADDRESS,
    weth_chainlink: WETH_CHAINLINK,
    matic_chainlink: MATIC_CHAINLINK,
    property_tier: _propertyTierInst.address,
    property_level: _propertyLevelInst.address,
    memory: _memoriesInst.address,
    metablox: _mbInst.address,
  }

  console.log({ result })
  fs.writeFileSync(`${__dirname}/../data/${moment().tz('Asia/Taipei').format('YYYYMMDD')}_${network}_seattle.json`, JSON.stringify(result, null, 2), {
    encoding: "utf8",
    flag: "wx",
  })
}
