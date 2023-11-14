// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenVault.sol";

/**
 * @title InsuranceVault
 * @dev Contract to control the Elk insurance fund.
 */
contract InsuranceVault is TokenVault {
    using SafeERC20 for IERC20;

    /**
     * @dev Constructor for initializing the InsuranceVault contract.
     * @param token_ The ERC20 token to be vested.
     * @param maxPerYear_ The maximum amount of tokens that can be claimed per year.
     */
    constructor(
        address token_, // 0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE
        uint256 maxPerYear_ // 2000000000000000000000000
    ) TokenVault(token_, maxPerYear_) {}

    /**
     * @dev Function to burn tokens from the contract's balance.
     * Can only be called by the contract owner.
     * @param amount The amount of tokens to burn.
     */
    function burnTokens(uint256 amount) external onlyOwner {
        require(
            amount <= token.balanceOf(address(this)),
            "InsuranceVault::burnTokens: amount exceeds balance"
        );

        token.safeTransfer(address(0xdead), amount);

        emit TokensBurned(amount);
    }

    // Events
    event TokensBurned(uint256 amount);
}
