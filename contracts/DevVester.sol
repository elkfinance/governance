// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./LinearVester.sol";

/**
 * @title DevVester
 * @dev Contract to control the vesting of ELK to the devs.
 */
contract DevVester is LinearVester {
    // ELK distribution plan: 1000 ELK per 24 hours (86400 seconds).

    constructor(
        address elk_, // 0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE
        uint256 vestingAmount_, // 1000000000000000000000
        uint256 vestingCliff_, // 86400
        uint256 startingBalance_ // 2000000000000000000000000
    ) LinearVester(elk_, vestingAmount_, vestingCliff_, startingBalance_) {
        lastUpdate = 1656676800; // July 1, 2022 at 12pm GMT
    }
}
