import Web3 from "web3";
import ManagerAbi from "../interfaces/ManagerAbi.js";

const HttpProviderAvalanche = "https://api.avax.network/ext/bc/C/rpc";
const web3 = new Web3(new Web3.providers.HttpProvider(HttpProviderAvalanche));

const MANAGER = "0x81f4752Bf64D50de61Aa360EDE5165576a06c00d";

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