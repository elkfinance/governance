// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LinearVester
 * @dev Contract to manage a linear vesting schedule of tokens.
 */
contract LinearVester is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ERC20 token to be vested
    IERC20 public immutable token;

    // Address of the recipient of tokens
    address public recipient;

    // Amount to distribute at each interval
    uint256 public immutable vestingAmount;

    // Interval for distribution
    uint256 public immutable vestingCliff;

    // Whether vesting is currently active
    bool public vestingEnabled;

    // Initial balance required to start vesting
    uint256 public immutable startingBalance;

    // Amount of tokens that have been vested but not yet withdrawn
    uint256 public vestedBalance;

    // Timestamp of the last distribution
    uint256 public lastUpdate;

    /**
     * @dev Sets up the vesting contract with necessary details.
     * @param token_ The token to be vested.
     * @param vestingAmount_ The amount of tokens to vest per interval.
     * @param vestingCliff_ The interval in seconds between distributions.
     * @param startingBalance_ The initial balance required to start vesting.
     */
    constructor(
        address token_,
        uint256 vestingAmount_,
        uint256 vestingCliff_,
        uint256 startingBalance_
    ) {
        require(
            vestingAmount_ <= startingBalance_,
            "LinearVester::constructor: Vesting amount too high"
        );
        require(
            startingBalance_ % vestingAmount_ == 0,
            "LinearVester::constructor: Non-divisible amounts"
        );

        token = IERC20(token_);
        vestingAmount = vestingAmount_;
        vestingCliff = vestingCliff_;
        startingBalance = startingBalance_;
        vestedBalance = 0;
        lastUpdate =
            block.timestamp -
            (block.timestamp % (24 * 3600)) +
            12 *
            3600;
    }

    /**
     * @dev Starts the vesting process. Can only be called by the owner.
     *      Requires that the contract holds enough tokens and a recipient is set.
     * @param reset_ Whether to reset the last update timestamp to the current time.
     */
    function startVesting(bool reset_) external onlyOwner {
        require(
            !vestingEnabled,
            "LinearVester::startVesting: Vesting already started"
        );
        require(
            token.balanceOf(address(this)) >= startingBalance,
            "LinearVester::startVesting: Incorrect token supply"
        );
        require(
            recipient != address(0),
            "LinearVester::startVesting: Recipient not set"
        );

        vestingEnabled = true;
        if (reset_) {
            lastUpdate =
                block.timestamp -
                (block.timestamp % (24 * 3600)) +
                12 *
                3600;
        }

        emit VestingEnabled();
    }

    /**
     * @dev Sets the recipient of the vested tokens. Can only be called by the owner before vesting starts.
     * @param recipient_ The address of the recipient.
     */
    function setRecipient(address recipient_) external onlyOwner {
        require(
            !vestingEnabled,
            "LinearVester::setRecipient: Vesting already started"
        );
        recipient = recipient_;
        emit RecipientSet(recipient_);
    }

    /**
     * @dev Vest the next token allocation. Tokens will be calculated based on the number of passed vesting periods
     *      and added to the vested balance. Can be called by the recipient.
     * @return The amount of newly vested tokens.
     */
    function claim() external nonReentrant returns (uint256) {
        require(vestingEnabled, "LinearVester::claim: Vesting not enabled");
        require(
            msg.sender == recipient,
            "LinearVester::claim: Only recipient can claim"
        );
        require(
            block.timestamp >= lastUpdate + vestingCliff,
            "LinearVester::claim: Not time yet"
        );

        uint256 numClaims = (block.timestamp - lastUpdate) / vestingCliff;
        uint256 vested = numClaims * vestingAmount;
        lastUpdate += numClaims * vestingCliff;

        vestedBalance += vested;

        emit TokensVested(vested, recipient);
        return vested;
    }

    /**
     * @dev Withdraws a specified amount of vested tokens. Can be called by the recipient.
     *      The amount must be less than or equal to the vested balance.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(vestingEnabled, "LinearVester::withdraw: Vesting not enabled");
        require(
            msg.sender == recipient,
            "LinearVester::withdraw: Only recipient can withdraw"
        );
        require(
            amount <= vestedBalance,
            "LinearVester::withdraw: Insufficient vested balance"
        );

        vestedBalance -= amount; // Decrement the vested balance
        token.safeTransfer(recipient, amount);
        emit TokensWithdrawn(amount, recipient);
    }

    // Events
    event RecipientSet(address recipient);
    event VestingEnabled();
    event TokensVested(uint256 amount, address recipient);
    event TokensWithdrawn(uint256 amount, address recipient);
}
