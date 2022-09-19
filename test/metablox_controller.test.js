const truffleAssertions = require("truffle-assertions");

const MetabloxV2 = artifacts.require("MetabloxV2");
const MetabloxController = artifacts.require("MetabloxController");
const MetabloxMemories = artifacts.require("MetabloxMemories");
const PropertyTier = artifacts.require("PropertyTier");
const PropertyLevel = artifacts.require("PropertyLevel");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("MetabloxController", function (accounts) {
  before(async function () {
    this.bloxId = 30;
    this.bloxBuyer = accounts[1];
    this.memorySlotId = 3;
    // init contracts
    this.MetabloxV2 = await MetabloxV2.new();
    this.PropertyLevel = await PropertyLevel.new();
    this.PropertyTier = await PropertyTier.new();
    this.MetabloxMemories = await MetabloxMemories.new()
    this.MetabloxController = await MetabloxController.new(this.MetabloxV2.address, this.MetabloxMemories.address, this.PropertyLevel.address)
    // set controller address to memories
    await this.MetabloxMemories.setBloxContract(this.MetabloxV2.address);
    await this.MetabloxMemories.setBloxController(this.MetabloxController.address)
    // Set attribute id
    await this.MetabloxController.setMemorySlotAttributeId(this.memorySlotId);
    // Set up for property level
    // Set up
    const ATTACH_ROLE = await this.PropertyLevel.ATTACH_ROLE();
    await this.PropertyLevel.grantRole(ATTACH_ROLE, this.MetabloxV2.address);
    await this.PropertyLevel.grantRole(ATTACH_ROLE, this.MetabloxController.address);
    await this.PropertyLevel.mintBatch(
      [1, 2, this.memorySlotId, 4],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
      ["level", "memory marks", "memory slot", "metarent storage"],
    );

    assert.equal(await this.PropertyLevel.hasRole(ATTACH_ROLE, this.MetabloxV2.address), true, "metablox contract is not ERC3664 attacher");
    assert.equal(await this.PropertyLevel.hasRole(ATTACH_ROLE, this.MetabloxController.address), true, "metablox controller is not ERC3664 attacher");
    // init main contract
    await this.MetabloxV2.initialize(
      accounts[9], // random address #1
      this.PropertyTier.address,
      this.PropertyLevel.address,
      [this.PropertyLevel.address, this.PropertyLevel.address, this.PropertyLevel.address, this.PropertyLevel.address, this.PropertyLevel.address]

    );
    // mint researved blox
    const TEST_BLOX_SUPPLY = 39;
    await this.MetabloxV2.setTotalBloxSupply(TEST_BLOX_SUPPLY);
    await this.MetabloxV2.setTotalBloxSupplyWithLandmark(TEST_BLOX_SUPPLY + 10);
    await this.MetabloxV2.mintReservedBlox(
      this.bloxBuyer,
      this.bloxId,
      "http://fake.metablox.uri",
    )
  })

  context("with Property Level", async function () {
    it("should have correct data of property level after a blox is minted", async function () {
      const _level = await this.PropertyLevel.balanceOf(this.bloxId, 1);
      assert.equal(_level, 1, "unmatched level of initiated blox")
    })
  });

  context("with Blox controller", async function () {
    context("with Blox memories", async function () {
      let _arweaveHashInBytes;
      before(async function () {
        _arweaveHashInBytes = web3.utils.asciiToHex("hKMMPNh_emBf8v_at1tFzNYACisyMQNcKzeeE1QE9p8")
      })

      context("adding memories", async function () {
        it("shouldn't be able to add memory for a blox with wrong blox owner", async function () {
          await truffleAssertions.reverts(
            this.MetabloxController.addBloxMemory(this.bloxId, _arweaveHashInBytes),
            "only blox owner can do this",
            "shouldn't be able to add memory to the blox with wrong blox owner",
          );
        })

        it("should be able to add memory for a blox without correct blox owner", async function () {
          await truffleAssertions.passes(
            this.MetabloxController.addBloxMemory(this.bloxId, _arweaveHashInBytes, { from: this.bloxBuyer }),
            "should be able to add memory to the blox with correct owner",
          );
        })

        it("should have correct memory data of a blox", async function () {
          const _memoryHashByAddress = await this.MetabloxMemories.getMemoryHashesByAddress(this.bloxId, this.bloxBuyer);
          assert.equal(_memoryHashByAddress[0], _arweaveHashInBytes, "unmatched memory hash");
        })

        it("should have correct memory data of a blox", async function () {
          const _memoryHashByBloxId = await this.MetabloxMemories.getMemoryHashesByBloxId(this.bloxId);
          assert.equal(_memoryHashByBloxId[0], _arweaveHashInBytes, "unmatched memory hash");
        })
      })
    })

    context("with leveling up", async function () {
      it("should be able to level up with right data", async function () {
        await truffleAssertions.passes(
          this.MetabloxController.levelUp(
            this.bloxBuyer,
            this.bloxId,
            [1, 2, 3, 4],
            [1, 1, 3, 30],
            ["0x0", "0x0", "0x0", "0x0"],
          ),
          "should be able to level up",
        )
      })

      it("should have correct balance of attr", async function () {
        const _level = await this.PropertyLevel.balanceOf(this.bloxId, 1);
        const _marks = await this.PropertyLevel.balanceOf(this.bloxId, 2);
        const _slot = await this.PropertyLevel.balanceOf(this.bloxId, 3);
        const _mrStorage = await this.PropertyLevel.balanceOf(this.bloxId, 4);

        assert.equal(_level, 2, "unmatched level");
        assert.equal(_marks, 1, "unmatched level");
        assert.equal(_slot, 4, "unmatched level");
        assert.equal(_mrStorage, 330, "unmatched level");
      })
    })
  });
});
