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
    function OWNER() external returns(address);
    function chargeFee(address token) external;
    function INCREASE_POSIOTION_FEE() external returns(uint24);
    function userAccounts(address user) external returns(address);
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
    function cancelIncreasePosition(
        bytes32 _key, 
        address payable _executionFeeReceiver
    ) external returns (bool);
    function cancelDecreasePosition(
        bytes32 _key, 
        address payable _executionFeeReceiver
    ) external returns (bool);
}

contract UserAccount {
    address public immutable USER;
    address public immutable MANAGER;
    address public immutable GMX_ROUTER;
    address public immutable GMX_POSITION_ROUTER;
    uint8 public immutable CREATE_INCREASE_POSITION = 0;
    uint8 public immutable CREATE_DECREASE_POSITION = 1;
    uint8 public immutable CANCEL_INCREASE_POSITION = 2;
    uint8 public immutable CANCEL_DECREASE_POSITION = 3;
    IManager private manager;

    constructor(
        address _USER,
        address _GMX_ROUTER,
        address _GMX_POSITION_ROUTER 
    ) {
        USER = _USER;
        MANAGER = msg.sender;
        GMX_ROUTER = _GMX_ROUTER;
        GMX_POSITION_ROUTER = _GMX_POSITION_ROUTER;
        IGMXRouter router = IGMXRouter(GMX_ROUTER);
        router.approvePlugin(GMX_POSITION_ROUTER);
        manager = IManager(MANAGER);
    }

    function executeAction(uint8 action, bytes calldata data) external payable returns(bytes32) {
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
            uint256 _amountInAdjusted = _amountIn - _amountIn / manager.INCREASE_POSIOTION_FEE();
            token.transferFrom(USER, MANAGER, _amountIn - _amountInAdjusted);
            token.transferFrom(USER, address(this), _amountInAdjusted);
            token.approve(GMX_ROUTER, _amountInAdjusted);
            bytes32 openedPositionId = positionPouter.createIncreasePosition{value: msg.value}(
                _path,
                _indexToken,
                _amountInAdjusted, 
                _minOut, 
                _sizeDelta, 
                _isLong, 
                _acceptablePrice, 
                _executionFee,
                _referralCode, 
                _callbackTarget
            );
            manager.chargeFee(address(token));
            return openedPositionId;
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
            bytes32 openedPositionId = positionPouter.createDecreasePosition{value: msg.value}(
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
            for (uint8 i = 0; i < _path.length; ) {
                uint256 balance = IERC20(_path[i]).balanceOf((address(this)));
                if (balance > 0) IERC20(_path[i]).transfer(USER, balance);
                unchecked { i++; }
            }
            return openedPositionId;
        }
        else if (action == CANCEL_INCREASE_POSITION) {
            (
                bytes32 _key, 
                address payable _executionFeeReceiver
            ) = abi.decode(data, (bytes32, address));
            bool closed = positionPouter.cancelIncreasePosition(_key, _executionFeeReceiver);
            if (closed) return bytes32("0x");
        }
        else if (action == CANCEL_DECREASE_POSITION) {
            (
                bytes32 _key, 
                address payable _executionFeeReceiver
            ) = abi.decode(data, (bytes32, address));
            bool closed = positionPouter.cancelDecreasePosition(_key, _executionFeeReceiver);
            if (closed) return bytes32("0x");
        }
    }

    function withdraw(address tokenAddress) external {
        require(USER == msg.sender, "Incorrect caller address: not a USER");
        IERC20(tokenAddress).transfer(msg.sender, IERC20(tokenAddress).balanceOf(address(this)));
    }
}