import Web3 from "web3";
import axios from "axios";
import funcs from "./dataBase";
import utils from "./utils";

import RouterAbi from "../interfaces/RouterAbi";
import ReaderAbi from "../interfaces/ReaderAbi";
import ERC20ABI from "../interfaces/IERC20.js";
import UserAccountAbi from "../interfaces/UserAccountAbi";

// const HttpProviderArbitrum = "https://arb1.arbitrum.io/rpc";
const HttpProviderAvalanche = "https://api.avax.network/ext/bc/C/rpc";
const web3 = new Web3(new Web3.providers.HttpProvider(HttpProviderAvalanche));

const OWNER = process.env.REACT_APP_OWNER;
// const ARB_API_KEY = process.env.ARB_API_KEY;
// const AVAX_API_KEY = process.env.REACT_APP_AVAX_API_KEY;
const METAMASK_PRIVATE_KEY = process.env.REACT_APP_METAMASK_PRIVATE_KEY;

// Avalanche 
const USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
const WAVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const VAULT = "0x9ab2De34A33fB459b538c43f251eB825645e8595";
const routerAddress = "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8";
const readerAddress = "0x67b789D48c926006F5132BFCe4e976F0A7A63d5D";

const ARB_API_URL = "https://api.gmx.io/actions";
const AVAX_API_URL = "https://gmx-avax-server.uc.r.appspot.com/actions";

let Reader;
let PositionRouter;

const trackedActions = [
    "CreateIncreasePosition",
    "CreateDecreasePosition",
    "CancelINcreasePosition",
    "CancelDecreasePosition",
]

const callFunctionV2 = async (user, actiontype, calldata, executionFee) => {
    const data = web3.eth.abi.encodeFunctionCall({
        "inputs": [
			{
				"internalType": "uint8",
				"name": "action",
				"type": "uint8"
			},
			{
				"internalType": "bytes",
				"name": "data",
				"type": "bytes"
			}
		],
		"name": "executeAction",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
    }, [actiontype, calldata]);
    const gas = await getGasPrice();
    const transaction = {
        'from': OWNER,
        'to': user,
        'value': web3.utils.toHex(executionFee),
        'data': data,
        'gas': gas
    }
    const signTrx = await web3.eth.accounts.signTransaction(transaction, METAMASK_PRIVATE_KEY);
    console.log("Sign transaction: ", signTrx);
    /*
    await web3.eth.sendSignedTransaction(signTrx.rawTransaction, (error, hash) => {
        if (error) console.log(error);
        else console.log("Hash: ", hash);
    });
    */
}

const repeatTransactions = async (action, users) => {
    const actionType = trackedActions.indexOf(action.data.action);
    const transaction = await web3.eth.getTransaction(action.data.txhash);
    const input = transaction.input;
    const trader = transaction.from;
    const minExecutionFee = await PositionRouter.methods.minExecutionFee().call();
    for (let user of users) {
        // const userAccount = await getUserByAccountAddress(user);
        const userAccount = user; // address of user
        user = await utils.getUserAccount(userAccount); // address of smart contract
        if (actionType === 0) {
            let parameters = ["address[]","address","uint256","uint256","uint256","bool","uint256","uint256","bytes32","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters,
                input.substring(10, input.length)
            );
            // temporary 
            const path = [
                USDC,
                WAVAX
            ]
            // decodedInput[0] = path;
            let collateralToken = decodedInput[0][0];
            let traderAmountIn = decodedInput[2];
            let traderSizeDelta = decodedInput[4];
            let allowance = await getAllowance(userAccount, user, USDC);
            let traderBalance = await getBalance(trader, collateralToken);
            let adjusted = (Number(traderBalance) + Number(traderAmountIn)) / traderAmountIn;
            let amountIn = allowance / adjusted;
            let leverage = web3.utils.toBN(traderSizeDelta).div(web3.utils.toBN(traderAmountIn));
            decodedInput[0] = path;
            decodedInput[2] = String(Math.floor(amountIn));
            decodedInput[4] = String(web3.utils.toBN(Math.floor(amountIn)).mul(leverage));
            decodedInput[6] = "0";
            decodedInput[7] = minExecutionFee;
            if (amountIn > 0) {
                const input = [];
                for(let i = 0; i < 10; i++) input.push(decodedInput[i]);
                const data = web3.eth.abi.encodeParameters(parameters, input);
                console.log("Data", data);
                await callFunctionV2(user, actionType, data, minExecutionFee);  
            }
            else console.log("Error: amountIn == 0");
        }
        else if (actionType === 1) {
            let parameters = ["address[]","address","uint256","uint256","bool","address","uint256","uint256","uint256","bool","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters, 
                input.substring(10, input.length)
            );
            // temporary
            const path = [
                USDC, 
                WAVAX
            ]
            decodedInput[0] = path;
            let collateralToken = decodedInput[0][0];
            let indexToken = decodedInput[1];
            let collateralDelta = decodedInput[2];
            let sizeDelta = web3.utils.toBN(decodedInput[3]);
            let isLong = decodedInput[4];
            // Check the same collateral and index noken as trader did (can mismatch with path)
            let userPositions = await getPositions(user, [collateralToken], [indexToken], [isLong]);
            let traderPositions = await getPositions(trader, [collateralToken], [indexToken], [isLong]);
            console.log("userPositions", userPositions);
            console.log("traderPositions", traderPositions)
            if (userPositions > 0) {
                const adjusted = (traderPositions.add(sizeDelta)).div(userPositions);
                collateralDelta == 0 ? decodedInput[2] = "0" : decodedInput[2] = String(web3.utils.toBN(collateralDelta).div(adjusted));
                sizeDelta == 0 ? decodedInput[3] = "0" : decodedInput[3] = String(sizeDelta.div(adjusted));
                decodedInput[5] = userAccount;
                decodedInput[6] = "0"; 
                decodedInput[8] = minExecutionFee;

                const input = [];
                for(let i = 0; i < 11; i++) input.push(decodedInput[i]);
                const data = web3.eth.abi.encodeParameters(parameters, input);
                await callFunctionV2(user, actionType, data, minExecutionFee);
            }
        }
        /*
        else if (actionType == 2 || actionType == 3) {
            let parameters = ["bytes32","address"];
            // let UserAccount = await new web3.eth.Contract(UserAccountABI, user);
            // let positionId = await UserAccount.methods.openedPositionId().call();
            let _executionFeeReceiver = OWNER; // address ???? 
            let data = web3.eth.abi.encodeParameters(parameters, [positionId, _executionFeeReceiver]);
            await callFunctionV2(user, actionType, data);
        }
        */
    }
} 

