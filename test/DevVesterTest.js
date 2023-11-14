const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevVester Contract Tests", function () {
    let Token, token, DevVester, devVester;
    let owner, recipient;
    let vestingAmount, vestingCliff, startingBalance;

    const JULY_1_2022 = 1656676800; // July 1, 2022 at 12pm GMT

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Create one additional wallet
        const wallet = ethers.Wallet.createRandom();
        recipient = await wallet.connect(ethers.provider);

        // Fund the wallet from the main account
        const tx = await owner.sendTransaction({
            to: recipient.address,
            value: ethers.utils.parseEther("1.0")
        });
        await tx.wait();

        // Deploy Token
        Token = await ethers.getContractFactory("Elk");
        token = await Token.deploy();
        await token.deployed();

        // Set vesting parameters
        vestingAmount = ethers.utils.parseUnits("10", 18); // Example amount
        vestingCliff = 24 * 60 * 60; // 1 day in seconds
        startingBalance = ethers.utils.parseUnits("1000000", 18); // Example balance

        // Deploy DevVester
        DevVester = await ethers.getContractFactory("DevVester");
        devVester = await DevVester.deploy(token.address, vestingAmount, vestingCliff, startingBalance);

        // Transfer tokens to DevVester contract
        await token.transfer(devVester.address, startingBalance);
    });

    it("Should let the recipient claim and withdraw as many tokens as vesting cliffs between July 1st 2022 and now", async function () {
        await devVester.setRecipient(recipient.address);
        await devVester.startVesting(false); // do not reset

        const currentTimestamp = await getCurrentBlockTimestamp();
        const numberOfCliffsPassed = Math.floor((currentTimestamp - JULY_1_2022) / vestingCliff);
        const expectedVestedAmount = ethers.BigNumber.from(vestingAmount).mul(numberOfCliffsPassed);

        await devVester.connect(recipient).claim();
        expect(await devVester.vestedBalance()).to.equal(expectedVestedAmount);

        await devVester.connect(recipient).withdraw(expectedVestedAmount);

        // Verify the recipient's token balance
        const recipientBalance = await token.balanceOf(recipient.address);
        expect(recipientBalance).to.equal(expectedVestedAmount);
    });

    it("Subsequent claims should not allow vesting or withdrawing more tokens than normally would be vested/withdrawn without \"gaps\"", async function () {
        await devVester.setRecipient(recipient.address);
        await devVester.startVesting(false); // do not reset

        // First claim to get the total vested amount since July 1, 2022
        await devVester.connect(recipient).claim();
        const initialVestedBalance = await devVester.vestedBalance();

        // Wait for one more vesting cliff
        await advanceTime(vestingCliff);
        await ethers.provider.send("evm_mine");

        // Second claim
        await devVester.connect(recipient).claim();

        // Calculate the expected total vested amount
        const expectedTotalVested = initialVestedBalance.add(vestingAmount);
        const totalVestedBalance = await devVester.vestedBalance();
        expect(totalVestedBalance).to.equal(expectedTotalVested);

        // Withdraw the total vested balance
        await devVester.connect(recipient).withdraw(totalVestedBalance);

        // Verify the recipient's token balance
        const recipientBalance = await token.balanceOf(recipient.address);
        expect(recipientBalance).to.equal(totalVestedBalance);
    });

    async function getCurrentBlockTimestamp() {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        return block.timestamp;
    }

    async function advanceTime(time) {
        await ethers.provider.send("evm_increaseTime", [time]);
        await ethers.provider.send("evm_mine");
    }
});
