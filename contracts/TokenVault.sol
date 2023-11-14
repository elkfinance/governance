// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenVault
 * @dev Contract to control the yearly release of tokens.
 */
contract TokenVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ERC20 token to be vested
    IERC20 public immutable token;

    // Maximum tokens that can be claimed per year
    uint256 public immutable maxPerYear;

    // The timestamp for the next January 1st
    uint256 public yearStartTimestamp;

    // Amount of tokens claimed this year
    uint256 public yearlyClaimed;

    /**
     * @dev Constructor for initializing the TokenHolder contract.
     * @param token_ The ERC20 token to be vested.
     * @param maxPerYear_ The maximum amount of tokens that can be claimed per year.
     */
    constructor(address token_, uint256 maxPerYear_) {
        token = IERC20(token_);
        maxPerYear = maxPerYear_;
        yearStartTimestamp = nextJanuaryFirstTimestamp();
        yearlyClaimed = 0;
    }

    /**
     * @dev Public function to claim vested tokens.
     * Can only be called by the recipient.
     * @param amount The amount of tokens to claim.
     * @return The amount of tokens claimed.
     */
    function claim(
        uint256 amount
    ) external onlyOwner nonReentrant returns (uint256) {
        return _claim(amount);
    }

    /**
     * @dev Internal function to implement token claiming logic.
     * @param amount The amount of tokens to claim.
     * @return The amount of tokens claimed.
     */
    function _claim(uint256 amount) private returns (uint256) {
        require(
            amount <= maxPerYear - yearlyClaimed,
            "TokenHolder::_claim: amount exceeds yearly limit"
        );

        // Reset the yearly claimed amount if it's a new year
        if (block.timestamp >= yearStartTimestamp) {
            yearStartTimestamp = nextJanuaryFirstTimestamp();
            yearlyClaimed = 0;
            emit YearlyReset();
        }

        yearlyClaimed += amount;

        // Emit event and transfer the tokens
        emit TokensClaimed(amount, msg.sender);
        token.safeTransfer(msg.sender, amount);

        return amount;
    }

    /**
     * @dev Helper function to get the timestamp of the next January 1st.
     * This function assumes that each year has 365.25 days, and can therefore be off
     * by a day in some years. We intentionally keep it as is for simplicity.
     * @return The timestamp of the next January 1st.
     */
    function nextJanuaryFirstTimestamp() private view returns (uint256) {
        uint256 currentYear = (block.timestamp / 31557600) + 1970;
        uint256 nextYearTimestamp = (currentYear + 1 - 1970) * 31557600;

        return nextYearTimestamp;
    }

    // Events
    event TokensClaimed(uint256 amount, address recipient);
    event YearlyReset();
}
