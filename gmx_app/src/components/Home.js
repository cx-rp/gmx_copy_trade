import { WalletContext } from "../App";
import { useContext, useState, useEffect } from "react";
import funcs from "../scripts/dataBase";
import utils from "../scripts/utils";
import main from "../scripts/main";


export const Home = () => {
    const address = useContext(WalletContext);
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";

    const [addTraders, setAddTraders] = useState("");
    const [deleteTraders, setDeleteTraders] = useState("");
    const [showButton, setShowButton] = useState(true);
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        const db = funcs.initDataBase();
        const userHasAccount = async () => {
            const hasAccount = await utils.getUserAccount(address);
            if (hasAccount == zeroAddress) setShowButton(true);
            else setShowButton(false);
        }
        userHasAccount();
    });
    
    useEffect(() => {
        main();
    }, []);
    
    const validateAddress = (action, traders) => {
        for(let trader of traders) {
            if (!/^[a-fA-F0-9x]+$/.test(trader) || trader.length != 42) {
                alert("Invalid trader address");
                return false;
            }
        }
        if (action) funcs.addTrackedTraders(address, traders);
        else funcs.deleteTrackedTraders(address, traders);
    }

    return (
        <div className="wrapper">
        <div className="main">
            {
                showButton ? 
                <button onClick={() => utils.createUserAccount(address)}>
                    Create User Account
                </button> : null
            }
            <div>
                <button onClick={() => utils.withdraw(address)}>Withdraw USDC</button>
            </div>
            <div className="input">
                <input
                    type="text"
                    placeholder="Paste trader address"
                    onChange={(e) => setAddTraders(e.target.value)}
                    value={addTraders}
                />
                <button onClick={() => validateAddress(true, [addTraders])}>Add traders to follow</button>
            </div>
            <div className="input">
                <input
                    type="text"
                    placeholder="Paste trader address"
                    onChange={(e) => setDeleteTraders(e.target.value)}
                    value={deleteTraders}
                />
                <button onClick={() => validateAddress(false, [deleteTraders])}>Delete followed traders</button>
            </div>
            <div className="input">
                <input
                    type="number"
                    placeholder="Paste trader address"
                    onChange={(e) => setAmount(e.target.value)}
                    value={amount}
                />
                <button onClick={() => utils.approve(address, USDC, amount)}>Aprove USDC</button>
            </div>
        </div>
        </div>
    )
};