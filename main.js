require('dotenv');
const Web3 = require("web3");
const axios = require("axios");
const ERC20ABI = require("../interfaces/IERC20.json");
const url = "https://api.gmx.io/actions";

const HttpProviderUrl = "https://arb1.arbitrum.io/rpc";
const web3 = new Web3(new Web3.providers.HttpProvider(HttpProviderUrl));

const FEE = 1000;
const OWNER = "0x151A2048D7aB24dC889d083f38B7F250B7691CCB";
const ROUTER_ADDRESS = "";
const FACTORY_ADDRESS = "";
const MANAGER = "";
const API_KEY = "XT4GTWMD4Y9YI9ISXQSFH2J697IMRHW253";
const addressZero = "0x0000000000000000000000000000000000000000";
const METAMASK_PRIVATE_KEY = process.env.METAMASK_PRIVATE_KEY;

let router;
let UserAccountABI;

const trackedActions = [
    "CreateIncreasePosition",
    "CreateDecreasePosition",
    "CancelINcreasePosition",
    "CancelDecreasePosition",
]

const callFunction = async (actiontype, users, calldata) => {
    const data = web3.eth.abi.encodeFunctionCall({
        "inputs": [
			{
				"internalType": "uint8",
				"name": "action",
				"type": "uint8"
			},
			{
				"internalType": "address[]",
				"name": "users",
				"type": "address[]"
			},
			{
				"internalType": "bytes[]",
				"name": "data",
				"type": "bytes[]"
			}
		],
		"name": "multicall",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
    }, [actiontype, users, calldata]);
    const transaction = {
        'from': OWNER,
        'to': ROUTER_ADDRESS,
        'value': "0x",
        'gasLimit': "0x00050000",
        'gasPrice': web3.utils.toWei('5', 'gwei'),
        'data': data
    }
    const signTrx = await web3.eth.accounts.signTransaction(transaction, METAMASK_PRIVATE_KEY);
    web3.eth.sendSignedTransaction(signTrx.rawTransaction, (error, hash) => {
        if (error) console.log('Transaction failed: ', error);
        else console.log('Successfull transaction: ', hash);
    })
}

const callFunctionV2 = async (user, actiontype, calldata, fee) => {
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
			},
			{
				"internalType": "uint24",
				"name": "fee",
				"type": "uint24"
			}
		],
		"name": "executeAction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
    }, [actiontype, calldata, fee]);
    const transaction = {
        'from': OWNER,
        'to': user,
        'value': "0x",
        'gasLimit': "0x00050000",
        'gasPrice': web3.utils.toWei('5', 'gwei'),
        'data': data
    }
    const signTrx = await web3.eth.accounts.signTransaction(transaction, METAMASK_PRIVATE_KEY);
    web3.eth.sendSignedTransaction(signTrx.rawTransaction, (error, hash) => {
        if (error) console.log('Transaction failed: ', error);
        else console.log('Successfull transaction: ', hash);
    })
} 

const repeatTransactions = async (action, users) => {
    let datas = [];
    let accounts = [];
    let actionType = trackedActions.indexOf(action.data.action);
    let transaction = await web3.eth.getTransaction(action.data.txHash);
    let input = transaction.input;
    for (let user of users) {
        if (actionType == 0) {
            let parameters = ["address[]","address","uint256","uint256","uint256","bool","uint256","uint256","bytes32","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters, 
                input.substring(10, input.length)
            );
            let _amointIn = await getBalance(user, decodedInput[0][0]);
            let leverage = decodedInput[4] / decodedInput[2];
            decodedInput[2] = _amointIn; // Amount of collateral token to deposit 
            decodedInput[4] = _amointIn * leverage; // the USD value of the change in position size
            decodedInput[6] = "0"; // acceptable price
            if (_amointIn > 0) {
                let data = web3.eth.abi.encodeParameters(parameters, decodedInput);
                datas.push(data);
                accounts.push(user);
            }
        }
        else if (actionType == 1) {
            let parameters = ["address[]","address","uint256","uint256","bool","address","uint256","uint256","uint256","bool","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters, 
                input.substring(10, input.length)
            );
            decodedInput[2] = "0"; // _collateral Delta the amount of collateral in USD value to withdraw 
            decodedInput[3] = "0"; // _sizeDelta the USD value of the change in position size
            decodedInput[5] = user;
            decodedInput[6] = "0"; // acceptable price
            let data = web3.eth.abi.encodeParameters(parameters, decodedInput);
            datas.push(data);
            accounts.push(user);
        }
        else if (actionType == 2 || actionType == 3) {
            let parameters = ["bytes32","address"];
            let UserAccount = await new web3.eth.Contract(UserAccountABI, user);
            let positionId = await UserAccount.methods.openedPositionId().call();
            let _executionFeeReceiver = OWNER; // address ???? 
            let data = web3.eth.abi.encodeParameters(parameters, [positionId, _executionFeeReceiver]);
            datas.push(data);
            accounts.push(user);
        }
        await callFunction(
            actionType, 
            users, 
            datas
        );
    }
}

