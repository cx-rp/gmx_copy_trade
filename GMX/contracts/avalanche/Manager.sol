// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./UserAccount.sol";

interface TraderJoeRouter {
    function WAVAX() external returns(address);
    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IWAVAX {
    function withdraw(uint) external;
    function balanceOf(address account) external view returns (uint256);
}

contract Manager {
    address public OWNER;
    address public immutable GMX_ROUTER;
    address public immutable TRADER_JOE_ROUTER;
    address public immutable GMX_POSITION_ROUTER;
    uint24 public INCREASE_POSIOTION_FEE = 1000;

    mapping (address => address) public userAccounts;

    modifier ownerRestrict {
        require(OWNER == msg.sender, "Incorrect caller address: Not an OWNER");
        _;
    }

    constructor(
        address _GMX_ROUTER,
        address _TRADER_JOE_ROUTER,
        address _GMX_POSITION_ROUTER
    ) {
        OWNER = msg.sender;
        GMX_ROUTER = _GMX_ROUTER;
        TRADER_JOE_ROUTER = _TRADER_JOE_ROUTER;
        GMX_POSITION_ROUTER = _GMX_POSITION_ROUTER;
    }

    function createNewUserAccount() external returns(address){
        require(userAccounts[msg.sender] == address(0), "Error: Account already exist");
        UserAccount userAccount = new UserAccount(GMX_ROUTER, GMX_POSITION_ROUTER);
        userAccounts[msg.sender] = address(userAccount);
        return address(userAccount);
    }

    function chargeFee(address _indexToken) external {
        IERC20 token = IERC20(_indexToken);
        uint256 _amountIn = token.balanceOf(address(this));
        TraderJoeRouter router = TraderJoeRouter(TRADER_JOE_ROUTER);
        token.approve(address(router), _amountIn);
        address[] memory _path = new address[](2);
        _path[0] = _indexToken;
        _path[1] = router.WAVAX();
        router.swapExactTokensForAVAX(
            _amountIn, 
            0, 
            _path, 
            address(this), 
            block.timestamp
        );
        IWAVAX wavax = IWAVAX(router.WAVAX());
        uint256 balance = wavax.balanceOf(address(this));
        wavax.withdraw(balance);
    }

    function changeIncreasePositionFee(uint24 newFee) external ownerRestrict {
        INCREASE_POSIOTION_FEE = newFee;
    }

    function changeOwner(address newOwner) external ownerRestrict {
        OWNER = newOwner;
    }
}