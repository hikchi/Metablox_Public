const Metablox = artifacts.require("MetabloxEverywhere");
const MetabloxMemories = artifacts.require("MetabloxMemories");
const TestToken = artifacts.require("TestToken");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

// const TestChainlinkMatic = artifacts.require("TestMaticUsdtChainlink");
// const TestChainlinkWeth = artifacts.require("TestWethUsdtChainlink");

const truffleAssert = require('truffle-assertions');

const BN = require('bn.js');


const { deployProxy } = require('@openzeppelin/truffle-upgrades');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract.only("Metablox Everywhere Test", function (accounts) {
	before(async function () {
		// MB instances

		// roles
		this.nftOwner = accounts[0];
		this.nftMinter = accounts[1];
		this.nftCapper = accounts[2];
		this.nftPaymentTokenBeneficiary = accounts[3];
		this.nftRoyaltyTokenBeneficiary = accounts[4];
		// country -> state -> city identifier
		this.country = "US";
		this.state = "WA";
		this.city = "Seattle";
		this.uriSuffix = "seattle/";
		// misc
		this.baseUri = "https://dev.metablox.co/api/v1/tokenuri/";
		this.bloxNumber = 1;
		this.propertyTier = 1;

		// deploy token to be tested
		const ERC_INIT_SUPPLY = "1000000000000000000000000"; // 10 ** 24
		this.USDT = await TestToken.new(ERC_INIT_SUPPLY);
		this.WETH = await TestToken.new(ERC_INIT_SUPPLY);
		this.WMATIC = await TestToken.new(ERC_INIT_SUPPLY);

		// deploy chainlink to be tested
		// this.chainlinkWeth = await TestChainlinkWeth.new();
		// this.chainlinkMatic = await TestChainlinkMatic.new();
		this.chainlinkWeth = this.USDT
		this.chainlinkMatic = this.USDT
		// Deploy a new property tier contract
		this.propertyTierContract = await PropertyTier.new();
		// Deploy a new property level contraxt
		this.propertyLevelContract = await PropertyLevel.new();
		await this.propertyLevelContract.mintBatch(
			[1, 2, 3, 4],
			["level", "memory marks", "memory slot", "metarent storage"],
			["level", "memory marks", "memory slot", "metarent storage"],
			["level", "memory marks", "memory slot", "metarent storage"],
		);
		// Deploy memories contract, and set with Metablox contract address
		// to-do
		// this.metabloxMemories = await MetabloxMemories.new()
		// await this.metabloxMemories.setBloxContract(this.Metablox.address);
		// Deploy controller 
		// this.metabloxControllerContract = await MetabloxController.new(this.Metablox.address, this.metabloxMemories.address, this.propertyLevelContract.address)
		// initialize metablox contract
		this.Metablox = await Metablox.new();
		await this.Metablox.initialize(
			this.propertyTierContract.address,
			[this.USDT.address, this.WETH.address, this.WMATIC.address, this.chainlinkWeth.address, this.chainlinkMatic.address],
		);
		// this.Metablox = await deployProxy(Metablox, [
		// 	this.propertyTierContract.address,
		// 	[this.USDT.address, this.WETH.address, this.WMATIC.address, this.chainlinkWeth.address, this.chainlinkMatic.address],
		// ]);
		// set base uri
		await this.Metablox.setBaseURI(this.baseUri);
		// create Blox
		await this.Metablox.register(
			this.country,
			this.state,
			this.city,
			this.uriSuffix,
			[this.nftMinter, this.nftCapper, this.nftPaymentTokenBeneficiary, this.nftRoyaltyTokenBeneficiary],
		)

		const TEST_BLOX_SUPPLY = 20
		await this.Metablox.setBloxSupply(
			this.country,
			this.state,
			this.city,
			TEST_BLOX_SUPPLY
		);
		await this.Metablox.setBloxSupplyWithLandmark(
			this.country,
			this.state,
			this.city,
			TEST_BLOX_SUPPLY + 10,
		);
		await this.Metablox.setLandmarkNumber(
			this.country,
			this.state,
			this.city,
			Array.from({ length: 10 }, (_, i) => TEST_BLOX_SUPPLY + 1 + i), true
		);

		// Set up for property level
		const ATTACH_ROLE = await this.propertyLevelContract.ATTACH_ROLE();
		await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.Metablox.address);
		assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.Metablox.address), true, "metablox contract is not ERC3664 attacher");
		// pending controllers
		// await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.metabloxControllerContract.address);
		// assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.metabloxControllerContract.address), true, "metablox controller is not ERC3664 attacher");
	});

	context.only("Contract Initialization", async function () {
		context("with everywhere contract", async function () {
			it("should have correct data", async function () {
				assert.equal((await this.Metablox.name()).toString(), "Metablox", "unmatched name");
				assert.equal((await this.Metablox.symbol()).toString(), "Blox", "unmatched symbol");
				assert.equal((await this.Metablox.propertyTierContractAddress()), this.propertyTierContract.address, "unmatched property tier address");
			});

			it("should be approved by Opensea by default", async function () {
				assert.equal(await this.Metablox.isApprovedForAll(this.nftOwner, "0x58807baD0B376efc12F5AD86aAc70E78ed67deaE"), true, "unmatched Opensea approval status");
			})
		})

		context("with Blox", async function () {
			it("should have correct authorities", async function () {
				const authorities = await this.Metablox.getAuthorities(this.country, this.state, this.city);
				console.log({ authorities });
				// assert.equal((await this.Metablox.beneficiary()), this.testTokenBenificiary, "unmatched beneficiary");
			});

			it("should have correct authorities", async function () {
				const mintLimitation = await this.Metablox.getMintLimitation(this.country, this.state, this.city);
				console.log({ mintLimitation });
				// assert.equal((await this.Metablox.allBloxesSold()), false, "unmatched allBloxesSold");
				// assert.equal((await this.Metablox.maxPublicMintAmount()), 5, "unmatched maximum public mint amount");
				// assert.equal((await this.Metablox.maxReserveMintAmount()), 20, "unmatched maximum reserve mint amount");
			});

		})
	})

	context("Sad Path", async function () {
		context("Of Reserved Blox", async function () {
			before(async function () {
				await truffleAssert.reverts(
					this.Metablox.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), true, { from: accounts[9] }),
					"caller is not the capper",
					"should fail to set reserved blox with non-capper address",
				)
				await this.Metablox.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), true, { from: accounts[3] });
			})

			it("should successfully flip reserved blox", async function () {
				for (i = 1; i <= 10; i++) {
					assert.equal(await this.Metablox.cappedBlox(i), true, `unmatched whitelist of index ${i}`);
				}
			})

			it("should not be able to publicly mint reserved blox", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[this.bloxNumber], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"the Blox is capped",
					"should not be able to publicly mint reserved blox",
				)
			})

			after(async function () {
				await this.Metablox.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), false, { from: accounts[3] })
			})
		})

		context("Of Capped Blox", async function () {
			before(async function () {
				await truffleAssert.reverts(
					this.Metablox.capBloxBeforePayment(1, { from: accounts[9] }),
					"caller is not the capper",
					"should fail to set capped blox with non-capper address",
				)
				for (i = 1; i <= 10; i++) {
					await this.Metablox.capBloxBeforePayment(i, { from: accounts[3] });
				}
			})

			it("should successfully flip capped blox", async function () {
				for (i = 1; i <= 10; i++) {
					assert.equal(await this.Metablox.cappedBlox(i), true, `unmatched capped blox of id ${i}`);
				}
			})

			it("should not be able to publicly mint capped blox", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[this.bloxNumber], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"the Blox is capped",
					"should not be able to publicly mint reserved blox",
				)
			})

			after(async function () {
				for (i = 1; i <= 10; i++) {
					await this.Metablox.setCappedBloxes(Array.from({ length: 10 }, (_, i) => i + 1), false, { from: accounts[3] })
				}
			})
		})

		context("Of Pause", async function () {
			before(async function () {
				await truffleAssert.reverts(
					this.Metablox.pause({ from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should fail to pause with non-owner address",
				)
				await truffleAssert.reverts(
					this.Metablox.unpause({ from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should fail to unpause with non-owner address",
				)
				// pause
				await this.Metablox.pause()
			})

			it("should not be able to publicly mint reserved blox", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[this.bloxNumber], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"Pausable: paused",
					"should not be able to publicly mint reserved blox in pause status",
				)
			})

			after(async function () {
				await this.Metablox.unpause()
			})
		})

		context("Of Others", async function () {
			it("should not be able to set blox total supply with non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setTotalBloxSupply(39, { from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should not be able to set blox total supply by non-owner address",
				)
			})

			it("should not be able to set blox total supply with non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setTotalBloxSupplyWithLandmark(49, { from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should not be able to set blox total supply with landmark by non-owner address",
				)
			})

			it("should not be able to mint with non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.mintReservedBlox(
						this.nftOwner,
						this.bloxNumber,
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
					this.Metablox.batchMintReservedBloxes(
						this.nftOwner,
						[1, 2, 3, 4, 5],
						{ from: accounts[9] }
					),
					"caller is not the minter",
					"should not be able to batch mint with non-minter address",
				)
			})

			it("should not be able to batch mint with exceeding length - reserve", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintReservedBloxes(
						this.nftOwner,
						Array.from({ length: 21 }, (_, i) => i + 1),
						{ from: accounts[2] }
					),
					"exceed maximum mint amount",
					"should not be able to batch mint when exceeding length",
				)
			})

			it("should not be able to batch mint with mismatch length", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
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
					this.Metablox.batchMintBloxes(
						Array.from({ length: 6 }, (_, i) => i),
						Array(6).fill(1),
						this.USDT.address, // buy with: USDT
						Array(6).fill("100000000000000000000"),
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"exceed maximum mint amount",
					"should not be able to batch mint when exceeding length",
				)
			})
		})

		context("Of Setting Maximum Mint Amount", async function () {
			it("should not be able to set public mint amount with non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setMaxPublicMintAmount(10, { from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should not be able to setMaxPublicMintAmount",
				)
			})

			it("should not be able to set reserve mint amount with non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setMaxReserveAmount(10, { from: accounts[9] }),
					"Ownable: caller is not the owner",
					"should not be able to setMaxReserveAmount",
				)
			})
		})
	})

	context("Mint Functionalities", async function () {
		const TEST_BLOX_SUPPLY = 39;
		before(async function () {

			assert.equal(await this.Metablox.bloxSupply(), TEST_BLOX_SUPPLY, "unmatched total supply");
		})
		context("with USDT", async function () {
			const USDT_100 = "100000000000000000000"
			let usdtBalance;
			before("checking USDT allowance", async function () {
				usdtBalance = await this.USDT.balanceOf(this.nftOwner)
				await this.USDT.approve(this.Metablox.address, USDT_100, {
					from: this.nftOwner
				})
				assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_100, "unmatched allowance");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber], // Blox number
					[this.propertyTier], // property tier: 1
					this.USDT.address, // buy with: USDT
					[USDT_100], // ERC20 token amount: 100 USDT / 10 ** 20
					"200", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct USDT balance", async function () {
				const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
				const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, USDT_100, "unmatched USDT balance");
			});
		})

		context("with WETH", async function () {
			const WETH_100 = "31456432840515884" // 0.03 WETH at price $3179
			let wethBalance;
			before("checking WETH allowance", async function () {
				wethBalance = await this.WETH.balanceOf(this.nftOwner)
				await this.WETH.approve(this.Metablox.address, WETH_100, {
					from: this.nftOwner
				})
				assert.equal((await this.WETH.allowance(this.nftOwner, this.Metablox.address)), WETH_100, "unmatched allowance");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 1], // Blox number
					[this.propertyTier], // property tier: 1
					this.WETH.address, // buy with: WETH
					[WETH_100], // ERC20 token amount: 0.03 WETH 
					"100", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct WETH balance", async function () {
				const tokenBalance = await this.WETH.balanceOf(this.nftOwner)
				const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, WETH_100, "unmatched WETH balance");
			});
		})

		context("with MATIC", async function () {
			const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
			let maticBalance, gasUsed, gasPrice;
			let contractMaticBalance;
			before("checking MATIC allowance", async function () {
				maticBalance = await web3.eth.getBalance(this.nftOwner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				assert.equal(contractMaticBalance, 0, "unmatched MATIC balance of Blox contract");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 2], // Blox number
					[this.propertyTier], // property tier: 1
					this.WMATIC.address, // buy with: MATIC
					[MATIC_100], // MATIC token amount: 42.958 MATIC
					"100", // tolerance: 1%
					{ from: this.nftOwner, value: MATIC_100 },
				)
				gasUsed = tx.receipt.gasUsed;
				const _tx = await web3.eth.getTransaction(tx.tx);
				gasPrice = _tx.gasPrice;
			})

			it("should have correct MATIC balance of NFT owner", async function () {
				const tokenBalance = await web3.eth.getBalance(this.nftOwner);
				// const diff = maticBalance - tokenBalance - (gasPrice * gasUsed);
				const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
				const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
				assert.equal(diff.toString(), MATIC_100, "unmatched MATIC balance");
			});
		})

		context("over first grace period", async function () {
			it("should have correct data", async function () {
				assert.equal(await this.Metablox.gracePeriodAmount(), 1, "unmatched grace period amount");
				assert.equal(await this.Metablox.gracePeriodRemaining(), 1, "unmatched grace period remaining");
				assert.equal(await this.Metablox.gracePeriodCurrent(), 1, "unmatched current grace period");
				assert.notEqual(await this.Metablox.gracePeriodBlockNumber(1), 0, "unmatched grace period amount");
			})

			context("with USDT within grace period", async function () {
				const USDT_100 = "100000000000000000000"
				let usdtBalance;
				before("checking USDT allowance", async function () {
					usdtBalance = await this.USDT.balanceOf(this.nftOwner)
					await this.USDT.approve(this.Metablox.address, USDT_100, {
						from: this.nftOwner
					})
					assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_100, "unmatched allowance");
				})

				it("mint blox", async function () {
					tx = await this.Metablox.batchMintBloxes(
						[this.bloxNumber + 3], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						[USDT_100], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					)
				})

				it("should have correct token uri", async function () {
					const tokenURI = await this.Metablox.tokenURI(this.bloxNumber)
					assert.equal(tokenURI, `${this.baseUri}${this.bloxNumber}`, "unmatched uri");
				});

				it("should have correct Blox balance", async function () {
					const tokenBalance = await this.Metablox.balanceOf(this.nftOwner)
					assert.equal(tokenBalance, 4, "unmatched Blox balance");
				});

				it("should have correct USDT balance", async function () {
					const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
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
				await this.Metablox.releaseGracePeriod()

				assert.equal(await this.Metablox.gracePeriodAmount(), 1, "unmatched grace period amount");
				assert.equal(await this.Metablox.gracePeriodRemaining(), 0, "unmatched grace period remaining");
				assert.equal(await this.Metablox.gracePeriodCurrent(), 1, "unmatched current grace period");
				assert.equal(await this.Metablox.gracePeriodBlockNumber(2), 0, "unmatched grace period amount");

				usdtBalance = await this.USDT.balanceOf(this.nftOwner)
				await this.USDT.approve(this.Metablox.address, USDT_150, {
					from: this.nftOwner
				})
				assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_150, "unmatched allowance");

			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 4], // Blox number
					[this.propertyTier], // property tier: 1
					this.USDT.address, // buy with: USDT
					[USDT_150], // ERC20 token amount: 100 USDT / 10 ** 20
					"200", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct USDT balance", async function () {
				const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
				const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, USDT_150, "unmatched USDT balance");
			});
		})

		context("with WETH", async function () {
			const WETH_100 = "47184649260773820" // 0.03 WETH at price $3179
			let wethBalance;
			before("checking WETH allowance", async function () {
				wethBalance = await this.WETH.balanceOf(this.nftOwner)
				await this.WETH.approve(this.Metablox.address, WETH_100, {
					from: this.nftOwner
				})
				assert.equal((await this.WETH.allowance(this.nftOwner, this.Metablox.address)), WETH_100, "unmatched allowance");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 5], // Blox number
					[this.propertyTier], // property tier: 1
					this.WETH.address, // buy with: WETH
					[WETH_100], // ERC20 token amount: 0.03 WETH 
					"100", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct WETH balance", async function () {
				const tokenBalance = await this.WETH.balanceOf(this.nftOwner)
				const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, WETH_100, "unmatched WETH balance");
			});
		})

		context("entering second grace period", async function () {
			it("should have correct data", async function () {
				assert.equal(await this.Metablox.gracePeriodAmount(), 2, "unmatched grace period amount");
				assert.equal(await this.Metablox.gracePeriodRemaining(), 1, "unmatched grace period remaining");
				assert.equal(await this.Metablox.gracePeriodCurrent(), 2, "unmatched current grace period");
				assert.notEqual(await this.Metablox.gracePeriodBlockNumber(2), 0, "unmatched grace period amount");
			})

			context("with USDT within second grace period", async function () {
				const USDT_150 = "150000000000000000000"
				let usdtBalance;
				before("checking USDT allowance", async function () {
					usdtBalance = await this.USDT.balanceOf(this.nftOwner)
					await this.USDT.approve(this.Metablox.address, USDT_150, {
						from: this.nftOwner
					})
					assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_150, "unmatched allowance");
				})

				it("mint blox", async function () {
					tx = await this.Metablox.batchMintBloxes(
						[this.bloxNumber + 6], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						[USDT_150], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					)
				})

				it("should have correct token uri", async function () {
					const tokenURI = await this.Metablox.tokenURI(this.bloxNumber)
					assert.equal(tokenURI, `${this.baseUri}${this.bloxNumber}`, "unmatched uri");
				});

				it("should have correct Blox balance", async function () {
					const tokenBalance = await this.Metablox.balanceOf(this.nftOwner)
					assert.equal(tokenBalance, 7, "unmatched Blox balance");
				});

				it("should have correct USDT balance", async function () {
					const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
					const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
					assert.equal(diff, USDT_150, "unmatched USDT balance");
				});
			})
		})

	})

	context("Reserved blox minting functionalities after second grace period", async function () {
		before(async function () {
			// release second gp
			await this.Metablox.releaseGracePeriod()
			// mint two more blox to make sure that it enters third gp
			for (i = 0; i < 2; i++) {
				await this.Metablox.mintReservedBlox(
					this.nftOwner,
					this.bloxNumber + 7 + i, // Blox number
					{ from: accounts[2] }
				)
			}
		})

		context("entering third grace period", async function () {
			it("should have correct data", async function () {
				assert.equal(await this.Metablox.gracePeriodAmount(), 3, "unmatched grace period amount");
				assert.equal(await this.Metablox.gracePeriodRemaining(), 1, "unmatched grace period remaining");
				assert.equal(await this.Metablox.gracePeriodCurrent(), 3, "unmatched current grace period");
				assert.notEqual(await this.Metablox.gracePeriodBlockNumber(3), 0, "unmatched grace period amount");
			})
		})

		context("with USDT within third grace period", async function () {
			const USDT_225 = "225000000000000000000"
			let usdtBalance;
			before("checking USDT allowance", async function () {
				usdtBalance = await this.USDT.balanceOf(this.nftOwner)
				await this.USDT.approve(this.Metablox.address, USDT_225, {
					from: this.nftOwner
				})
				assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_225, "unmatched allowance");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 9], // Blox number
					[this.propertyTier], // property tier: 1
					this.USDT.address, // buy with: USDT
					[USDT_225], // ERC20 token amount: 100 USDT / 10 ** 20
					"200", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct USDT balance", async function () {
				const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
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
				await this.Metablox.releaseGracePeriod()
				usdtBalance = await this.USDT.balanceOf(this.nftOwner)
				await this.USDT.approve(this.Metablox.address, USDT_338, {
					from: this.nftOwner
				})
				assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_338, "unmatched allowance");

			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 10], // Blox number
					[this.propertyTier], // property tier: 1
					this.USDT.address, // buy with: USDT
					[USDT_338], // ERC20 token amount: 100 USDT / 10 ** 20
					"200", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct USDT balance", async function () {
				const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
				const diff = (new BN(usdtBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, USDT_338, "unmatched USDT balance");
			});
		})

		context("with WETH", async function () {
			const WETH_338 = "106165460836741100" // 0.03 WETH at price $3179
			let wethBalance;
			before("checking WETH allowance", async function () {
				wethBalance = await this.WETH.balanceOf(this.nftOwner)
				await this.WETH.approve(this.Metablox.address, WETH_338, {
					from: this.nftOwner
				})
				assert.equal((await this.WETH.allowance(this.nftOwner, this.Metablox.address)), WETH_338, "unmatched allowance");
			})

			it("mint blox", async function () {
				tx = await this.Metablox.batchMintBloxes(
					[this.bloxNumber + 11], // Blox number
					[this.propertyTier], // property tier: 1
					this.WETH.address, // buy with: WETH
					[WETH_338], // ERC20 token amount: 0.03 WETH 
					"100", // tolerance: 2%
					{ from: this.nftOwner },
				)
			})

			it("should have correct WETH balance", async function () {
				const tokenBalance = await this.WETH.balanceOf(this.nftOwner)
				const diff = (new BN(wethBalance, 10).sub(new BN(tokenBalance, 10))).toString(10);
				assert.equal(diff, WETH_338, "unmatched WETH balance");
			});
		})

		context("entering fourth grace period", async function () {
			it("should have correct data", async function () {
				assert.equal(await this.Metablox.gracePeriodAmount(), 4, "unmatched grace period amount");
				assert.equal(await this.Metablox.gracePeriodRemaining(), 1, "unmatched grace period remaining");
				assert.equal(await this.Metablox.gracePeriodCurrent(), 4, "unmatched current grace period");
				assert.notEqual(await this.Metablox.gracePeriodBlockNumber(4), 0, "unmatched grace period amount");
			})

			context("with USDT within second grace period", async function () {
				const USDT_338 = "338000000000000000000"
				let usdtBalance;
				before("checking USDT allowance", async function () {
					usdtBalance = await this.USDT.balanceOf(this.nftOwner)
					await this.USDT.approve(this.Metablox.address, USDT_338, {
						from: this.nftOwner
					})
					assert.equal((await this.USDT.allowance(this.nftOwner, this.Metablox.address)), USDT_338, "unmatched allowance");
				})

				it("mint blox", async function () {
					tx = await this.Metablox.batchMintBloxes(
						[this.bloxNumber + 12], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						[USDT_338], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					)
				})

				it("should have correct USDT balance", async function () {
					const tokenBalance = await this.USDT.balanceOf(this.nftOwner)
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
					this.Metablox.mintReservedBlox(this.nftOwner, this.bloxNumber + i, { from: accounts[2] }),
					"should be able to mint the rest of blox for nft owner",
				)
			}

			await truffleAssert.passes(
				this.Metablox.batchMintReservedBloxes(
					this.nftOwner,
					Array.from({ length: 9 }, (_, i) => this.bloxNumber + 30 + i),
					{ from: accounts[2] },
				),
				"should be able to batch mint",
			)
		})

		it("should have correct grace period data", async function () {
			assert.equal(await this.Metablox.gracePeriodAmount(), 10, "unmatched grace period amount");
			assert.equal(await this.Metablox.gracePeriodRemaining(), 7, "unmatched grace period remaining");
			assert.equal(await this.Metablox.gracePeriodCurrent(), 4, "unmatched current grace period");
			for (let i = 5; i <= 10; i++) {
				assert.notEqual(await this.Metablox.gracePeriodBlockNumber(i), 0, `unmatched block number of ${i}th grace period`);
			}
		})

		it("should not be marked as all sold", async function () {
			assert.equal(await this.Metablox.allBloxesSold(), false, "unmatched allBloxesSold");
		})

		context("Of Sad Path", async function () {
			it("shouldn't be able to mint", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[this.bloxNumber], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"exceed maximum blox supply",
					"should not be able to publicly mint after sold out",
				)

				await truffleAssert.reverts(
					this.Metablox.mintReservedBlox(
						this.nftOwner,
						this.bloxNumber,
					),
					"Bloxes are all sold",
					"should not be able to mint after sold out",
				)
			})
		})

		context("Of Grace Period Releasing", async function () {
			it("should have correct base price after each releasing", async function () {
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 338, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 506, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 759, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 1139, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 1709, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 2563, "unmatched base price")
				await this.Metablox.releaseGracePeriod()
				assert.equal(await this.Metablox.getBasePriceFromPropertyTier(1), 3844, "unmatched base price")
			})
		})
	})

	context("With Landmark Mint", async function () {
		context("with sad path", async function () {
			it("should not be able to mint landmark", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[40], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"the Blox is a Landmark",
					"should not be able to publicly mint reserved blox",
				)
			})

			it("should not be able to do a batch mint landmark", async function () {
				await truffleAssert.reverts(
					this.Metablox.batchMintBloxes(
						[40, 41, 12345], // Blox number
						Array(3).fill(this.propertyTier), // property tier: 1
						this.USDT.address, // buy with: USDT
						Array(3).fill("100000000000000000000"), // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.nftOwner },
					),
					"the Blox is a Landmark",
					"should not be able to publicly mint reserved blox",
				)
			})
		})
	})


	context("Total Supply Functionalities", async function () {
		it("should have correct token total supply", async function () {
			const totalSupply = await this.Metablox.totalSupply()
			assert.equal(totalSupply, 39, "unmatched total supply");
		});
	})

	context("With property level", async function () {
		it("should have correct balance of attr - blox 1", async function () {
			for (i = 0; i < 3; i++) {
				const _level = await this.propertyLevelContract.balanceOf(this.bloxNumber + i, 1);
				const _marks = await this.propertyLevelContract.balanceOf(this.bloxNumber + i, 2);
				const _slot = await this.propertyLevelContract.balanceOf(this.bloxNumber + i, 3);
				const _mrStorage = await this.propertyLevelContract.balanceOf(this.bloxNumber + i, 4);

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
				this.Metablox.withdraw(
					{ from: this.nftOwner },
				),
				"benificiary account only",
				"should be fail to withdraw with non-benefiary account"
			)

		})

		it("should be able to withdraw by benificiary", async function () {
			tx = await this.Metablox.withdraw(
				{ from: this.testTokenBenificiary },
			)
		})

		it("should have correct MATIC balance", async function () {
			const contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
			assert.equal(contractMaticBalance, 0, "unmatched contract balance");
		});
	})

	context("Royalties Functionalities", async function () {
		context("with Opensea contract-level metadata", async function () {
			before(async function () {
				await this.Metablox.setContractURI("http://fake.contrac.uri")
			})

			it("should have correct contract uri", async function () {
				assert.equal(await this.Metablox.contractURI(), "http://fake.contrac.uri", "unmatched contract uri");
			})
		})

		context("with ERC-2981 onchain royalties", async function () {
			before(async function () {
				await this.Metablox.setDefaultRoyalty(this.testTokenBenificiary, 100);
			})

			it("should get default royalty info", async function () {
				const royaltyInfo = await this.Metablox.royaltyInfo(87, "100000000000000000000")
				assert.equal(royaltyInfo[0], this.testTokenBenificiary, "unmatched royalty benificiary");
				assert.equal(royaltyInfo[1], "1000000000000000000", "unmatched royalty amount");
			})

			it("should delete default royalty info and return empty", async function () {
				await this.Metablox.deleteDefaultRoyalty();
				const royaltyInfo = await this.Metablox.royaltyInfo(87, new BN("100000000000000000000"))
				assert.equal(royaltyInfo[0], "0x0000000000000000000000000000000000000000", "unmatched royalty benificiary");
				assert.equal(royaltyInfo[1], 0, "unmatched royalty amount");
			})
		})
	})
});
