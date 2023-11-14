// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HalvingVester
 * @dev Contract to control a halving-based vesting schedule of tokens.
 */
contract HalvingVester is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ERC20 token to be vested
    IERC20 public immutable token;

    // Address of the recipient
    address public recipient;

    // Amount to distribute at each interval
    uint256 public vestingAmount;

    // Interval to distribute
    uint256 public immutable vestingCliff;

    // Number of distribution intervals before the distribution amount halves
    uint256 public immutable halvingPeriod;

    // Countdown till the next halving
    uint256 public nextSlash;

    // Whether vesting is currently live
    bool public vestingEnabled;

    // Timestamp of latest distribution
    uint256 public lastUpdate;

    // Amount of tokens required to start distributing
    uint256 public immutable startingBalance;

    constructor(
        address token_,
        uint256 vestingAmount_,
        uint256 halvingPeriod_,
        uint256 vestingCliff_,
        uint256 startingBalance_
    ) {
        require(
            vestingAmount_ <= startingBalance_,
            "HalvingVester::constructor: Vesting amount too high"
        );
        require(
            halvingPeriod_ >= 1,
            "HalvingVester::constructor: Invalid halving period"
        );

        token = IERC20(token_);

        vestingAmount = vestingAmount_;
        halvingPeriod = halvingPeriod_;
        vestingCliff = vestingCliff_;
        startingBalance = startingBalance_;

        lastUpdate = 0;
        nextSlash = halvingPeriod - 1;
    }

    /**
     * Enable distribution. A sufficient amount of tokens >= startingBalance must be transferred
     * to the contract before enabling. The recipient must also be set. Can only be called by
     * the owner.
     */
    function startVesting() external onlyOwner {
        require(
            !vestingEnabled,
            "HalvingVester::startVesting: vesting already started"
        );
        require(
            token.balanceOf(address(this)) >= startingBalance,
            "HalvingVester::startVesting: incorrect token supply"
        );
        require(
            recipient != address(0),
            "HalvingVester::startVesting: recipient not set"
        );

        vestingEnabled = true;
        lastUpdate =
            block.timestamp -
            (block.timestamp % (24 * 3600)) +
            12 *
            3600; // align timestamp to 12pm GMT

        emit VestingEnabled();
    }

    /**
     * Sets the recipient of the vested distributions.
     */
    function setRecipient(address recipient_) external onlyOwner {
        require(
            !vestingEnabled,
            "HalvingVester::setRecipient: vesting already started"
        );
        recipient = recipient_;
        emit RecipientSet(recipient_);
    }

    /**
     * Vest the next toke  allocation. Tokens will be distributed to the recipient.
     */
    function claim() external nonReentrant returns (uint256) {
        require(vestingEnabled, "HalvingVester::claim: vesting not enabled");
        require(
            msg.sender == recipient,
            "HalvingVester::claim: only recipient can claim"
        );

        return _claim();
    }

    /**
     * Vest all remaining token allocation. Tokens will be distributed to the recipient.
     */
    function claimAll() external nonReentrant returns (uint256) {
        require(vestingEnabled, "HalvingVester::claimAll: vesting not enabled");
        require(
            msg.sender == recipient,
            "HalvingVester::claimAll: only recipient can claim"
        );

        uint256 numClaims = 0;
        if (lastUpdate < block.timestamp) {
            numClaims = (block.timestamp - lastUpdate) / vestingCliff;
        }

        uint256 vested = 0;
        for (uint256 i = 0; i < numClaims; ++i) {
            vested += _claim();
        }
        return vested;
    }

    /**
     * Private function implementing the vesting process.
     */
    function _claim() private returns (uint256) {
        require(
            block.timestamp >= lastUpdate + vestingCliff,
            "HalvingVester::_claim: not time yet"
        );

        // If we have finished a halving period, reduce the amount
        if (nextSlash == 0) {
            nextSlash = halvingPeriod - 1;
            vestingAmount /= 2;
        } else {
            nextSlash -= 1;
        }

        // Update the timelock
        lastUpdate += vestingCliff;

        // Distribute the tokens
        emit TokensVested(vestingAmount, recipient);
        token.safeTransfer(recipient, vestingAmount);

        return vestingAmount;
    }

    /* ========== EVENTS ========== */
    event RecipientSet(address recipient);
    event VestingEnabled();
    event TokensVested(uint256 amount, address recipient);
}
