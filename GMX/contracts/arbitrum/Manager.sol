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
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function unwrapWETH9(uint256 amountMinimum, address recipient) external;
}

contract Manager {
    address public immutable WETH9;
    address public immutable OWNER;
    address public immutable GMX_ROUTER;
    address public immutable UNISWAP_ROUTER;
    address public immutable GMX_POSITION_ROUTER;
    uint24 public INCREASE_POSIOTION_FEE = 1000;
    uint24 public constant poolFee = 1000;

    mapping (address => address) public userAccounts;

    constructor(
        address _WETH9,
        address _GMX_ROUTER,
        address _UNISWAP_ROUTER,
        address _GMX_POSITION_ROUTER
    ) {
        WETH9 = _WETH9;
        OWNER = msg.sender;
        GMX_ROUTER = _GMX_ROUTER;
        UNISWAP_ROUTER = _UNISWAP_ROUTER;
        GMX_POSITION_ROUTER = _GMX_POSITION_ROUTER;
    }

    function createNewUserAccount() external returns(address){
        require(userAccounts[msg.sender] == address(0), "Error: Account already exist");
        UserAccount userAccount = new UserAccount(OWNER, GMX_ROUTER, GMX_POSITION_ROUTER);
        userAccounts[msg.sender] = address(userAccount);
        return address(userAccount);
    }

    function chargeFee(address _indexToken) external {
        UniswapV3Router uniswapV3Router = UniswapV3Router(UNISWAP_ROUTER);
        IERC20 token = IERC20(_indexToken);
        uint256 _amountIn = token.balanceOf(address(this));
        token.approve(address(uniswapV3Router), _amountIn);
        UniswapV3Router.ExactInputSingleParams memory params = UniswapV3Router.ExactInputSingleParams({
            tokenIn: _indexToken,
            tokenOut: WETH9,
            fee: poolFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: _amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uniswapV3Router.exactInputSingle(params);
        token = IERC20(WETH9);
        uint256 wethBalance = token.balanceOf(address(this));
        uniswapV3Router.unwrapWETH9(wethBalance, OWNER);
    }

    function changeIncreasePositionFee(uint24 newFee) external {
        require(OWNER == msg.sender, "Not an owner");
        INCREASE_POSIOTION_FEE = newFee;
    }
}