const PropertyTier = artifacts.require("PropertyTier");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Property Tier Test", function (/* accounts */) {
  before(async()=>{
    this.propertyTierContract = await PropertyTier.new();
    assert.equal((await this.propertyTierContract.getBloxBasePrice(1, 0)), 100, "unmatched base price of phase 1 / tier 1")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(1, 1)), 200, "unmatched base price of phase 1 / tier 2")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(1, 2)), 300, "unmatched base price of phase 1 / tier 3")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(1, 3)), 400, "unmatched base price of phase 1 / tier 4")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(1, 4)), 500, "unmatched base price of phase 1 / tier 5")

    assert.equal((await this.propertyTierContract.getBloxBasePrice(2, 0)), 150, "unmatched base price of phase 2 / tier 1")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(2, 1)), 300, "unmatched base price of phase 2 / tier 2")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(2, 2)), 450, "unmatched base price of phase 2 / tier 3")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(2, 3)), 600, "unmatched base price of phase 2 / tier 4")
    assert.equal((await this.propertyTierContract.getBloxBasePrice(2, 4)), 750, "unmatched base price of phase 2 / tier 5")
  })
});
