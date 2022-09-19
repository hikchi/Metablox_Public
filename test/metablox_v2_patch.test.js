// const MetabloxV2 = artifacts.require("MetabloxV2");
const MetabloxV2 = artifacts.require("MetabloxV2WithAccessControl");
const MetabloxController = artifacts.require("MetabloxController");
const MetabloxMemories = artifacts.require("MetabloxMemories");
const TestToken = artifacts.require("TestToken");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

const TestChainlinkMatic = artifacts.require("TestMaticUsdtChainlink");
const TestChainlinkWeth = artifacts.require("TestWethUsdtChainlink");

const truffleAssert = require('truffle-assertions');

const BN = require('bn.js');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("MetabloxV2 Patch With Customized URI", function (accounts) {
  before(async function () {
    this.testNftOwner = accounts[0];
    this.testNftBenificiaryOne = accounts[1];
    this.testTokenBenificiary = accounts[9];

    this.testUri = "https://www.pnglib.com/";
    this.testBloxNumber = 1;
    this.testPropertyTier = 1;

    // deploy token to be tested
    const ERC_INIT_SUPPLY = "1000000000000000000000000"; // 10 ** 24
    this.USDT = await TestToken.new(ERC_INIT_SUPPLY);
    this.WETH = await TestToken.new(ERC_INIT_SUPPLY);
    this.WMATIC = await TestToken.new(ERC_INIT_SUPPLY);

    // deploy chainlink to be tested
    this.chainlinkWeth = await TestChainlinkWeth.new();
    this.chainlinkMatic = await TestChainlinkMatic.new();
    // this.chainlinkWeth = { address: "0x463aF444A72F31910A878E8BfEAfb1AF1eb52369" }
    // this.chainlinkMatic = { address: "0xb3A485acb609c0DeFcc03A6846a09b4DE6Fd2B99" }

    // Deploy a new property tier contract
    this.propertyTierContract = await PropertyTier.new();
    // Deploy a new property level contraxt
    this.propertyLevelContract = await PropertyLevel.new();
    this.MetabloxV2 = await MetabloxV2.new()
    // Deploy memories contract, and set with Metablox contract address
    this.metabloxMemories = await MetabloxMemories.new()
    await this.metabloxMemories.setBloxContract(this.MetabloxV2.address);
    // Deploy controller 
    this.metabloxControllerContract = await MetabloxController.new(this.MetabloxV2.address, this.metabloxMemories.address, this.propertyLevelContract.address)
    // initialize metablox contract
    await this.MetabloxV2.initialize(
      "Metablox",
      "Blox-test",
      this.testTokenBenificiary,
      this.propertyTierContract.address,
      this.propertyLevelContract.address,
      [this.USDT.address, this.WETH.address, this.WMATIC.address, this.chainlinkWeth.address, this.chainlinkMatic.address],
    );
    // Set up for property level
    const ATTACH_ROLE = await this.propertyLevelContract.ATTACH_ROLE();
    await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.MetabloxV2.address);
    await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.metabloxControllerContract.address);
    await this.propertyLevelContract.mintBatch(
      [1, 2, 3, 4],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
    );
    // assertion og property level contract
    assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.MetabloxV2.address), true, "metablox contract is not ERC3664 attacher");
    assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.metabloxControllerContract.address), true, "metablox controller is not ERC3664 attacher");
    // console.log(this.MetabloxV2.address)
    const TEST_BLOX_SUPPLY = 39
    await this.MetabloxV2.setTotalBloxSupply(TEST_BLOX_SUPPLY);
    await this.MetabloxV2.setTotalBloxSupplyWithLandmark(TEST_BLOX_SUPPLY + 10);
    await this.MetabloxV2.setLandmarkNumber(Array.from({ length: 10 }, (_, i) => TEST_BLOX_SUPPLY + 1 + i), true)

    await this.MetabloxV2.setCustomURI(this.testUri)
    await this.MetabloxV2.setMinter(accounts[2])
    await this.MetabloxV2.setCapper(accounts[3])
  });

  context("Contract Initialization", async function () {
    it("should have correct data", async function () {
      assert.equal((await this.MetabloxV2.name()).toString(), "Metablox", "unmatched name");
      assert.equal((await this.MetabloxV2.symbol()).toString(), "Blox-test", "unmatched symbol");
      assert.equal((await this.MetabloxV2.allBloxesSold()), false, "unmatched allBloxesSold");
      assert.equal((await this.MetabloxV2.phase()), 1, "unmatched phase");
      assert.equal((await this.MetabloxV2.beneficiary()), this.testTokenBenificiary, "unmatched beneficiary");
      assert.equal((await this.MetabloxV2.propertyTierContractAddress()), this.propertyTierContract.address, "unmatched property tier address");
      assert.equal((await this.MetabloxV2.maxPublicMintAmount()), 5, "unmatched maximum public mint amount");
      assert.equal((await this.MetabloxV2.maxReserveMintAmount()), 20, "unmatched maximum reserve mint amount");
    });

    it("should be approved by Opensea by default", async function () {
      assert.equal(await this.MetabloxV2.isApprovedForAll(this.testNftOwner, "0x58807baD0B376efc12F5AD86aAc70E78ed67deaE"), true, "unmatched Opensea approval status");
    })
  })

  context("Sad Path", async function () {
    context("Of Reserved Blox", async function () {
      before(async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), true, { from: accounts[9] }),
          "caller is not the capper",
          "should fail to set reserved blox with non-capper address",
        )
        await this.MetabloxV2.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), true, { from: accounts[3] });
      })

      it("should successfully flip reserved blox", async function () {
        for (i = 1; i <= 10; i++) {
          assert.equal(await this.MetabloxV2.cappedBlox(i), true, `unmatched whitelist of index ${i}`);
        }
      })

      it("should not be able to publicly mint reserved blox", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "the Blox is capped",
          "should not be able to publicly mint reserved blox",
        )
      })

      after(async function () {
        await this.MetabloxV2.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), false, { from: accounts[3] })
      })
    })

    context("Of Capped Blox", async function () {
      before(async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.capBloxBeforePayment(1, { from: accounts[9] }),
          "caller is not the capper",
          "should fail to set capped blox with non-capper address",
        )
        for (i = 1; i <= 10; i++) {
          await this.MetabloxV2.capBloxBeforePayment(i, { from: accounts[3] });
        }
      })

      it("should successfully flip capped blox", async function () {
        for (i = 1; i <= 10; i++) {
          assert.equal(await this.MetabloxV2.cappedBlox(i), true, `unmatched capped blox of id ${i}`);
        }
      })

      it("should not be able to publicly mint capped blox", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "the Blox is capped",
          "should not be able to publicly mint reserved blox",
        )
      })

      after(async function () {
        for (i = 1; i <= 10; i++) {
          await this.MetabloxV2.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), false, { from: accounts[3] })
        }
      })
    })

    context("Of Pause", async function () {
      before(async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.pause({ from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should fail to pause with non-owner address",
        )
        await truffleAssert.reverts(
          this.MetabloxV2.unpause({ from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should fail to unpause with non-owner address",
        )
        // pause
        await this.MetabloxV2.pause()
      })

      it("should not be able to publicly mint reserved blox", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "Pausable: paused",
          "should not be able to publicly mint reserved blox in pause status",
        )
      })

      after(async function () {
        await this.MetabloxV2.unpause()
      })
    })

    context("Of Others", async function () {
      it("should not be able to set blox total supply with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.setTotalBloxSupply(39, { from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should not be able to set blox total supply by non-owner address",
        )
      })

      it("should not be able to set blox total supply with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.setTotalBloxSupplyWithLandmark(49, { from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should not be able to set blox total supply with landmark by non-owner address",
        )
      })

      it("should not be able to mint with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.mintReservedBlox(
            this.testNftOwner,
            this.testBloxNumber,
            { from: accounts[9] }
          ),
          "caller is not the minter",
          "should not be able to mint with non-owner address",
        )
      })
    })

    context("Of Batch Mint Bloxes", async function () {

      it("should not be able to batch mint with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintReservedBloxes(
            this.testNftOwner,
            [1, 2, 3, 4, 5],
            { from: accounts[9] }
          ),
          "caller is not the minter",
          "should not be able to batch mint with non-minter address",
        )
      })

      it("should not be able to batch mint with exceeding length - reserve", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintReservedBloxes(
            this.testNftOwner,
            Array.from({ length: 21 }, (_, i) => i + 1),
            { from: accounts[2] }
          ),
          "exceed maximum mint amount",
          "should not be able to batch mint when exceeding length",
        )
      })

      it("should not be able to batch mint with mismatch length", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            Array.from({ length: 6 }, (_, i) => i),
            Array(4).fill(1),
            this.USDT.address, // buy with: USDT
            Array(2).fill("100000000000000000000"),
            "200", // tolerance: 2%
          ),
          "unmatched length of array",
          "should not be able to batch mint when length in unmatched",
        )
      })

      it("should not be able to batch mint with exceeding length - public", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            Array.from({ length: 6 }, (_, i) => i),
            Array(6).fill(1),
            this.USDT.address, // buy with: USDT
            Array(6).fill("100000000000000000000"),
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "exceed maximum mint amount",
          "should not be able to batch mint when exceeding length",
        )
      })
    })

    context("Of Setting Maximum Mint Amount", async function () {
      it("should not be able to set public mint amount with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.setMaxPublicMintAmount(10, { from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should not be able to setMaxPublicMintAmount",
        )
      })

      it("should not be able to set reserve mint amount with non-owner address", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.setMaxReserveAmount(10, { from: accounts[9] }),
          "Ownable: caller is not the owner",
          "should not be able to setMaxReserveAmount",
        )
      })
    })
  })

  context("Mint Functionalities", async function () {
    const TEST_BLOX_SUPPLY = 39;
    before(async function () {

      assert.equal(await this.MetabloxV2.bloxSupply(), TEST_BLOX_SUPPLY, "unmatched total supply");
    })
    context("with USDT", async function () {
      const USDT_100 = "100000000000000000000"
      let usdtBalance;
      before("checking USDT allowance", async function () {
        usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
        await this.USDT.approve(this.MetabloxV2.address, USDT_100, {
          from: this.testNftOwner
        })
        assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_100, "unmatched allowance");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.USDT.address, // buy with: USDT
          [USDT_100], // ERC20 token amount: 100 USDT / 10 ** 20
          "200", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct USDT balance", async function () {
        const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
        const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, USDT_100, "unmatched USDT balance");
      });
    })

    context("with WETH", async function () {
      const WETH_100 = "31456432840515884" // 0.03 WETH at price $3179
      let wethBalance;
      before("checking WETH allowance", async function () {
        wethBalance = await this.WETH.balanceOf(this.testNftOwner)
        await this.WETH.approve(this.MetabloxV2.address, WETH_100, {
          from: this.testNftOwner
        })
        assert.equal((await this.WETH.allowance(this.testNftOwner, this.MetabloxV2.address)), WETH_100, "unmatched allowance");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 1], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.WETH.address, // buy with: WETH
          [WETH_100], // ERC20 token amount: 0.03 WETH 
          "100", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct WETH balance", async function () {
        const tokenBalance = await this.WETH.balanceOf(this.testNftOwner)
        const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, WETH_100, "unmatched WETH balance");
      });
    })

    context("with MATIC", async function () {
      const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
      let maticBalance, gasUsed, gasPrice;
      let contractMaticBalance;
      before("checking MATIC allowance", async function () {
        maticBalance = await web3.eth.getBalance(this.testNftOwner)
        contractMaticBalance = await web3.eth.getBalance(this.MetabloxV2.address)
        assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
        assert.equal(contractMaticBalance, 0, "unmatched MATIC balance of Blox contract");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 2], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.WMATIC.address, // buy with: MATIC
          [MATIC_100], // MATIC token amount: 42.958 MATIC
          "100", // tolerance: 1%
          { from: this.testNftOwner, value: MATIC_100 },
        )
        gasUsed = tx.receipt.gasUsed;
        const _tx = await web3.eth.getTransaction(tx.tx);
        gasPrice = _tx.gasPrice;
      })

      it("should have correct MATIC balance of NFT owner", async function () {
        const tokenBalance = await web3.eth.getBalance(this.testNftOwner);
        // const diff = maticBalance - tokenBalance - (gasPrice * gasUsed);
        const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
        const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
        assert.equal(diff.toString(), MATIC_100, "unmatched MATIC balance");
      });
    })

    context("over first grace period", async function () {
      it("should have correct data", async function () {
        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 1, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 1, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 1, "unmatched current grace period");
        assert.notEqual(await this.MetabloxV2.gracePeriodBlockNumber(1), 0, "unmatched grace period amount");
      })

      context("with USDT within grace period", async function () {
        const USDT_100 = "100000000000000000000"
        let usdtBalance;
        before("checking USDT allowance", async function () {
          usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
          await this.USDT.approve(this.MetabloxV2.address, USDT_100, {
            from: this.testNftOwner
          })
          assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_100, "unmatched allowance");
        })

        it("mint blox", async function () {
          tx = await this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber + 3], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            [USDT_100], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          )
        })

        it("should have correct token uri", async function () {
          const tokenURI = await this.MetabloxV2.tokenURI(this.testBloxNumber)
          assert.equal(tokenURI, `${this.testUri}${this.testBloxNumber}`, "unmatched uri");
        });

        it("should have correct Blox balance", async function () {
          const tokenBalance = await this.MetabloxV2.balanceOf(this.testNftOwner)
          assert.equal(tokenBalance, 4, "unmatched Blox balance");
        });

        it("should have correct USDT balance", async function () {
          const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
          const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
          assert.equal(diff, USDT_100, "unmatched USDT balance");
        });
      })
    })
  })

  context("Mint Functionalities after first grace period", async function () {
    context("with USDT", async function () {
      const USDT_150 = "150000000000000000000"
      let usdtBalance;
      before("checking USDT allowance", async function () {
        await this.MetabloxV2.releaseGracePeriod()

        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 1, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 0, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 1, "unmatched current grace period");
        assert.equal(await this.MetabloxV2.gracePeriodBlockNumber(2), 0, "unmatched grace period amount");

        usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
        await this.USDT.approve(this.MetabloxV2.address, USDT_150, {
          from: this.testNftOwner
        })
        assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_150, "unmatched allowance");

      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 4], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.USDT.address, // buy with: USDT
          [USDT_150], // ERC20 token amount: 100 USDT / 10 ** 20
          "200", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct USDT balance", async function () {
        const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
        const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, USDT_150, "unmatched USDT balance");
      });
    })

    context("with WETH", async function () {
      const WETH_100 = "47184649260773820" // 0.03 WETH at price $3179
      let wethBalance;
      before("checking WETH allowance", async function () {
        wethBalance = await this.WETH.balanceOf(this.testNftOwner)
        await this.WETH.approve(this.MetabloxV2.address, WETH_100, {
          from: this.testNftOwner
        })
        assert.equal((await this.WETH.allowance(this.testNftOwner, this.MetabloxV2.address)), WETH_100, "unmatched allowance");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 5], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.WETH.address, // buy with: WETH
          [WETH_100], // ERC20 token amount: 0.03 WETH 
          "100", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct WETH balance", async function () {
        const tokenBalance = await this.WETH.balanceOf(this.testNftOwner)
        const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, WETH_100, "unmatched WETH balance");
      });
    })

    context("entering second grace period", async function () {
      it("should have correct data", async function () {
        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 2, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 1, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 2, "unmatched current grace period");
        assert.notEqual(await this.MetabloxV2.gracePeriodBlockNumber(2), 0, "unmatched grace period amount");
      })

      context("with USDT within second grace period", async function () {
        const USDT_150 = "150000000000000000000"
        let usdtBalance;
        before("checking USDT allowance", async function () {
          usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
          await this.USDT.approve(this.MetabloxV2.address, USDT_150, {
            from: this.testNftOwner
          })
          assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_150, "unmatched allowance");
        })

        it("mint blox", async function () {
          tx = await this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber + 6], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            [USDT_150], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          )
        })

        it("should have correct token uri", async function () {
          const tokenURI = await this.MetabloxV2.tokenURI(this.testBloxNumber)
          assert.equal(tokenURI, `${this.testUri}${this.testBloxNumber}`, "unmatched uri");
        });

        it("should have correct Blox balance", async function () {
          const tokenBalance = await this.MetabloxV2.balanceOf(this.testNftOwner)
          assert.equal(tokenBalance, 7, "unmatched Blox balance");
        });

        it("should have correct USDT balance", async function () {
          const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
          const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
          assert.equal(diff, USDT_150, "unmatched USDT balance");
        });
      })
    })

  })

  context("Reserved blox minting functionalities after second grace period", async function () {
    before(async function () {
      // release second gp
      await this.MetabloxV2.releaseGracePeriod()
      // mint two more blox to make sure that it enters third gp
      for (i = 0; i < 2; i++) {
        await this.MetabloxV2.mintReservedBlox(
          this.testNftOwner,
          this.testBloxNumber + 7 + i, // Blox number
          { from: accounts[2] }
        )
      }
    })

    context("entering third grace period", async function () {
      it("should have correct data", async function () {
        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 3, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 1, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 3, "unmatched current grace period");
        assert.notEqual(await this.MetabloxV2.gracePeriodBlockNumber(3), 0, "unmatched grace period amount");
      })
    })

    context("with USDT within third grace period", async function () {
      const USDT_225 = "225000000000000000000"
      let usdtBalance;
      before("checking USDT allowance", async function () {
        usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
        await this.USDT.approve(this.MetabloxV2.address, USDT_225, {
          from: this.testNftOwner
        })
        assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_225, "unmatched allowance");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 9], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.USDT.address, // buy with: USDT
          [USDT_225], // ERC20 token amount: 100 USDT / 10 ** 20
          "200", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct USDT balance", async function () {
        const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
        const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, USDT_225, "unmatched USDT balance");
      });
    })
  })

  context("Mint Functionalities after third grace period", async function () {
    context("with USDT", async function () {
      const USDT_338 = "338000000000000000000"
      let usdtBalance;
      before("checking USDT allowance", async function () {
        await this.MetabloxV2.releaseGracePeriod()
        usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
        await this.USDT.approve(this.MetabloxV2.address, USDT_338, {
          from: this.testNftOwner
        })
        assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_338, "unmatched allowance");

      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 10], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.USDT.address, // buy with: USDT
          [USDT_338], // ERC20 token amount: 100 USDT / 10 ** 20
          "200", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct USDT balance", async function () {
        const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
        const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, USDT_338, "unmatched USDT balance");
      });
    })

    context("with WETH", async function () {
      const WETH_338 = "106165460836741100" // 0.03 WETH at price $3179
      let wethBalance;
      before("checking WETH allowance", async function () {
        wethBalance = await this.WETH.balanceOf(this.testNftOwner)
        await this.WETH.approve(this.MetabloxV2.address, WETH_338, {
          from: this.testNftOwner
        })
        assert.equal((await this.WETH.allowance(this.testNftOwner, this.MetabloxV2.address)), WETH_338, "unmatched allowance");
      })

      it("mint blox", async function () {
        tx = await this.MetabloxV2.batchMintBloxes(
          [this.testBloxNumber + 11], // Blox number
          [this.testPropertyTier], // property tier: 1
          this.WETH.address, // buy with: WETH
          [WETH_338], // ERC20 token amount: 0.03 WETH 
          "100", // tolerance: 2%
          { from: this.testNftOwner },
        )
      })

      it("should have correct WETH balance", async function () {
        const tokenBalance = await this.WETH.balanceOf(this.testNftOwner)
        const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
        assert.equal(diff, WETH_338, "unmatched WETH balance");
      });
    })

    context("entering fourth grace period", async function () {
      it("should have correct data", async function () {
        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 4, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 1, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 4, "unmatched current grace period");
        assert.notEqual(await this.MetabloxV2.gracePeriodBlockNumber(4), 0, "unmatched grace period amount");
      })

      context("with USDT within second grace period", async function () {
        const USDT_338 = "338000000000000000000"
        let usdtBalance;
        before("checking USDT allowance", async function () {
          usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
          await this.USDT.approve(this.MetabloxV2.address, USDT_338, {
            from: this.testNftOwner
          })
          assert.equal((await this.USDT.allowance(this.testNftOwner, this.MetabloxV2.address)), USDT_338, "unmatched allowance");
        })

        it("mint blox", async function () {
          tx = await this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber + 12], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            [USDT_338], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          )
        })

        it("should have correct USDT balance", async function () {
          const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
          const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
          assert.equal(diff, USDT_338, "unmatched USDT balance");
        });
      })
    })

  })


  context("With All The Bloxes Minted", async function () {
    before(async function () {
      for (let i = 13; i < 30; i++) {
        await truffleAssert.passes(
          this.MetabloxV2.mintReservedBlox(this.testNftOwner, this.testBloxNumber + i, { from: accounts[2] }),
          "should be able to mint the rest of blox for nft owner",
        )
      }

      await truffleAssert.passes(
        this.MetabloxV2.batchMintReservedBloxes(
          this.testNftOwner,
          Array.from({ length: 9 }, (_, i) => this.testBloxNumber + 30 + i),
          { from: accounts[2] },
        ),
        "should be able to batch mint",
      )
    })

    it("should have correct grace period data", async function () {
      assert.equal(await this.MetabloxV2.gracePeriodAmount(), 10, "unmatched grace period amount");
      assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 7, "unmatched grace period remaining");
      assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 4, "unmatched current grace period");
      for (let i = 5; i <= 10; i++) {
        assert.notEqual(await this.MetabloxV2.gracePeriodBlockNumber(i), 0, `unmatched block number of ${i}th grace period`);
      }
    })

    it("should not be marked as all sold", async function () {
      assert.equal(await this.MetabloxV2.allBloxesSold(), false, "unmatched allBloxesSold");
    })

    context("Of Sad Path", async function () {
      it("shouldn't be able to mint", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [this.testBloxNumber], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "exceed maximum blox supply",
          "should not be able to publicly mint after sold out",
        )

        await truffleAssert.reverts(
          this.MetabloxV2.mintReservedBlox(
            this.testNftOwner,
            this.testBloxNumber,
          ),
          "Bloxes are all sold",
          "should not be able to mint after sold out",
        )
      })
    })

    context("Of Grace Period Releasing", async function () {
      it("should have correct base price after each releasing", async function () {
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 338, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 506, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 759, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 1139, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 1709, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 2563, "unmatched base price")
        await this.MetabloxV2.releaseGracePeriod()
        assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 3844, "unmatched base price")
      })
    })
  })

  context("With Landmark Mint", async function () {
    context("with sad path", async function () {
      it("should not be able to mint landmark", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [40], // Blox number
            [this.testPropertyTier], // property tier: 1
            this.USDT.address, // buy with: USDT
            ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "the Blox is a Landmark",
          "should not be able to publicly mint reserved blox",
        )
      })

      it("should not be able to do a batch mint landmark", async function () {
        await truffleAssert.reverts(
          this.MetabloxV2.batchMintBloxes(
            [40, 41, 12345], // Blox number
            Array(3).fill(this.testPropertyTier), // property tier: 1
            this.USDT.address, // buy with: USDT
            Array(3).fill("100000000000000000000"), // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          ),
          "the Blox is a Landmark",
          "should not be able to publicly mint reserved blox",
        )
      })
    })
  })


  context("Total Supply Functionalities", async function () {
    it("should have correct token total supply", async function () {
      const totalSupply = await this.MetabloxV2.totalSupply()
      assert.equal(totalSupply, 39, "unmatched total supply");
    });
  })

  context("With property level", async function () {
    it("should have correct balance of attr - blox 1", async function () {
      for (i = 0; i < 3; i++) {
        const _level = await this.propertyLevelContract.balanceOf(this.testBloxNumber + i, 1);
        const _marks = await this.propertyLevelContract.balanceOf(this.testBloxNumber + i, 2);
        const _slot = await this.propertyLevelContract.balanceOf(this.testBloxNumber + i, 3);
        const _mrStorage = await this.propertyLevelContract.balanceOf(this.testBloxNumber + i, 4);

        assert.equal(_level, 1, "unmatched level");
        assert.equal(_marks, 0, "unmatched level");
        assert.equal(_slot, 1, "unmatched level");
        assert.equal(_mrStorage, 300, "unmatched level");
      }
    });
  })

  context("Withdraw Functionalities", async function () {
    it("should not be able to withdraw with non-benificiary", async function () {
      await truffleAssert.reverts(
        this.MetabloxV2.withdraw(
          { from: this.testNftOwner },
        ),
        "benificiary account only",
        "should be fail to withdraw with non-benefiary account"
      )

    })

    it("should be able to withdraw by benificiary", async function () {
      tx = await this.MetabloxV2.withdraw(
        { from: this.testTokenBenificiary },
      )
    })

    it("should have correct MATIC balance", async function () {
      const contractMaticBalance = await web3.eth.getBalance(this.MetabloxV2.address)
      assert.equal(contractMaticBalance, 0, "unmatched contract balance");
    });
  })

  context("Royalties Functionalities", async function () {
    context("with Opensea contract-level metadata", async function () {
      before(async function () {
        await this.MetabloxV2.setContractURI("http://fake.contrac.uri")
      })

      it("should have correct contract uri", async function () {
        assert.equal(await this.MetabloxV2.contractURI(), "http://fake.contrac.uri", "unmatched contract uri");
      })
    })

    context("with ERC-2981 onchain royalties", async function () {
      before(async function () {
        await this.MetabloxV2.setDefaultRoyalty(this.testTokenBenificiary, 100);
      })

      it("should get default royalty info", async function () {
        const royaltyInfo = await this.MetabloxV2.royaltyInfo(87, "100000000000000000000")
        assert.equal(royaltyInfo[0], this.testTokenBenificiary, "unmatched royalty benificiary");
        assert.equal(royaltyInfo[1], "1000000000000000000", "unmatched royalty amount");
      })

      it("should delete default royalty info and return empty", async function () {
        await this.MetabloxV2.deleteDefaultRoyalty();
        const royaltyInfo = await this.MetabloxV2.royaltyInfo(87, new BN("100000000000000000000"))
        assert.equal(royaltyInfo[0], "0x0000000000000000000000000000000000000000", "unmatched royalty benificiary");
        assert.equal(royaltyInfo[1], 0, "unmatched royalty amount");
      })
    })
  })
});