const repeatTransactionsV2 = async (action, users) => {
    let data;
    let actionType = trackedActions.indexOf(action.data.action);
    let transaction = await web3.eth.getTransaction(action.data.txHash);
    let input = transaction.input;
    for (let user of users) {
        if (actionType == 0) {
            let parameters = ["address[]","address","uint256","uint256","uint256","bool","uint256","uint256","bytes32","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters, 
                input.substring(10, input.length)
            );
            let _amointIn = await getBalance(user, decodedInput[0][0]);
            let leverage = decodedInput[4] / decodedInput[2];
            decodedInput[2] = _amointIn; // Amount of collateral token to deposit 
            decodedInput[4] = _amointIn * leverage; // the USD value of the change in position size
            decodedInput[6] = "0"; // acceptable price
            if (_amointIn > 0) {
                data = web3.eth.abi.encodeParameters(parameters, decodedInput);
            }
        }
        else if (actionType == 1) {
            let parameters = ["address[]","address","uint256","uint256","bool","address","uint256","uint256","uint256","bool","address"];
            let decodedInput = web3.eth.abi.decodeParameters(
                parameters, 
                input.substring(10, input.length)
            );
            decodedInput[2] = "0"; // _collateral Delta the amount of collateral in USD value to withdraw 
            decodedInput[3] = "0"; // _sizeDelta the USD value of the change in position size
            decodedInput[5] = user;
            decodedInput[6] = "0"; // acceptable price
            data = web3.eth.abi.encodeParameters(parameters, decodedInput);

        }
        else if (actionType == 2 || actionType == 3) {
            let parameters = ["bytes32","address"];
            let UserAccount = await new web3.eth.Contract(UserAccountABI, user);
            let positionId = await UserAccount.methods.openedPositionId().call();
            let _executionFeeReceiver = OWNER; // address ???? 
            data = web3.eth.abi.encodeParameters(parameters, [positionId, _executionFeeReceiver]);
        }
        await callFunctionV2(
            user,
            actionType, 
            data,
            FEE
        );
    }
}

const getTrackingUsers = async (trader) => {
    const filteredUsers = [];
    const users = await router.methods.getUserAccointsForTrader(trader).call();
    for (let user of users) if (user != addressZero) filteredUsers.push(user);
    return filteredUsers;
}

const exploreNewActions = async (actions) => {
    actions.map(async (action) => {
        if (trackedActions.includes(action.data.action)) {
            let users = await getTrackingUsers(action.data.account);
            if (users.length) await repeatTransactions(action, users);
        }
    })
}

const init = async () => {
    let address = ROUTER_ADDRESS;
    let routerABI = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${address}&apikey=${API_KEY}`;
    let abi = await axios.get(routerABI);
    router = await web3.eth.Contract(
        JSON.parse(abi.data.result), 
        ROUTER_ADDRESS
    );
    address = FACTORY_ADDRESS;
    let factoryABI = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${address}&apikey=${API_KEY}`;
    abi = await axios.get(factoryABI);
    factory = await web3.eth.Contract(
        JSON.parse(abi.data.result), 
        FACTORY_ADDRESS
    );
    response = await axios.get(url);
    let actions = response.data;
    return actions[0];
}

const getETHBalanceByAPI = async (address) => {
    const api = `https://api.arbiscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY}`;
    const response = await axios.get(api);
    return response.result;
} 

const getBalance = async (user, tokenAddress) => {
    const token = await new web3.eth.Contract(ERC20ABI, tokenAddress);
    const balance = await token.methods.balanceOf(user).call();
    return balance;
}

const main = async () => {
    let actions;
    let response;
    let newActions;
    let latestAction = await init();
    while(true) {
        newActions = [];
        response = await axios.get(url);
        actions = response.data;
        for(let i = 0; i < actions.lenth || latestAction.id != actions[i].id; i++) {
            newActions.push(actions[i]);
        }
        latestAction = actions[0];
        await exploreNewActions(newActions);
    }
}

main();