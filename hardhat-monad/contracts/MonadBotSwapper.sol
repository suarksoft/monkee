// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IUniswapV2Router {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MonadBotSwapper {
    address public owner;
    address public router;
    address public feeRecipient;
    uint256 public feeBps = 100; // 1% default

    event TokensBought(
        address indexed user,
        address indexed token,
        uint256 monIn,
        uint256 tokensOut,
        uint256 fee
    );

    event TokensSold(
        address indexed user,
        address indexed token,
        uint256 tokensIn,
        uint256 monOut,
        uint256 fee
    );

    event FeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    constructor(address _router, address _feeRecipient) {
        owner = msg.sender;
        router = _router;
        feeRecipient = _feeRecipient;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max fee is 5%");
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(_recipient);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /// @notice Buy tokens with MON — fee deducted from MON before swap
    function buyTokens(
        address[] calldata path,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(msg.value > 0, "No MON sent");

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 swapAmount = msg.value - fee;

        if (fee > 0) {
            (bool sent, ) = feeRecipient.call{value: fee}("");
            require(sent, "Fee transfer failed");
        }

        amounts = IUniswapV2Router(router).swapExactETHForTokens{value: swapAmount}(
            amountOutMin,
            path,
            to,
            deadline
        );

        emit TokensBought(to, path[path.length - 1], msg.value, amounts[amounts.length - 1], fee);
    }

    /// @notice Sell tokens for MON — fee deducted from MON received
    function sellTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        IERC20 token = IERC20(path[0]);
        require(token.transferFrom(msg.sender, address(this), amountIn), "Transfer failed");
        require(token.approve(router, amountIn), "Approve failed");

        // Swap to this contract first so we can deduct fee
        amounts = IUniswapV2Router(router).swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );

        uint256 monReceived = amounts[amounts.length - 1];
        uint256 fee = (monReceived * feeBps) / 10000;
        uint256 userAmount = monReceived - fee;

        if (fee > 0) {
            (bool feeSent, ) = feeRecipient.call{value: fee}("");
            require(feeSent, "Fee transfer failed");
        }

        (bool userSent, ) = to.call{value: userAmount}("");
        require(userSent, "User transfer failed");

        emit TokensSold(to, path[0], amountIn, userAmount, fee);
    }

    /// @notice Preview buy: how many tokens for X MON (after fee)
    function getTokensOut(
        uint256 monAmount,
        address[] calldata path
    ) external view returns (uint256 tokensOut, uint256 fee) {
        fee = (monAmount * feeBps) / 10000;
        uint256 swapAmount = monAmount - fee;
        uint256[] memory amounts = IUniswapV2Router(router).getAmountsOut(swapAmount, path);
        tokensOut = amounts[amounts.length - 1];
    }

    receive() external payable {}
}
