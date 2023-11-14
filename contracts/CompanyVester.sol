// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./LinearVester.sol";

/**
 * @title CompanyVester
 * @dev Contract to control the vesting of ELK to the service company.
 */
contract CompanyVester is LinearVester {
    // ELK distribution plan: 10000 ELK per week (604800 seconds).

    constructor(
        address elk_, // 0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE
        uint256 vestingAmount_, // 10000000000000000000000
        uint256 vestingCliff_, // 604800
        uint256 startingBalance_ // 5000000000000000000000000
    ) LinearVester(elk_, vestingAmount_, vestingCliff_, startingBalance_) {
        lastUpdate = 1656763200; // July 2, 2022 at 12pm GMT
    }
}
