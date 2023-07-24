import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContext, useState, useEffect } from "react";
import { WalletContext } from "../App";
import Web3 from "web3";
import ierc20 from "../interfaces/IERC20";
import networks from '../scripts/networks';
import utils from "../scripts/utils";
import ManagerAbi from "../interfaces/ManagerAbi";
import "../styles/App.css";


const web3 = new Web3(window.ethereum);
window.ethereum.enable();

export const Wallet = () => {

    const address = useContext(WalletContext);
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const [allowance, setAllowance] = useState("0.00");

    useEffect(() => {
        const chainId = web3.utils.hexToNumber(window.ethereum.chainId);
        
        const getAmountApproved = async () => {
            const erc20 = new web3.eth.Contract(ierc20, networks[chainId].usdc);
            const manager = new web3.eth.Contract(ManagerAbi, networks[chainId].manager);
            const userAccount = await manager.methods.userAccounts(address).call();
            let response = await erc20.methods.allowance(address, userAccount).call();
            let decimals = await erc20.methods.decimals().call();
            response = Number(response) / Number(10 ** decimals);
            if (response >= 1000) response = Math.floor(response);
            else if (response >= 100) response = Number(response).toFixed(1);
            else response = Number(response).toFixed(2);
            setAllowance(response)
        }

        const userHasAccount = async () => {
            const hasAccount = await utils.getUserAccount(address);
            if (hasAccount == zeroAddress) setAllowance("User don't have an account")
            else getAmountApproved();
        }
        userHasAccount();
    }, [address])
    
    return (
        <div className='connect'>
            <div classname="allowance">USDC allowance: {allowance}</div>
            <div className="rainbow-kit-button">
                <ConnectButton />
            </div>
        </div>
    )
};
