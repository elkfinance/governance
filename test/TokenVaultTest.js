const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper function to increase time
async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
}

// One year in seconds (using 365.25 days per year as in the contract)
const ONE_YEAR = 31557600;

describe("TokenVault Contract Tests", function () {
    let Token;
    let token;
    let TokenVault;
    let tokenVault;
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

        // Deploy TokenVault
        TokenVault = await ethers.getContractFactory("TokenVault");
        tokenVault = await TokenVault.deploy(token.address, maxPerYear);
        await tokenVault.deployed();

        // Transfer starting balance to TokenVault
        await token.transfer(tokenVault.address, startingBalance);
    });

    it("claim now should work", async function () {
        await expect(tokenVault.claim(maxPerYear)).to.emit(tokenVault, "TokensClaimed").withArgs(maxPerYear, owner.address);
    });

    it("claim over limit now should fail", async function () {
        await expect(tokenVault.claim(maxPerYear.add(1))).to.be.revertedWith("TokenHolder::_claim: amount exceeds yearly limit");
    });

    it("next year claim should work", async function () {
        await increaseTime(ONE_YEAR);
        await expect(tokenVault.claim(maxPerYear)).to.emit(tokenVault, "TokensClaimed").withArgs(maxPerYear, owner.address);
    });

    it("claim over limit next year should fail again", async function () {
        await increaseTime(ONE_YEAR);
        await expect(tokenVault.claim(maxPerYear.add(1))).to.be.revertedWith("TokenHolder::_claim: amount exceeds yearly limit");
    });

    it("year after claim should work again", async function () {
        await increaseTime(ONE_YEAR * 2);
        await expect(tokenVault.claim(maxPerYear)).to.emit(tokenVault, "TokensClaimed").withArgs(maxPerYear, owner.address);
    });

    it("skip two years without claiming and claim again, making sure that the amount claimable is only for that year and not the skipped years", async function () {
        await increaseTime(ONE_YEAR * 3);
        await expect(tokenVault.claim(maxPerYear)).to.emit(tokenVault, "TokensClaimed").withArgs(maxPerYear, owner.address);
        await expect(tokenVault.claim(1)).to.be.revertedWith("TokenHolder::_claim: amount exceeds yearly limit");
    });
});

