import Web3 from "web3";
import ManagerAbi from "../interfaces/ManagerAbi";
import { zeroAddress } from "viem";
import networks from "./networks";
import ierc20 from "../interfaces/IERC20";

const web3 = new Web3(window.ethereum);
window.ethereum.enable();

const createUserAccount = async (user) => {
    const chainId = web3.utils.hexToNumber(window.ethereum.chainId);
    const calldata = web3.eth.abi.encodeFunctionCall({
        "inputs": [],
		"name": "createNewUserAccount",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
    }, []);
    const transaction = {
        'from': user,
        'to': networks[chainId].manager,
        'value': "0x00",
        'data': calldata
    }
    await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transaction],
    }).then((result) => {console.log(result)}).catch((error) => {console.log(error)}); 
}

const getUserAccount = async (user) => {
    const chainId = web3.utils.hexToNumber(window.ethereum.chainId);
    if (user) {
        const manager = new web3.eth.Contract(
            ManagerAbi,
            networks[chainId].manager
        );
        return await manager.methods.userAccounts(user).call();
    }
}

const approve = async (user, amount) => {
    const chainId = web3.utils.hexToNumber(window.ethereum.chainId);
    const userAccount = await getUserAccount(user);
    const erc20 = new web3.eth.Contract(ierc20, networks[chainId].usdc);
    const decimals = await erc20.methods.decimals().call();
    if (userAccount != zeroAddress && amount > 0) {
        const calldata = web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }, [userAccount, amount * decimals]);
        const transaction = {
            'from': user,
            'to': networks[chainId].usdc,
            'value': "0x00",
            'data': calldata
        }
        await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transaction],
        }).then((result) => {console.log(result)}).catch((error) => {console.log(error)});
    }
    else alert("You don't have an account or amount to approve is zero");
}

const withdraw = async (user) => {
    const chainId = web3.utils.hexToNumber(window.ethereum.chainId);
    const userAccount = await getUserAccount(user);
    const calldata = await web3.eth.abi.encodeFunctionCall({
        "inputs": [
			{
				"internalType": "address",
				"name": "tokenAddress",
				"type": "address"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
    }, [networks[chainId].usdc]);
    const transaction = {
        'from': user,
        'to': userAccount,
        'value': "0x00",
        'data': calldata
    }
    await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transaction],
    }).then((result) => {console.log(result)}).catch((error) => {console.log(error)});
}

export default { createUserAccount, getUserAccount, approve, withdraw };