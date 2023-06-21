from web3 import Web3

# ABI
'''
[{
            "constant": True,
            "inputs": [
                {
                    "name": "amountIn",
                    "type": "uint256"
                },
                {
                    "name": "path",
                    "type": "address[]"
                }
            ],
            "name": "getAmountsOut",
            "outputs": [
                {
                    "name": "amounts",
                    "type": "uint256[]"
                }
            ],
            "payable": False,
            "stateMutability": "view",
            "type": "function"
        }]
'''


class DexPrice: 
    def __init__(self, router_address: str, provider: str) -> None:
        self.web3 = Web3(Web3.HTTPProvider(provider))
        self.abi = self.get_router_abi(router_address)
        self.router = self.web3.eth.contract(abi=self.abi, address=router_address)


    def get_router_abi(router: str):
        # Implement
        pass


    def get_amounts_out(self, token_in: str, token_out: str, amount_in: int) -> int:
        response = self.router.functions.getAmountsOut(amount_in, [token_in, token_out]).call()
        amout_out = response[len(response) - 1]
        return amout_out


if __name__ == "__main__":
    # Пример
    pancake_router = "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F"
    USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
    USDT = "0x55d398326f99059fF775485246999027B3197955"
    provider = "https://bsc-dataseed.binance.org"
    pancake = DexPrice(pancake_router, provider)
    amount = 1000000000000000000
    response = pancake.get_amounts_out(USDC, USDT, amount)
    print(response)

    