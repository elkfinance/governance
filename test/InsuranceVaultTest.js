const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper function to increase time
async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
}

// One year in seconds (using 365.25 days per year as in the contract)
const ONE_YEAR = 31557600;

describe("InsuranceVault Contract Tests", function () {
    let Token;
    let token;
    let InsuranceVault;
    let insuranceVault;
    let owner;
    let addr1;
    let startingBalance;
    let maxPerYear;

    beforeEach(async function () {
        // Setup accounts
        [owner, addr1] = await ethers.getSigners();

        // Deploy Token
        Token = await ethers.getContractFactory("Elk");
        token = await Token.deploy();
        await token.deployed();

        // Set starting balance and max per year
        startingBalance = ethers.utils.parseUnits("100", 18);
        maxPerYear = ethers.utils.parseUnits("10", 18);

        // Deploy InsuranceVault
        InsuranceVault = await ethers.getContractFactory("InsuranceVault");
        insuranceVault = await InsuranceVault.deploy(token.address, maxPerYear);
        await insuranceVault.deployed();

        // Transfer starting balance to InsuranceVault
        await token.transfer(insuranceVault.address, startingBalance);
    });

    it("should allow claiming up to the yearly limit", async function () {
        await expect(insuranceVault.claim(maxPerYear)).to.emit(insuranceVault, "TokensClaimed").withArgs(maxPerYear, owner.address);
    });

    it("should not allow claiming more than the yearly limit", async function () {
        await expect(insuranceVault.claim(maxPerYear.add(1))).to.be.revertedWith("TokenHolder::_claim: amount exceeds yearly limit");
    });

    it("should allow burning tokens less than the contract's balance, independent of the claim limit", async function () {
        await increaseTime(ONE_YEAR);

        // Claim some tokens first
        await insuranceVault.claim(maxPerYear);

        // Burn tokens, which should not be affected by the claim limit
        const burnAmount = ethers.utils.parseUnits("5", 18);
        await expect(insuranceVault.burnTokens(burnAmount)).to.not.be.reverted;
    });

    it("should not allow burning more tokens than the contract's balance", async function () {
        const burnAmount = ethers.utils.parseUnits("101", 18); // More than startingBalance
        await expect(insuranceVault.burnTokens(burnAmount)).to.be.revertedWith("InsuranceVault::burnTokens: amount exceeds balance");
    });
});

