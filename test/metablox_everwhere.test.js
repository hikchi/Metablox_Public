const Metablox = artifacts.require("MetabloxEverywhere");
const MetabloxMemories = artifacts.require("MetabloxMemories");
const TestToken = artifacts.require("TestToken");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

const TestChainlinkMatic = artifacts.require("TestMaticUsdtChainlink");
const TestChainlinkWeth = artifacts.require("TestWethUsdtChainlink");

const truffleAssert = require('truffle-assertions');

const BN = require('bn.js');

const { assert } = require('chai');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract.only("Metablox Everywhere Test", function (accounts) {
	before(async function () {
		// roles
		this.owner = accounts[0];
		this.minter = accounts[1];
		this.capper = accounts[2];
		this.paymentTokenBeneficiary = accounts[3];
		this.dummyReceiver = accounts[9];
		// country -> state -> city identifier
		this.country = "US";
		this.state = "WA";
		this.city = "Seattle";
		this.uriSuffix = "seattle/";
		// misc
		this.baseURI = "https://dev.metablox.co/api/v1/tokenuri/";
		this.contractURI = "https://dev.metablox.co/api/v1/royalty/opensea/metadata/";
		this.bloxNumber = 1;
		this.propertyTier = 1;

		// deploy token to be tested
		const ERC_INIT_SUPPLY = "1000000000000000000000000"; // 10 ** 24
		this.USDT = await TestToken.new(ERC_INIT_SUPPLY);
		this.WETH = await TestToken.new(ERC_INIT_SUPPLY);
		this.WMATIC = await TestToken.new(ERC_INIT_SUPPLY);

		// deploy chainlink to be tested
		this.chainlinkWeth = await TestChainlinkWeth.new();
		this.chainlinkMatic = await TestChainlinkMatic.new();
		// Deploy a new property tier contract
		this.propertyTierContract = await PropertyTier.new();
		// Deploy a new property level contraxt
		this.propertyLevelContract = await PropertyLevel.new();
		// Deploy a new memory contraxt
		this.memoryContract = await MetabloxMemories.new();
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
		// MB instances
		this.Metablox = await Metablox.new();
		await this.Metablox.initialize(
			this.propertyTierContract.address,
			this.propertyLevelContract.address,
			this.memoryContract.address,
			[this.USDT.address, this.WMATIC.address, this.WETH.address, this.chainlinkMatic.address, this.chainlinkWeth.address],
			[this.minter, this.capper, this.paymentTokenBeneficiary],
		);
		// this.Metablox = await deployProxy(Metablox, [
		// 	this.propertyTierContract.address,
		// 	this.propertyLevelContract.address,
		// 	this.memoryContract.address,
		// 	[this.USDT.address, this.WMATIC.address, this.WETH.address, this.chainlinkMatic.address, this.chainlinkWeth.address],
		// 	[this.minter, this.capper, this.paymentTokenBeneficiary],
		// ]);
		// set base uri
		await this.Metablox.setBaseURI(this.baseURI);
		await this.Metablox.setContractURI(this.contractURI);
		// create Blox
		await this.Metablox.register(
			this.country,
			this.state,
			this.city,
			this.uriSuffix,
			{ from: this.owner }
		)

		this.identifier = await this.Metablox.getIdentifier(this.country, this.state, this.city);
		this.TEST_BLOX_SUPPLY = 30 // 20 + 10 Landmark
		await this.Metablox.setBloxSupply(
			this.identifier,
			this.TEST_BLOX_SUPPLY,
		);

		await this.Metablox.setLandmarkNumber(
			this.identifier,
			Array.from({ length: 10 }, (_, i) => this.TEST_BLOX_SUPPLY - 1 - i), true
		);

		// Set up for property level
		const ATTACH_ROLE = await this.propertyLevelContract.ATTACH_ROLE();
		await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.Metablox.address);
		assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.Metablox.address), true, "metablox contract is not ERC3664 attacher");
		// pending controllers
		// await this.propertyLevelContract.grantRole(ATTACH_ROLE, this.metabloxControllerContract.address);
		// assert.equal(await this.propertyLevelContract.hasRole(ATTACH_ROLE, this.metabloxControllerContract.address), true, "metablox controller is not ERC3664 attacher");

		// start grace period
		await this.Metablox.flipGracePeriod(this.identifier, true);
	});

	context("initialization", async function () {
		context("with everywhere contract", async function () {
			it("should have correct data", async function () {
				assert.equal((await this.Metablox.name()).toString(), "Metablox", "unmatched name");
				assert.equal((await this.Metablox.symbol()).toString(), "Blox", "unmatched symbol");
				assert.equal((await this.Metablox.propertyTierContractAddress()), this.propertyTierContract.address, "unmatched property tier address");
			});

			it("should be approved by Opensea by default", async function () {
				assert.equal(await this.Metablox.isApprovedForAll(this.owner, "0x58807baD0B376efc12F5AD86aAc70E78ed67deaE"), true, "unmatched Opensea approval status");
			})
		})

		context("with Blox", async function () {
			it("should have correct authorities", async function () {
				assert.equal(await this.Metablox.minter(), this.minter, "unmatched minter");
				assert.equal(await this.Metablox.capper(), this.capper, "unmatched capper");
				assert.equal(await this.Metablox.paymentTokenBeneficiary(), this.paymentTokenBeneficiary, "unmatched payment token beneficiary");
			});


			it("should have correct uris", async function () {
				assert.equal(await this.Metablox.baseURI(), this.baseURI, "unmatched base uri");
				assert.equal(await this.Metablox.contractURI(), this.contractURI, "unmatched contract uri");
			});

		})

	})

	context("(misc) sad path", async function () {
		context("Of Reserved Blox", async function () {
			before(async function () {
				await truffleAssert.reverts(
					this.Metablox.capBlox(
						this.identifier,
						Array.from({ length: 10 }, (_, i) => i + 1),
						true,
						{ from: this.owner }
					),
					"caller isn't capper",
					"should fail to cap blox with non-capper address",
				)
				await truffleAssert.passes(
					this.Metablox.capBlox(
						this.identifier,
						Array.from({ length: 10 }, (_, i) => i + 1),
						true,
						{ from: this.capper }
					),
					"should be able to cap blox",
				);
			})

			it("should not be able to do public mint with capped blox", async function () {
				const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
				await truffleAssert.reverts(
					this.Metablox.publicBatchMint(
						this.identifier,
						[1], // Blox number
						[this.propertyTier], // property tier: 1
						this.WMATIC.address, // buy with: USDT
						[MATIC_100], // MATIC token amount: 42.958 MATIC
						"100", // tolerance: 1%
						{ from: this.owner, value: MATIC_100 },
					),
					"blox is capped",
					"should not be able to publicly mint reserved blox",
				)
			})

			after(async function () {
				await truffleAssert.passes(
					this.Metablox.capBlox(
						this.identifier,
						Array.from({ length: 10 }, (_, i) => i + 1),
						false,
						{ from: this.capper }
					),
					"should be able to cap blox",
				)
			})
		})

		context("Of Pause", async function () {
			before(async function () {

				await truffleAssert.reverts(
					this.Metablox.pause({ from: this.dummyReceiver }),
					"Ownable: caller is not the owner",
					"should fail to pause with non-owner address",
				)
				await truffleAssert.reverts(
					this.Metablox.unpause({ from: this.dummyReceiver }),
					"Ownable: caller is not the owner",
					"should fail to unpause with non-owner address",
				)
				// pause
				await this.Metablox.pause({ from: this.owner })
			})

			it("should not be able to do custodial mint when paused", async function () {
				await truffleAssert.reverts(
					this.Metablox.custodialBatchMint(
						this.identifier,
						this.dummyReceiver,
						[1], // capped Blox number
						{ from: this.minter },
					),
					"Pausable: paused",
					"should not be able to publicly mint reserved blox in pause status",
				)
			})

			it("should not be able to publicly mint blox", async function () {
				await truffleAssert.reverts(
					this.Metablox.publicBatchMint(
						this.identifier,
						[10], // Blox number
						[this.propertyTier], // property tier: 1
						this.USDT.address, // buy with: USDT
						["100000000000000000000"], // ERC20 token amount: 100 USDT / 10 ** 20
						"200", // tolerance: 2%
						{ from: this.owner },
					),
					"Pausable: paused",
					"should not be able to publicly mint reserved blox in pause status",
				)
			})

			after(async function () {
				await this.Metablox.unpause()
			})
		})

		context("Of Miscs", async function () {
			it("shouldn't be able to set blox supply by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setBloxSupply(
						this.identifier,
						39,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"should not be able to set blox total supply by non-owner address",
				)
			})

			it("shouldn't be able to set landmark number by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setLandmarkNumber(
						this.identifier,
						[1, 2, 3],
						true,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"should not be able to set blox total supply by non-owner address",
				)
			})

			it("shouldn't be able to set property level contract by non_owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setPropertyLevelContract(
						this.propertyLevelContract.address,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to set property level contract by non_owner address",
				)
			})

			it("shouldn't be able to set memory contract by non_owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setMemoryContract(
						this.propertyLevelContract.address,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to set memory contract by non_owner address",
				)
			})

			it("shouldn't be able to set royalties by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.setTokenRoyalty(
						1,
						this.paymentTokenBeneficiary,
						200,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to set token royalty by non-owner address",
				)

				await truffleAssert.reverts(
					this.Metablox.setDefaultRoyalty(
						this.paymentTokenBeneficiary,
						200,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to set default royalty by non-owner address",
				)
			})

			it("shouldn't be able to withdraw by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.withdraw({ from: this.dummyReceiver }),
					"Ownable: caller is not the owner",
					"shouldn't be able to withdraw by non-owner address",
				)
			})

			it("shouldn't be able to add price feed by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.addNewPriceFeed(
						this.WMATIC.address,
						this.chainlinkMatic.address,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to add price feed by non-owner address",
				)
			})

			it("shouldn't be able to release grace period by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.releaseGracePeriod(
						this.identifier,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to release grace period by non-owner address",
				)
			})

			it("shouldn't be able to flip public mint by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.flipGracePeriod(
						this.identifier,
						true,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to flip public mint by non-owner address",
				)
			})

			it("shouldn't be able to flip public mint by non-owner address", async function () {
				await truffleAssert.reverts(
					this.Metablox.flipPublicMint(
						this.identifier,
						true,
						{ from: this.dummyReceiver }
					),
					"Ownable: caller is not the owner",
					"shouldn't be able to flip public mint by non-owner address",
				)
			})
		})
	})

	context("mint #1", async function () {
		before(async function () {
			assert.equal(
				await this.Metablox.getBloxSupply(this.identifier), this.TEST_BLOX_SUPPLY, "unmatched blox supply"
			);
		})

		context("with custodial mint", async function () {
			context("happy path", async function () {
				it("custodial mint", async function () {
					tx = await this.Metablox.custodialBatchMint(
						this.identifier,
						this.dummyReceiver,
						[1], // Blox number
						{ from: this.minter },
					)
				})

				it("should have correct NFT / Blox owner and supply", async function () {
					assert.equal(await this.Metablox.ownerOf(0), this.dummyReceiver, "unmatched NFT owner");
					assert.equal((await this.Metablox.getBloxByTokenId(0))[0], this.dummyReceiver, "unmatched Blox owner");
					assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 1, "unmatched Blox total supply");
				});

				it("should have correct token uri", async function () {
					assert.equal(await this.Metablox.tokenURI(0), `${this.baseURI}${this.uriSuffix}1`, "unmatched NFT owner");
				});
			})

			context("sad path", async function () {
				it("shouldn't succeed when exceeding maximum length of blox number ", async function () {
					await truffleAssert.reverts(
						this.Metablox.custodialBatchMint(
							this.identifier,
							this.dummyReceiver,
							Array(21).fill(10), // Blox number
							{ from: this.minter },
						),
						"exceed maximum mint amount",
						"should fail when giving an array of length 21"
					)
				})

				it("shouldn't succeed when exceeding maximum length of blox number ", async function () {
					await this.Metablox.setBloxSupply(
						this.identifier,
						10,
					)
					await truffleAssert.reverts(
						this.Metablox.custodialBatchMint(
							this.identifier,
							this.dummyReceiver,
							Array(20).fill(10), // Blox number
							Array(20).fill(2), // Blox number
							{ from: this.minter },
						),
						"exceed maximum blox supply",
						"should fail when giving an array of length 20"
					)

					await this.Metablox.setBloxSupply(
						this.identifier,
						this.TEST_BLOX_SUPPLY,
					)
				})
			})
		})

		context("with public mint(MATIC)", async function () {
			const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
			let maticBalance, gasUsed, gasPrice;
			let contractMaticBalance;
			before("MATIC balance check", async function () {
				maticBalance = await web3.eth.getBalance(this.owner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				assert.equal(contractMaticBalance, 0, "unmatched MATIC balance of Blox contract");
			})

			context("happy path", async function () {
				it("public mint", async function () {
					tx = await this.Metablox.publicBatchMint(
						this.identifier,
						[2], // Blox number
						[this.propertyTier], // property tier: 1
						this.WMATIC.address, // buy with: MATIC
						[MATIC_100], // MATIC token amount: 42.958 MATIC
						"100", // tolerance: 1%
						{ from: this.owner, value: MATIC_100 },
					)
					gasUsed = tx.receipt.gasUsed;
					const _tx = await web3.eth.getTransaction(tx.tx);
					gasPrice = _tx.gasPrice;
				})

				it.skip("public mint #2", async function () {
					tx = await this.Metablox.publicBatchMint(
						"0x5553574153656174746c66",
						[2], // Blox number
						[this.propertyTier], // property tier: 1
						this.WMATIC.address, // buy with: MATIC
						[MATIC_100], // MATIC token amount: 42.958 MATIC
						"100", // tolerance: 1%
						{ from: this.owner, value: MATIC_100 },
					)
					gasUsed = tx.receipt.gasUsed;
					const _tx = await web3.eth.getTransaction(tx.tx);
					gasPrice = _tx.gasPrice;
				})

				context("token transfer", async function () {
					before(async function () {
						await truffleAssert.passes(
							this.Metablox.transferFrom(this.owner, this.dummyReceiver, 1),
							"should successfully transfer token to owner",
						);
					})
					it("should successfully transfer a global token", async function () {
						assert.equal(await this.Metablox.ownerOf(1), this.dummyReceiver, "unmatched NFT owner");
						assert.equal((await this.Metablox.getBloxByTokenId(1))[0], this.dummyReceiver, "unmatched Blox owner");
					});
					after(async function () {
						await truffleAssert.passes(
							this.Metablox.safeTransferFrom(this.dummyReceiver, this.owner, 1, { from: this.dummyReceiver }),
							"should successfully transfer token back to dummy receiver",
						);

						assert.equal(await this.Metablox.ownerOf(1), this.owner, "unmatched NFT owner");
						assert.equal((await this.Metablox.getBloxByTokenId(1))[0], this.owner, "unmatched Blox owner");
					})
				})

				it("should have correct MATIC balance of NFT owner", async function () {
					const tokenBalance = await web3.eth.getBalance(this.owner);
					// const diff = maticBalance - tokenBalance - (gasPrice * gasUsed);
					const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
					const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
					assert.equal(diff.toString(), MATIC_100, "unmatched MATIC balance");
				});

				it("should have correct NFT / Blox owner and supply", async function () {
					assert.equal(await this.Metablox.ownerOf(1), this.owner, "unmatched NFT owner");
					assert.equal((await this.Metablox.getBloxByTokenId(1))[0], this.owner, "unmatched Blox owner");
					assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 2, "unmatched Blox supply");
				});

				it("should have correct token uri", async function () {
					assert.equal(await this.Metablox.tokenURI(1), `${this.baseURI}${this.uriSuffix}2`, "unmatched NFT owner");
				});
			})

			context("sad path", async function () {
				it("shouldn't succeed when exceeding maximum length of blox number", async function () {
					await truffleAssert.reverts(
						this.Metablox.publicBatchMint(
							this.identifier,
							Array(6).fill(10), // Blox number
							Array(6).fill(this.propertyTier), // property tier: 1
							this.WMATIC.address, // buy with: MATIC
							Array(6).fill(MATIC_100), // MATIC token amount: 42.958 MATIC
							"100", // tolerance: 1%
							{ from: this.owner, value: MATIC_100 },
						),
						"exceed maximum mint amount",
						"should fail when giving an array of length 6"
					)
				})

				it("shouldn't succeed when exceeding maximum length of blox number", async function () {
					await truffleAssert.reverts(
						this.Metablox.publicBatchMint(
							this.identifier,
							Array(2).fill(10), // Blox number
							Array(3).fill(this.propertyTier), // property tier: 1
							this.WMATIC.address, // buy with: MATIC
							Array(4).fill(MATIC_100), // MATIC token amount: 42.958 MATIC
							"100", // tolerance: 1%
							{ from: this.owner, value: MATIC_100 },
						),
						"unmatched length of array",
						"should fail when giving an array of length 6"
					)
				})

				it("shouldn't succeed when exceeding maximum length of blox number", async function () {
					await this.Metablox.setBloxSupply(
						this.identifier,
						4,
					)
					await truffleAssert.reverts(
						this.Metablox.publicBatchMint(
							this.identifier,
							Array(5).fill(10), // Blox number
							Array(5).fill(this.propertyTier), // property tier: 1
							this.WMATIC.address, // buy with: MATIC
							Array(5).fill(MATIC_100), // MATIC token amount: 42.958 MATIC
							"100", // tolerance: 1%
							{ from: this.owner, value: MATIC_100 },
						),
						"exceed maximum blox supply",
						"should fail when giving an array of length 6"
					)
					await this.Metablox.setBloxSupply(
						this.identifier,
						this.TEST_BLOX_SUPPLY,
					)
				})

				it("shouldn't succeed when giving invalid token to pay", async function () {
					await truffleAssert.reverts(
						this.Metablox.publicBatchMint(
							this.identifier,
							[10], // Blox number
							[this.propertyTier], // property tier: 1
							this.dummyReceiver, // buy with: MATIC
							[MATIC_100], // MATIC token amount: 42.958 MATIC
							"100", // tolerance: 1%
							{ from: this.owner, value: MATIC_100 },
						),
						"invalid payment token",
						"should fail when giving an array of length 6"
					)
				})

				it("shouldn't succeed when the MATIC amount is insufficient", async function () {

					await truffleAssert.reverts(
						this.Metablox.publicBatchMint(
							this.identifier,
							Array(2).fill(10), // Blox number
							Array(2).fill(this.propertyTier), // property tier: 1
							this.WMATIC.address, // buy with: MATIC
							Array(2).fill(MATIC_100), // MATIC token amount: 42.958 MATIC
							"100", // tolerance: 1%
							{ from: this.owner, value: MATIC_100 },
						),
						"insufficient matic amount to mint",
						"should fail when giving an array of length 6"
					)

				})
			})
		})

		context("with authorized global mint", async function () {
			context("happy path", async function () {
				it("global mint", async function () {
					await this.Metablox.authorizedGlobalMint(
						this.dummyReceiver,
						[1], // block number
						{ from: this.minter },
					)
					assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 2, "unmatched Blox supply after global mint");
					assert.equal(await this.Metablox.tokenToBloxNumber(2), 1, "unmatched token tier after global mint");
				})

				context("token transfer", async function () {
					before(async function () {
						await truffleAssert.passes(
							this.Metablox.safeTransferFrom(this.dummyReceiver, this.owner, 2, { from: this.dummyReceiver }),
							"should successfully transfer token to owner",
						);
					})
					it("should successfully transfer a global token", async function () {
						assert.equal(await this.Metablox.ownerOf(2), this.owner, "unmatched NFT owner");
						assert.equal((await this.Metablox.getBloxByTokenId(2))[0], "0x0000000000000000000000000000000000000000", "should be zero address after a token was minted");
					});
					after(async function () {
						await truffleAssert.passes(
							this.Metablox.safeTransferFrom(this.owner, this.dummyReceiver, 2),
							"should successfully transfer token back to dummy receiver",
						);

						assert.equal(await this.Metablox.ownerOf(2), this.dummyReceiver, "unmatched NFT owner");
						assert.equal((await this.Metablox.getBloxByTokenId(2))[0], "0x0000000000000000000000000000000000000000", "should be zero address after a token was minted");
					})
				})

				it("should have correct token uri", async function () {
					assert.equal(await this.Metablox.tokenURI(2), `${this.baseURI}global/2`, "unmatched NFT owner");
				});

				context("token association", async function () {
					it("associate to blox", async function () {
						await this.Metablox.authorizedAssociation(
							this.identifier,
							[2], // token id
							[3], // blox number
							{ from: this.minter },
						)
					})

					it("should have correct NFT / Blox owner and supply", async function () {
						assert.equal(await this.Metablox.ownerOf(2), this.dummyReceiver, "unmatched NFT owner");
						assert.equal((await this.Metablox.getBloxByTokenId(2))[0], this.dummyReceiver, "unmatched NFT owner");
						assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 3, "unmatched Blox supply");
					});
				})

			})



			context("sad path", async function () {

			})
		})

		context("total supply", async function () {
			it("should be 3 after two mints", async function () {
				assert.equal(await this.Metablox.totalSupply(), 3, "unmatched total supply");
				assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 3, "unmatched Blox supply");
			})
		})

	})

	context("grace period #1", async function () {
		before("should have correct data", async function () {
			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 2, "unmatched current phase");
			assert.equal(gp._remainingGP, 1, "unmatched remaining grace period amount");
		})

		context("with another public mint(MATIC)", async function () {
			const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
			let maticBalance, gasUsed, gasPrice;
			let contractMaticBalance;
			before("MATIC balance check", async function () {
				maticBalance = await web3.eth.getBalance(this.owner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				assert.equal(contractMaticBalance, MATIC_100, "unmatched MATIC balance of Blox contract");
			})

			it("should have correct MATIC balance of NFT owner", async function () {
				tx = await this.Metablox.publicBatchMint(
					this.identifier,
					[4], // Blox number
					[this.propertyTier], // property tier: 1
					this.WMATIC.address, // buy with: MATIC
					[MATIC_100], // MATIC token amount: 42.958 MATIC
					"100", // tolerance: 1%
					{ from: this.owner, value: MATIC_100 },
				)
				gasUsed = tx.receipt.gasUsed;
				const _tx = await web3.eth.getTransaction(tx.tx);
				gasPrice = _tx.gasPrice;
				const tokenBalance = await web3.eth.getBalance(this.owner);
				const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
				const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
				assert.equal(diff.toString(), MATIC_100, "unmatched MATIC balance");
			});

			it("should have correct NFT / Blox owner and supply", async function () {
				assert.equal(await this.Metablox.ownerOf(3), this.owner, "unmatched NFT owner");
				assert.equal((await this.Metablox.getBloxByTokenId(3))[0], this.owner, "unmatched Blox owner");
				assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 4, "unmatched Blox supply");
			});

			it("should have correct token uri", async function () {
				assert.equal(await this.Metablox.tokenURI(3), `${this.baseURI}${this.uriSuffix}4`, "unmatched NFT owner");
			});
		})

		after(async function () {
			await this.Metablox.releaseGracePeriod(this.identifier);

			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 2, "unmatched current phase");
			assert.equal(gp._remainingGP, 0, "unmatched remaining grace period amount");
		})
	})

	context("mint #2", async function () {
		const MATIC_100 = "42958629550983520000" // 42.958 MATIC at price $2.327821
		const MATIC_150 = "64437944326475284000" // 64.438 MATIC at price $2.327821
		let maticBalance, gasUsed, gasPrice;
		let contractMaticBalance;
		before("MATIC balance check", async function () {
			maticBalance = await web3.eth.getBalance(this.owner)
			contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
			assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
			// two public mint happened
			assert.equal(contractMaticBalance, new BN(MATIC_100).mul(new BN(2)).toString(), "unmatched MATIC balance of Blox contract");
		})

		it("should have correct MATIC balance of NFT owner", async function () {
			tx = await this.Metablox.publicBatchMint(
				this.identifier,
				[5, 6], // Blox number
				Array(2).fill(this.propertyTier), // property tier: 1
				this.WMATIC.address, // buy with: MATIC
				Array(2).fill(MATIC_150), // MATIC token amount: 42.958 MATIC
				"100", // tolerance: 1%
				{ from: this.owner, value: new BN(MATIC_150).mul(new BN(2)).toString() },
			)
			gasUsed = tx.receipt.gasUsed;
			const _tx = await web3.eth.getTransaction(tx.tx);
			gasPrice = _tx.gasPrice;
			const tokenBalance = await web3.eth.getBalance(this.owner);
			const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
			const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
			assert.equal(diff.toString(), new BN(MATIC_150).mul(new BN(2)).toString(), "unmatched MATIC balance");
		});

		it("should have correct NFT / Blox owner and supply", async function () {
			assert.equal(await this.Metablox.ownerOf(4), this.owner, "unmatched NFT owner");
			assert.equal((await this.Metablox.getBloxByTokenId(4))[0], this.owner, "unmatched Blox owner");
			assert.equal(await this.Metablox.ownerOf(5), this.owner, "unmatched NFT owner");
			assert.equal((await this.Metablox.getBloxByTokenId(5))[0], this.owner, "unmatched Blox owner");
			assert.equal(await this.Metablox.getBloxTotalSupply(this.identifier), 6, "unmatched Blox supply");
		});

		it("should have correct token uri", async function () {
			assert.equal(await this.Metablox.tokenURI(4), `${this.baseURI}${this.uriSuffix}5`, "unmatched NFT owner");
			assert.equal(await this.Metablox.tokenURI(5), `${this.baseURI}${this.uriSuffix}6`, "unmatched NFT owner");
		});

		after(async function () {
			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 3, "unmatched current phase");
			assert.equal(gp._remainingGP, 1, "unmatched remaining grace period amount");
		})

	})

	context("mint #3", async function () {
		it("global mint and association", async function () {
			await this.Metablox.authorizedGlobalMint(
				this.dummyReceiver,
				3,
				[1, 2, 3], // block numbers
				{ from: this.minter },
			)
			// token uri examination
			assert.equal(await this.Metablox.tokenURI(6), `${this.baseURI}global/6`, "unmatched NFT owner");
			assert.equal(await this.Metablox.tokenURI(7), `${this.baseURI}global/7`, "unmatched NFT owner");
			assert.equal(await this.Metablox.tokenURI(8), `${this.baseURI}global/8`, "unmatched NFT owner");
			// block number examination
			assert.equal(await this.Metablox.tokenToBloxNumber(6), 1, "unmatched block number of token 6");
			assert.equal(await this.Metablox.tokenToBloxNumber(7), 2, "unmatched block number of token 7");
			assert.equal(await this.Metablox.tokenToBloxNumber(8), 3, "unmatched block number of token 8");
			// shouldn't enter grace period when doing a global mint
			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 3, "unmatched current phase");
			assert.equal(gp._remainingGP, 1, "unmatched remaining grace period amount");
			// actuall association
			await this.Metablox.authorizedAssociation(
				this.identifier,
				[6, 7, 8], // token id
				[7, 8, 9], // blox number
				{ from: this.minter },
			)
		})

		after(async function () {
			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 4, "unmatched current phase");
			assert.equal(gp._remainingGP, 2, "unmatched remaining grace period amount");
		})
	})

	context("mint #4", async function () {
		const MATIC_150 = "64437944326475284000" // 64.438 MATIC at price $2.327821
		const MATIC_225 = "96656916489712930000" // 64.438 MATIC at price $2.327821
		const MATIC_337 = "144985374734569390000" // 64.438 MATIC at price $2.327821
		let maticBalance, gasUsed, gasPrice;
		let contractMaticBalance;
		// test with public mint
		context("without releasing grace period", async function () {
			before("MATIC balance check", async function () {

				maticBalance = await web3.eth.getBalance(this.owner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				// two public mint happened
				// assert.equal(contractMaticBalance, new BN(MATIC_150).mul(new BN(2)).toString(), "unmatched MATIC balance of Blox contract");
				// reset contract balance
				await this.Metablox.withdraw();
			})

			it("should have correct MATIC balance of NFT owner", async function () {
				tx = await this.Metablox.publicBatchMint(
					this.identifier,
					[10], // Blox number
					[this.propertyTier], // property tier: 1
					this.WMATIC.address, // buy with: MATIC
					[MATIC_150], // MATIC token amount: 42.958 MATIC
					"100", // tolerance: 1%
					{ from: this.owner, value: MATIC_150 },
				)
				gasUsed = tx.receipt.gasUsed;
				const _tx = await web3.eth.getTransaction(tx.tx);
				gasPrice = _tx.gasPrice;
				const tokenBalance = await web3.eth.getBalance(this.owner);
				const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
				const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
				// assert.equal(diff.toString(), MATIC_150, "unmatched MATIC balance");
			});
		})

		// test with public mint
		context("releasing grace period #2", async function () {
			before("MATIC balance check", async function () {
				maticBalance = await web3.eth.getBalance(this.owner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				// two public mint happened
				assert.equal(contractMaticBalance, MATIC_150, "unmatched MATIC balance of Blox contract");
				// reset contract balance
				await this.Metablox.withdraw();
				await this.Metablox.releaseGracePeriod(this.identifier);
			})

			it("should have correct MATIC balance of NFT owner", async function () {
				tx = await this.Metablox.publicBatchMint(
					this.identifier,
					[11], // Blox number
					[this.propertyTier], // property tier: 1
					this.WMATIC.address, // buy with: MATIC
					[MATIC_225], // MATIC token amount: 42.958 MATIC
					"100", // tolerance: 1%
					{ from: this.owner, value: MATIC_225 },
				)
				gasUsed = tx.receipt.gasUsed;
				const _tx = await web3.eth.getTransaction(tx.tx);
				gasPrice = _tx.gasPrice;
				const tokenBalance = await web3.eth.getBalance(this.owner);
				const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
				const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
				// assert.equal(diff.toString(), MATIC_225, "unmatched MATIC balance");
			});
		})

		// test with public mint
		context("releasing grace period #2", async function () {
			before("MATIC balance check", async function () {
				maticBalance = await web3.eth.getBalance(this.owner)
				contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
				assert.notEqual(maticBalance, 0, "unmatched MATIC balance of NFT owner");
				// two public mint happened
				assert.equal(contractMaticBalance, MATIC_225, "unmatched MATIC balance of Blox contract");
				// reset contract balance
				await this.Metablox.withdraw();
				await this.Metablox.releaseGracePeriod(this.identifier);
			})

			it("should have correct MATIC balance of NFT owner", async function () {
				tx = await this.Metablox.publicBatchMint(
					this.identifier,
					[12], // Blox number
					[this.propertyTier], // property tier: 1
					this.WMATIC.address, // buy with: MATIC
					[MATIC_337], // MATIC token amount: 42.958 MATIC
					"100", // tolerance: 1%
					{ from: this.owner, value: MATIC_337 },
				)
				gasUsed = tx.receipt.gasUsed;
				const _tx = await web3.eth.getTransaction(tx.tx);
				gasPrice = _tx.gasPrice;
				const tokenBalance = await web3.eth.getBalance(this.owner);
				const gasConsumed = new BN(gasPrice).mul(new BN(gasUsed));
				const diff = new BN(maticBalance).sub(new BN(tokenBalance)).sub(gasConsumed);
				// assert.equal(diff.toString(), MATIC_337, "unmatched MATIC balance");
			});
		})


		after(async function () {
			const gp = await this.Metablox.getGracePeriod(this.identifier);
			assert.equal(gp._currPhase, 5, "unmatched current phase");
			assert.equal(gp._remainingGP, 1, "unmatched remaining grace period amount");
		})
	})

	context.skip("Total Supply Functionalities", async function () {
		it("should have correct token total supply", async function () {
			const totalSupply = await this.Metablox.totalSupply()
			assert.equal(totalSupply, this.TEST_BLOX_SUPPLY, "unmatched total supply");
		});
	})

	context("property level", async function () {
		it("should have correct balance of attr - blox 1", async function () {
			for (i = 0; i < 3; i++) {
				const _level = await this.propertyLevelContract.balanceOf(i, 1);
				const _marks = await this.propertyLevelContract.balanceOf(i, 2);
				const _slot = await this.propertyLevelContract.balanceOf(i, 3);
				const _mrStorage = await this.propertyLevelContract.balanceOf(i, 4);
				assert.equal(_level, 1, "unmatched level");
				assert.equal(_marks, 0, "unmatched marks");
				assert.equal(_slot, 1, "unmatched slot");
				assert.equal(_mrStorage, 300, "unmatched metarent storage");
			}
		});
	})

	context("withdraw", async function () {
		it("should be able to withdraw by benificiary", async function () {
			tx = await this.Metablox.withdraw(
				{ from: this.owner },
			)
		})

		it("should have correct MATIC balance", async function () {
			const contractMaticBalance = await web3.eth.getBalance(this.Metablox.address)
			assert.equal(contractMaticBalance, 0, "unmatched contract balance");
		});
	})

	context("royalties", async function () {
		context("with ERC-2981 onchain royalties", async function () {
			before(async function () {
				await this.Metablox.setDefaultRoyalty(this.paymentTokenBeneficiary, 100);
			})

			it("should get default royalty info", async function () {
				const royaltyInfo = await this.Metablox.royaltyInfo(87, "100000000000000000000")
				assert.equal(royaltyInfo[0], this.paymentTokenBeneficiary, "unmatched royalty benificiary");
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
