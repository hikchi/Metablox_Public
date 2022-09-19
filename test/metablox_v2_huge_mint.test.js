const MetabloxV2 = artifacts.require("MetabloxV2");
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
contract("MetabloxV2 Huge", function (accounts) {
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

    const TEST_BLOX_SUPPLY = 1138;
    await this.MetabloxV2.setTotalBloxSupply(TEST_BLOX_SUPPLY);
    await this.MetabloxV2.setTotalBloxSupplyWithLandmark(TEST_BLOX_SUPPLY + 10);
  });



  context("Mint Functionalities", async function () {
    const TEST_BLOX_SUPPLY = 1138;
    const TEST_BLOX_SUPPLY_DIV_10 = 113;
    before(async function () {
      assert.equal(await this.MetabloxV2.bloxSupply(), TEST_BLOX_SUPPLY, "unmatched total supply");
    })

    context("Batch Mint Functionalities", async function () {
      context("with USDT and mint 3 Bloxes - tier 1", async function () {
        const USDT_100 = "100000000000000000000"
        let usdtBalance;
        let usdtBalances = Array();
        let usdtSpent;
        let randomTier = Array()
        before("checking USDT allowance", async function () {
          randomTier = Array.from({ length: 3 }, () => Math.floor(Math.random() * 5 + 1));
          usdtBalances = randomTier.map(t => (t * parseInt(USDT_100)))
          usdtSpent = usdtBalances.reduce((a, b) => a + b)
          usdtBalance = await this.USDT.balanceOf(this.testNftOwner)
          await this.USDT.approve(this.MetabloxV2.address, "5000000000000000000000", {
            from: this.testNftOwner
          })

        })

        it("mint blox", async function () {
          tx = await this.MetabloxV2.batchMintBloxes(
            Array.from({ length: 3 }, (_, i) => this.testBloxNumber + i),
            Array(3).fill(this.testUri),
            randomTier,
            this.USDT.address, // buy with: USDT
            usdtBalances.map(e => e.toString()), // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          )
        })

        it("should have correct remaining USDT balance", async function () {
          const tokenBalance = await this.USDT.balanceOf(this.testNftOwner)
          const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
          assert.equal(diff, usdtSpent, "unmatched USDT balance");
        });

        it("should have correct total supply", async function () {
          const totalSupply = await this.MetabloxV2.totalSupply()
          assert.equal(totalSupply, 3, "unmatched total supply balance");
        });
      })

      context("with WETH and mint 5 Bloxes - tier 2", async function () {
        const WETH_100 = "31456432840515884"
        const WETH_10000 = "3145643284051588600"
        let wethBalance;
        let wethBalances = Array();
        let wethSpent;
        let randomTier = Array()
        before("checking WETH allowance", async function () {
          randomTier = Array.from({ length: 5 }, () => Math.floor(Math.random() * 5 + 1));
          wethBalances = randomTier.map(t => (t * parseInt(WETH_100)))
          wethSpent = wethBalances.reduce((a, b) => a + b)
          wethBalance = await this.WETH.balanceOf(this.testNftOwner)
          await this.WETH.approve(this.MetabloxV2.address, WETH_10000, {
            from: this.testNftOwner
          })
          assert.equal((await this.WETH.allowance(this.testNftOwner, this.MetabloxV2.address)), WETH_10000, "unmatched allowance");
        })

        it("mint blox", async function () {
          tx = await this.MetabloxV2.batchMintBloxes(
            Array.from({ length: 5 }, (_, i) => this.testBloxNumber + 3 + i),
            Array(5).fill(this.testUri),
            randomTier,
            this.WETH.address, // buy with: USDT
            wethBalances.map(e => e.toString()), // ERC20 token amount: 100 USDT / 10 ** 20
            "200", // tolerance: 2%
            { from: this.testNftOwner },
          )
        })

        it.skip("should have correct WETH balance", async function () {
          const tokenBalance = await this.WETH.balanceOf(this.testNftOwner)
          const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
          assert.equal(diff, wethSpent, "unmatched WETH balance");
        });

        it("should have correct total supply", async function () {
          const totalSupply = await this.MetabloxV2.totalSupply()
          assert.equal(totalSupply, 8, "unmatched total supply balance");
        });
      })

      context("with WMATIC and mint 5 Bloxes - tier 2", async function () {
        const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
        let maticBalance;
        let gasUsed, gasPrice;
        let arrMaticShouldBeSpent = Array();
        let totalMaticShouldBeSpent;
        let randomTier = Array()
        before("checking MATIC allowance", async function () {
          randomTier = Array.from({ length: 5 }, () => Math.floor(Math.random() * 5 + 1));
          arrMaticShouldBeSpent = randomTier.map(t => new BN(MATIC_100).mul(new BN(t)));
          totalMaticShouldBeSpent = arrMaticShouldBeSpent.reduce((a, b) => a.add(b))

          maticBalance = await web3.eth.getBalance(this.testNftOwner)
          contractMaticBalance = await web3.eth.getBalance(this.MetabloxV2.address)
          assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
          assert.equal(contractMaticBalance, 0, "unmatched MATIC balance of Blox contract");
        })

        it("mint blox", async function () {
          console.log(Array.from({ length: 5 }, (_, i) => this.testBloxNumber + 8 + i)),
          tx = await this.MetabloxV2.batchMintBloxes(
            Array.from({ length: 5 }, (_, i) => this.testBloxNumber + 8 + i),
            Array(5).fill(this.testUri),
            randomTier,
            this.WMATIC.address, // buy with: MATIC
            arrMaticShouldBeSpent,
            "200", // tolerance: 2%
            { from: this.testNftOwner, value: totalMaticShouldBeSpent },
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
          assert.equal(diff.toString(), totalMaticShouldBeSpent, "unmatched MATIC balance");
        });

        it("should have correct total supply", async function () {
          const totalSupply = await this.MetabloxV2.totalSupply()
          assert.equal(totalSupply, 13, "unmatched total supply balance");
        });
      })
    })

    context("With All The Bloxes Minted", async function () {
      before(async function () {
        let mintCount = 13
        let gpCount = 0
        for (let i = mintCount; i < TEST_BLOX_SUPPLY; i++) {
          const tx = await this.MetabloxV2.mintReservedBlox(this.testNftOwner, this.testBloxNumber + i, this.testUri)
          console.log({ bloxId: this.testBloxNumber + i })
          mintCount++

          if (mintCount == TEST_BLOX_SUPPLY_DIV_10) {
            mintCount = 0
            if (gpCount >= 10) continue;
            else gpCount++
            truffleAssert.eventEmitted(tx, 'EnteringGracePeriod', (ev) => {
              assert.equal(ev._addr, this.testNftOwner, "unmatched from address")
              assert.equal(ev._gracePeriod, gpCount, "unmatched gp number")
              return true
            }, 'EnteringGracePeriod fails');
          }
        }
      })

      it("should have correct grace period data", async function () {
        assert.equal(await this.MetabloxV2.gracePeriodAmount(), 10, "unmatched grace period amount");
        assert.equal(await this.MetabloxV2.gracePeriodRemaining(), 10, "unmatched grace period remaining");
        assert.equal(await this.MetabloxV2.gracePeriodCurrent(), 1, "unmatched current grace period");
      })

      it("should mark as all sold", async function () {
        assert.equal(await this.MetabloxV2.allBloxesSold(), false, "unmatched allBloxesSold");
      })

      context.skip("Of Sad Path", async function () {
        it("shouldn't be able to mint", async function () {
          await truffleAssert.reverts(
            this.MetabloxV2.batchMintBlox(
              [this.testBloxNumber], // Blox number
              [this.testUri], // uri: test uri
              [this.testPropertyTier], // property tier: 1
              this.USDT.address, // buy with: USDT
              ["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
              "200", // tolerance: 2%
              { from: this.testNftOwner },
            ),
            "Bloxes are all sold",
            "should not be able to publicly mint after sold out",
          )

          await truffleAssert.reverts(
            this.MetabloxV2.mintReservedBlox(
              this.testNftOwner,
              this.testBloxNumber,
              this.testUri,
            ),
            "Bloxes are all sold",
            "should not be able to mint after sold out",
          )
        })
      })

      context("Of Grace Period Releasing", async function () {
        it("should have correct base price after each releasing", async function () {
          assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 100, "unmatched base price")
          await this.MetabloxV2.releaseGracePeriod()
          assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 150, "unmatched base price")
          await this.MetabloxV2.releaseGracePeriod()
          assert.equal(await this.MetabloxV2.getBasePriceFromPropertyTier(1), 225, "unmatched base price")
          await this.MetabloxV2.releaseGracePeriod()
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

  })
})