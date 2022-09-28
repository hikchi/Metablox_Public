
/** Usage
 * 1. create Javascript file under `script` folder
 * 2. write the logic you want
 * 3. execute truffle exex <path_to_script_file> --network <network>
 * */

const MetabloxEverywhere = artifacts.require("MetabloxEverywhere");
const { ADDR } = require("./addr");
module.exports = async function (callback) {
    // invoke callback
    try {
        const accounts = await web3.eth.getAccounts()
        // let inst = await MetabloxEverywhere.at("0xEDc924d53d822CD446Bcfb31DFd85f12707d9D0E")
        let inst = await MetabloxEverywhere.at("0xcd7f6902e5918F830163d02209D67B4f4ecE22DA")
        let cost = '133330000000000000000'
        let WMATIC_ADDRESS = "0x7361A3D0aaE76083e7DEBCdE76C5F8a4F5D848e4"
        // inst = await MetabloxEverywhere.at("0x29eDfF5aBD044b5bDdA7fE31ea52c7387Ab51dED")
        // cost = "42958629550983520000";
        // WMATIC_ADDRESS = "0x2C2932067016B3cF9622fA012d6d218588cEf620"
        const ts = await inst.totalSupply()
        const id = await inst.getIdentifier("", "", "Seattle");
        const blox = await inst.getBloxSupply(id)
        console.log("sleeping...")
        await new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
        console.log({ id, blox, ts, adddress: inst.address, balance: await web3.eth.getBalance(accounts[0]), cost, WMATIC_ADDRESS })
        // let tx = await inst.publicBatchMint(
        //     id,
        //     [6],
        //     [1],
        //     WMATIC_ADDRESS,
        //     [cost],
        //     "200",
        //     { from: accounts[0], value: cost }
        // )

        tx = await inst.custodialBatchMint(
            id,
            "0xF5668594b7362A2D9A1B2115F431E552FD8E66c4",
            [1],
            { from: accounts[1] }
        )
        console.log({ tx })

        callback()
    } catch (err) {
        console.log(err)
        callback(err)
    }
}