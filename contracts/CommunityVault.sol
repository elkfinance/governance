// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./TokenVault.sol";

/**
 * @title CommunityVault
 * @dev Contract to control the yearly release of tokens from the community vault.
 */
contract CommunityVault is TokenVault {
    /**
     * @dev Constructor for initializing the CommunityVault contract.
     * @param token_ The ERC20 token to be vested.
     * @param maxPerYear_ The maximum amount of tokens that can be claimed per year.
     */
    constructor(
        address token_, // 0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE
        uint256 maxPerYear_ // 2000000000000000000000000
    ) TokenVault(token_, maxPerYear_) {}
}
