import Web3 from "web3";
import axios from "axios";
import TelegramBot from 'node-telegram-bot-api';
import ERC20ABI from "../interfaces/IERC20.js";
import VaultAbi from "../interfaces/VaultAbi.js";

const HttpProviderAvalanche = "https://api.avax.network/ext/bc/C/rpc";
const web3 = new Web3(new Web3.providers.HttpProvider(HttpProviderAvalanche));

const CHAT_ID = "-918426061";
const VAULT = "0x9ab2De34A33fB459b538c43f251eB825645e8595"

const SupportedTokens = {
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7": "AVAX",
    "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB": "ETH",
    "0x152b9d0FdC40C096757F570A51E494bd4b943E50": "BTC"
}

const getPositions = async (account, collateralTokens, indexTokens, isLong) => {
    const vault = await new web3.eth.Contract(
        VaultAbi,
        VAULT    
    );
    const response = await vault.methods.getPosition(
        account, collateralTokens, indexTokens, isLong
    ).call();
    return response;
}

const sendMessage = async (action) => {
    const bot = new TelegramBot('', { polling: true });
    const params = JSON.parse(action.data.params);
    const indexToken = params.indexToken
    const transaction = await web3.eth.getTransaction(action.data.txhash);
    const input = transaction.input;
    let positionSize;
    let leverage;
    if (action.data.action == "CreateIncreasePosition") {
        const parameters = [
            "address[]","address","uint256","uint256","uint256","bool","uint256","uint256","bytes32","address"
        ];
        const decodedInput = web3.eth.abi.decodeParameters(
            parameters,
            input.substring(10, input.length)
        );
        const collateralToken = new web3.eth.Contract(ERC20ABI, decodedInput[0][0]); 
        const balance = await collateralToken.methods.balanceOf(action.data.account).call();
        const collateral = decodedInput[2];
        positionSize = String(web3.utils.toBN(collateral).div((web3.utils.toBN(balance)).add(web3.utils.toBN(collateral))));
        leverage = String(web3.utils.toBN(decodedInput[4]).div(web3.utils.toBN(decodedInput[2])).div((web3.utils.toBN(10).pow(web3.utils.toBN(30)))));
        console.log("leverage", leverage);

    }
    else { 
        const parameters = [
            "address[]","address","uint256","uint256","bool","address","uint256","uint256","uint256","bool","address"
        ];
        const decodedInput = web3.eth.abi.decodeParameters(
            parameters,
            input.substring(10, input.length)
        );

        let response = await getPositions(trader, indexToken, indexToken, long);
        let traderPositions = web3.utils.toBN(response[0]);
        let sizeDelta = web3.utils.toBN(decodedInput[3]);
        positionSize = String(sizeDelta.div(traderPositions.add(sizeDelta)));
    }

    const message = `GMX Smart Money Monitor

<a href="https://snowtrace.io/address/${action.data.account}">Trader</a>

Token: #${SupportedTokens[indexToken]}

Action: ${action.data.action}

Position: ${params.isLong ? "Long" : "Short"}

Position size: ${String(Number(positionSize) * 100).substring(0, 2)}%

${action.data.action == "CreateIncreasePosition" ? `Leverage: ${leverage}X` : null}

<a href="https://snowtrace.io/tx//${action.data.txhash}">Trade Link</a>`

    const result = await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    console.log(result)
}
/*
const action = {
    data: {
        action: "CreateIncreasePosition",
        params: '{"indexToken":"0x152b9d0FdC40C096757F570A51E494bd4b943E50","isLong":true,"sizeDelta":"31819581995325200000000000000000000","acceptablePrice":"30350047810000000000000000000000000"}',
        account: "0x4273e7ADE3386986d8C60Cd9AE6520696686d574",
        txhash: "0xfb91c9049dcf7d7dc17e5033e8219b5962bfce62e38ccfc24b9cbc51f006c3fa"
    }
}

const main = async () => {
    await sendMessage(action);
}

main();
*/

export default sendMessage;