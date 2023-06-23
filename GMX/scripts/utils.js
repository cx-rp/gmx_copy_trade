import Web3 from "web3";
import ManagerAbi from "../interfaces/ManagerAbi.js";

const HttpProviderAvalanche = "https://api.avax.network/ext/bc/C/rpc";
const web3 = new Web3(new Web3.providers.HttpProvider(HttpProviderAvalanche));

const MANAGER = "0x9CD3e68Db82cE54D240Aad37760a1396600ebe0B";

const getUserAccount = async (user) => {
    if (user) {
        const manager = await new web3.eth.Contract(
            ManagerAbi,
            MANAGER
        );
        return await manager.methods.userAccounts(user).call();
    }
}

export default { getUserAccount }