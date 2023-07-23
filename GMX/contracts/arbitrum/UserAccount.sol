// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IGMXRouter {
    function approvePlugin(address _plugin) external;
}

interface IManager {
    function FEE() external returns(uint256);
    function OWNER() external returns(address);
    function chargeFee(address tokenIn) external;
    function FEE_RECIPIENT() external returns(address);
    function userAccounts(address user) external returns(address);
    function getIncreasePositionFee(address tokenIn) external returns(uint256);
}

interface IPositionRouter {
    function createIncreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _amountIn,
        uint256 _minOut,
        uint256 _sizeDelta,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable returns (bytes32);
    function createDecreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _collateralDelta,
        uint256 _sizeDelta,
        bool _isLong,
        address _receiver,
        uint256 _acceptablePrice,
        uint256 _minOut,
        uint256 _executionFee,
        bool _withdrawETH,
        address _callbackTarget
    ) external payable returns (bytes32);
}

contract UserAccount {
    address public immutable USER;
    address public immutable GMX_ROUTER;
    address public immutable GMX_POSITION_ROUTER;
    uint8 public immutable CREATE_INCREASE_POSITION = 0;
    uint8 public immutable CREATE_DECREASE_POSITION = 1;
    
    IManager private manager;

    constructor(
        address _USER,
        address _GMX_ROUTER,
        address _GMX_POSITION_ROUTER
    ) {
        USER = _USER;
        GMX_ROUTER = _GMX_ROUTER;
        GMX_POSITION_ROUTER = _GMX_POSITION_ROUTER;
        IGMXRouter router = IGMXRouter(GMX_ROUTER);
        router.approvePlugin(GMX_POSITION_ROUTER);
        manager = IManager(msg.sender);
    }

    function executeAction(uint8 action, bytes calldata data) external payable {
        require(manager.OWNER() == msg.sender, "Incorrect caller address: Not an OWNER");
        IPositionRouter positionPouter = IPositionRouter(GMX_POSITION_ROUTER);
        if (action == CREATE_INCREASE_POSITION) {
            (
                address[] memory _path,
                address _indexToken,
                uint256 _amountIn,
                uint256 _minOut,
                uint256 _sizeDelta,
                bool _isLong,
                uint256 _acceptablePrice,
                uint256 _executionFee,
                bytes32 _referralCode,
                address _callbackTarget
            ) = abi.decode(data, (
                address[], 
                address, 
                uint256, 
                uint256, 
                uint256, 
                bool, 
                uint256, 
                uint256, 
                bytes32, 
                address
            ));
            IERC20 token = IERC20(_path[0]);
            require(_amountIn <= token.allowance(
                USER, 
                address(this)
            ), "Insufficient _amountIn");
            uint256 _amountInAdj;
            uint256 _sizeDeltaAdj;
            {
                token.transferFrom(USER, address(this), _amountIn);
                uint256 increaseFee = manager.getIncreasePositionFee(address(token));
                uint256 fee = _amountIn / manager.FEE();
                token.transfer(address(manager), increaseFee);
                token.transfer(manager.FEE_RECIPIENT(), fee);
                _amountInAdj = _amountIn - fee - increaseFee;
                _sizeDeltaAdj = _sizeDelta / _amountIn * _amountInAdj;
            }
            token.approve(GMX_ROUTER, _amountInAdj);
            positionPouter.createIncreasePosition{value: msg.value}(
                _path,
                _indexToken,
                _amountInAdj, 
                _minOut, 
                _sizeDeltaAdj, 
                _isLong, 
                _acceptablePrice, 
                _executionFee,
                _referralCode, 
                _callbackTarget
            );
            manager.chargeFee(address(token));
        }
        else if (action == CREATE_DECREASE_POSITION) {
            (
                address[] memory _path,
                address _indexToken,
                uint256 _collateralDelta,
                uint256 _sizeDelta,
                bool _isLong,
                address _receiver,
                uint256 _acceptablePrice,
                uint256 _minOut,
                uint256 _executionFee,
                bool _withdrawETH,
                address _callbackTarget
            ) = abi.decode(data, (
                address[], 
                address, 
                uint256, 
                uint256, 
                bool, 
                address, 
                uint256, 
                uint256, 
                uint256, 
                bool, 
                address
            ));
            positionPouter.createDecreasePosition{value: msg.value}(
                _path,
                _indexToken,
                _collateralDelta,
                _sizeDelta,
                _isLong,
                _receiver,
                _acceptablePrice,
                _minOut,
                _executionFee,
                _withdrawETH,
                _callbackTarget
            );
        }
    }

    function withdraw(address tokenAddress) external {
        require(USER == msg.sender, "Incorrect caller address: not a USER");
        IERC20(tokenAddress).transfer(msg.sender, IERC20(tokenAddress).balanceOf(address(this)));
    }
}