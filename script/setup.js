
/** Usage
 * 1. create Javascript file under `script` folder
 * 2. write the logic you want
 * 3. execute truffle exex <path_to_script_file> --network <network>
 * */

const Metablox = artifacts.require("MetabloxEverywhere");
const { ADDR } = require("./addr");
module.exports = async function (callback) {
    // invoke callback
    try {
        const accounts = await web3.eth.getAccounts()
        const inst = await Metablox.at("0xEDc924d53d822CD446Bcfb31DFd85f12707d9D0E")
        const plAddr = "0xcc264215214d1988B75Ec4D0c1096747F27a4431"
        await inst.register("", "", "Seattle", "seattle/");

        const id = await inst.getIdentifier("", "", "Seattle")
        await inst.setPropertyLevelContract(id, plAddr)
        await inst.setBloxSupply(id, 2 ** 15)


        await inst.authorizedWildMint(a[0], 1, { from: a[1] })

        /* main logic for minting */
        // inst.mintReservedBlox("0x081d3729b1c75b7e7a9442f60e5e519484e26b91", 2801, "https://metablox.co/api/v1/tokenuri/miami/2801", { from: c[0], gasPrice: "50000000000" })
        // inst.batchMintReservedBloxes("0x9508db5cd3f3e7bdb1e6b86f3f6afcc9d3c059db", [2660, 3804, 3807], ["https://metablox.co/api/v1/tokenuri/miami/2660", "https://metablox.co/api/v1/tokenuri/miami/3804", "https://metablox.co/api/v1/tokenuri/miami/3807"], { from: c[0], gasPrice: "50000000000" })
        // instmintReservedBlox("0xe9a973a9730ec807b689124976493beccdc3de54", 1416, "https://metablox.co/api/v1/tokenuri/san-francisco/1416", { from: c[0], gasPrice: "50000000000" })
        // instbatchMintReservedBloxes("0xf68da16b87212bf299b43b1490fa934101a6dc8e", [2179, 164, 2191], ["https://metablox.co/api/v1/tokenuri/san-francisco/2179", "https://metablox.co/api/v1/tokenuri/san-francisco/164", "https://metablox.co/api/v1/tokenuri/san-francisco/2191"], { from: c[0], gasPrice: "50000000000" })
        callback()
    } catch (err) {
        callback(err)
    }
}