const getPositions = async (account, collateralTokens, indexTokens, isLong) => {
    const response = await Reader.methods.getPositions(
        VAULT, 
        account,
        collateralTokens,
        indexTokens,
        isLong
    ).call();
    return web3.utils.toBN(response[0]);
}

const getContractAbi = async (url) => {
    const abi = await axios.get(url);
    console.log(JSON.stringify(abi.data.result));
    return JSON.stringify(abi.data.result);
}

const init = async () => {
    // const ARB_URL = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${ARB_USDT}&apikey=${ARB_API_KEY}`;
    // const AVAX_URL = `https://api.snowtrace.io/api?module=contract&action=getabi&address=${USDT}&apikey=${AVAX_API_KEY}`;
    // const routerAbi = `https://api.snowtrace.io/api?module=contract&action=getabi&address=${routerAddress}&apikey=${AVAX_API_KEY}`;
    // const readerAbi = `https://api.snowtrace.io/api?module=contract&action=getabi&address=${readerAddress}&apikey=${AVAX_API_KEY}`;
    // ERC20ABI = await getContractAbi(AVAX_URL)
    PositionRouter = await new web3.eth.Contract(
        RouterAbi,
        routerAddress
    );
    Reader = await new web3.eth.Contract(
        ReaderAbi,
        readerAddress
    );
    const response = await axios.get(AVAX_API_URL);
    const actions = response.data;
    return actions[0];
}

const getBalance = async (user, tokenAddress) => {
    const token = await new web3.eth.Contract(ERC20ABI, tokenAddress);
    const balance = await token.methods.balanceOf(user).call();
    return balance;
}

const getUserByAccountAddress = async (userAccount) => {
    const userContract = await new web3.eth.Contract(UserAccountAbi, userAccount);
    const user = await userContract.methods.USER().call();
    return user;
}

const getAllowance = async (userAccount, user, tokenAddress) => {
    const token = await new web3.eth.Contract(ERC20ABI, tokenAddress);
    const allowance = await token.methods.allowance(userAccount, user).call();
    return allowance;
}

const getGasPrice = async () => {
    return await web3.eth.getGasPrice();
}

const getTrackingUsers = async (trader) => {
    const users = await funcs.getUsersByTrader(trader);
    return users[0];
}

const exploreNewActions = async (actions) => {
    actions.map(async (action) => {
        if (trackedActions.includes(action.data.action)) {
            console.log("Account: ", action.data.account);
            let users = await getTrackingUsers(action.data.account);
            console.log("Users: ", users);
            if (users) if (users.length > 0) await repeatTransactions(action, users);
        }
    })
}

const main = async () => {
    let actions;
    let response;
    let newActions;
    let latestAction = await init();
    console.log(latestAction.id);
    console.log("Initialization completed");

    const increase = {
        data: {
            action: "CreateIncreasePosition",
            account: "0x8d3646cCB2B0D55af97C837aAb418c1b3e03fC2a",
            txhash: "0x60df4dc914b481bace8a295179f4923a3e78d96867bf22687a6f3a3a804d4bdc"
        }
    }
    const decrease = {
        data: {
            action: "CreateDecreasePosition",
            account: "0x8d3646cCB2B0D55af97C837aAb418c1b3e03fC2a",
            txhash: "0xb6a88965dce66f3892511f7a8dca9faa3426384af41bd39cbd4ef02515f271cb"
        }
    }
    await exploreNewActions([decrease]);
    /*
    while(true) {
        try {
            newActions = [];
            response = await axios.get(AVAX_API_URL);
            actions = response.data;
            if (latestAction && actions) {
                for(let i = 0; i < actions.lenth || latestAction.id != actions[i].id; i++) {
                    newActions.push(actions[i]);
                }
                latestAction = actions[0];
            }
            if (newActions.length > 0) await exploreNewActions(newActions);
        }
        catch (err) { console.log(err); }
    }
    */
}

export default main;