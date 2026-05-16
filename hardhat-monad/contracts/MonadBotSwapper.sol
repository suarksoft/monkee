// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWMON {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MonadBotSwapper {
    address public owner;
    address public router;
    address public wmon;
    address public feeRecipient;
    uint256 public feeBps = 100; // 1%

    event TokensBought(address indexed user, address indexed token, uint256 monIn, uint256 tokensOut, uint256 fee);
    event TokensSold(address indexed user, address indexed token, uint256 tokensIn, uint256 monOut, uint256 fee);
    event FeeUpdated(uint256 newFeeBps);

    constructor(address _router, address _wmon, address _feeRecipient) {
        owner = msg.sender;
        router = _router;
        wmon = _wmon;
        feeRecipient = _feeRecipient;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /// @notice Buy tokens with native MON — 1% fee deducted before swap
    function buyTokens(
        address tokenOut,
        uint24 poolFee,
        uint256 amountOutMinimum,
        address recipient
    ) external payable returns (uint256 tokensOut) {
        require(msg.value > 0, "No MON sent");

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 swapAmount = msg.value - fee;

        // Send fee
        if (fee > 0) {
            (bool sent, ) = feeRecipient.call{value: fee}("");
            require(sent, "Fee transfer failed");
        }

        // Wrap MON → WMON
        IWMON(wmon).deposit{value: swapAmount}();

        // Approve router
        if (IWMON(wmon).allowance(address(this), router) < swapAmount) {
            IWMON(wmon).approve(router, type(uint256).max);
        }

        // Swap WMON → token
        tokensOut = ISwapRouterV3(router).exactInputSingle(
            ISwapRouterV3.ExactInputSingleParams({
                tokenIn: wmon,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: recipient,
                amountIn: swapAmount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit TokensBought(recipient, tokenOut, msg.value, tokensOut, fee);
    }

    /// @notice Sell tokens for MON — 1% fee deducted from MON received
    function sellTokens(
        address tokenIn,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) external returns (uint256 monOut) {
        // Pull tokens from user
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");

        // Approve router
        IERC20(tokenIn).approve(router, amountIn);

        // Swap token → WMON (to this contract)
        uint256 wmonReceived = ISwapRouterV3(router).exactInputSingle(
            ISwapRouterV3.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: wmon,
                fee: poolFee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        // Deduct fee
        uint256 fee = (wmonReceived * feeBps) / 10000;
        uint256 userAmount = wmonReceived - fee;

        // Unwrap all WMON → MON
        IWMON(wmon).withdraw(wmonReceived);

        // Send fee
        if (fee > 0) {
            (bool feeSent, ) = feeRecipient.call{value: fee}("");
            require(feeSent, "Fee transfer failed");
        }

        // Send remaining MON to user
        (bool userSent, ) = recipient.call{value: userAmount}("");
        require(userSent, "User transfer failed");

        monOut = userAmount;
        emit TokensSold(recipient, tokenIn, amountIn, monOut, fee);
    }

    receive() external payable {}
}
