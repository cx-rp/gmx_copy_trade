// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./UserAccount.sol";

interface UniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
    function WETH9() external view returns (address);
    function factory() external view returns (address);
}

interface UniswapV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

interface UniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

interface WETH is IERC20 {
    function withdrawTo(address account, uint256 amount) external;
}

contract Manager {
    address public OWNER;
    address public FEE_RECIPIENT;
    address public immutable GMX_ROUTER;
    address public immutable GMX_POSITION_ROUTER;
    address public immutable UNISWAP_V3_ROUTER;
    uint256 public ETH_INCREASE_FEE;
    uint256 public FEE;

    mapping (address => address) public userAccounts;

    modifier ownerRestrict {
        require(OWNER == msg.sender, "Incorrect caller address: Not an OWNER");
        _;
    }

    constructor(
        address _GMX_ROUTER,
        address _GMX_POSITION_ROUTER,
        address _UNISWAP_V3_ROUTER,
        address _FEE_RECIPIENT,
        uint256 ethIncreaseFee,
        uint256 fee
    ) {
        OWNER = msg.sender;
        GMX_ROUTER = _GMX_ROUTER;
        GMX_POSITION_ROUTER = _GMX_POSITION_ROUTER;
        UNISWAP_V3_ROUTER = _UNISWAP_V3_ROUTER;
        ETH_INCREASE_FEE = ethIncreaseFee;
        FEE_RECIPIENT = _FEE_RECIPIENT;
        FEE = fee;
    }

    function createNewUserAccount() external returns(address){
        require(userAccounts[msg.sender] == address(0), "Error: Account already exist");
        UserAccount userAccount = new UserAccount(msg.sender, GMX_ROUTER, GMX_POSITION_ROUTER);
        userAccounts[msg.sender] = address(userAccount);
        return address(userAccount);
    }
    
    function chargeFee(address tokenIn) external {
        UniswapV3Router router = UniswapV3Router(UNISWAP_V3_ROUTER);
        uint256 amountIn = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).approve(address(router), amountIn);
        UniswapV3Router.ExactInputSingleParams memory params = UniswapV3Router.ExactInputSingleParams(
            tokenIn,
            router.WETH9(),
            3000, 
            address(this), 
            block.timestamp, 
            amountIn, 
            0,
            0
        );
        router.exactInputSingle(params);
        amountIn = WETH(router.WETH9()).balanceOf(address(this));
        WETH(router.WETH9()).withdrawTo(FEE_RECIPIENT, amountIn);
    }

    function getIncreasePositionFee(address tokenIn) external view returns(uint256) {
        UniswapV3Router router = UniswapV3Router(UNISWAP_V3_ROUTER);
        address factory = UniswapV3Router(UNISWAP_V3_ROUTER).factory();
        address pool = UniswapV3Factory(factory).getPool(
            tokenIn,
            router.WETH9(),
            3000
        );
        (uint160 sqrtPriceX96, , , , , , ) = UniswapV3Pool(pool).slot0();
        return ETH_INCREASE_FEE / (sqrtPriceX96 ** 2) * (2 ** 192);
    }

    function changeAvaxIncreasePositionFee(uint256 newFee) external ownerRestrict {
        ETH_INCREASE_FEE = newFee;
    }

    function changeFee(uint256 newFee) external ownerRestrict {
        FEE = newFee;
    }

    function changeOwner(address newOwner) external ownerRestrict {
        OWNER = newOwner;
    }

    function changeFeeRecipient(address newFeeRecipient) external ownerRestrict {
        FEE_RECIPIENT = newFeeRecipient;
    }

    receive() external payable {}
}