const { expect } = require("chai");
const { ethers } = require("hardhat");

async function getCurrentBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
}

async function advanceTo12PMGMT() {
    const currentTimestamp = await getCurrentBlockTimestamp();
    const offsetTo12PMGMT = 12 * 60 * 60 - (currentTimestamp % (24 * 60 * 60));
    await ethers.provider.send("evm_increaseTime", [offsetTo12PMGMT]);
    await ethers.provider.send("evm_mine");
}

describe("LinearVester Contract Tests", function () {
    let Token;
    let token;
    let LinearVester;
    let linearVester;
    let owner;
    let recipient;
    let otherAccount;
    let vestingAmount;
    let vestingCliff;
    let startingBalance;

    beforeEach(async function () {
        // Deploy the ERC20 token and LinearVester contracts
        [owner] = await ethers.getSigners();

        // Create two additional wallets
        const wallet1 = ethers.Wallet.createRandom();
        const wallet2 = ethers.Wallet.createRandom();

        // Connect these wallets to the Hardhat network
        recipient = await wallet1.connect(ethers.provider);
        otherAccount = await wallet2.connect(ethers.provider);

        // Fund the wallets from the main account
        const tx1 = await owner.sendTransaction({
            to: recipient.address,
            value: ethers.utils.parseEther("1.0")
        });
        await tx1.wait();

        const tx2 = await owner.sendTransaction({
            to: otherAccount.address,
            value: ethers.utils.parseEther("1.0")
        });
        await tx2.wait();

        // Deploy Token
        Token = await ethers.getContractFactory("Elk");
        token = await Token.deploy();
        await token.deployed();

        LinearVester = await ethers.getContractFactory("LinearVester");
        vestingAmount = ethers.utils.parseUnits("10", 18);
        vestingCliff = 86400; // 1 day in seconds
        startingBalance = ethers.utils.parseUnits("100", 18);

        linearVester = await LinearVester.deploy(token.address, vestingAmount, vestingCliff, startingBalance);

        // Transfer tokens to LinearVester
        await token.transfer(linearVester.address, startingBalance);
    });

    describe("Vesting functionality", function () {
        it("Should not allow claiming or withdrawing before vesting is enabled", async function () {
            await expect(linearVester.claim()).to.be.revertedWith("LinearVester::claim: Vesting not enabled");
            await expect(linearVester.withdraw(vestingAmount)).to.be.revertedWith("LinearVester::withdraw: Vesting not enabled");
        });

        it("Should not allow starting vesting when recipient is not set", async function () {
            await expect(linearVester.startVesting(true)).to.be.revertedWith("LinearVester::startVesting: Recipient not set");
        });

        it("Should not allow a different account to claim", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);
            await advanceTo12PMGMT();
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            await expect(linearVester.connect(otherAccount).claim()).to.be.revertedWith("LinearVester::claim: Only recipient can claim");
        });

        it("Should not allow a different account to withdraw", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);
            await advanceTo12PMGMT();
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            // Claim tokens as the recipient
            await linearVester.connect(recipient).claim();

            // Attempt to withdraw from a different account
            await expect(linearVester.connect(otherAccount).withdraw(1)).to.be.revertedWith("LinearVester::withdraw: Only recipient can withdraw");
        });

        it("Should allow claiming after vesting is enabled and time is up", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);

            // Advance to 12 PM GMT and then the vesting cliff
            await advanceTo12PMGMT();
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            await expect(linearVester.connect(recipient).claim()).to.emit(linearVester, "TokensVested");
        });

        it("Should not allow double claiming", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            await linearVester.connect(recipient).claim();
            await expect(linearVester.connect(recipient).claim()).to.be.revertedWith("LinearVester::claim: Not time yet");
        });

        it("Should allow withdrawing claimed tokens", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            await linearVester.connect(recipient).claim();
            await expect(linearVester.connect(recipient).withdraw(vestingAmount)).to.emit(linearVester, "TokensWithdrawn");
        });

        it("Should not allow withdrawing more than claimed tokens", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);

            // Simulate passage of time to allow vesting
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            // Claim tokens
            await linearVester.connect(recipient).claim();

            // Attempt to withdraw more than claimed amount
            const overAmount = vestingAmount.add(ethers.utils.parseUnits("1", 18)); // 1 token more than vested
            await expect(linearVester.connect(recipient).withdraw(overAmount)).to.be.revertedWith("Insufficient vested balance");
        });

        it("Should allow partial withdrawal, claiming more, then withdrawing more", async function () {
            await linearVester.setRecipient(recipient.address);
            await linearVester.startVesting(true);
            await advanceTo12PMGMT();
            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            // First claim
            await linearVester.connect(recipient).claim();
            // First partial withdrawal
            await linearVester.connect(recipient).withdraw(vestingAmount.div(2));

            await ethers.provider.send("evm_increaseTime", [vestingCliff]);
            await ethers.provider.send("evm_mine");

            // Second claim
            await linearVester.connect(recipient).claim();

            // Calculate the total amount to withdraw the second time
            const totalVested = vestingAmount.mul(2); // Total vested after two claims
            const alreadyWithdrawn = vestingAmount.div(2);
            const amountToWithdraw = totalVested.sub(alreadyWithdrawn);

            // Second withdrawal of the remaining balance
            await expect(linearVester.connect(recipient).withdraw(amountToWithdraw)).to.emit(linearVester, "TokensWithdrawn");
        });
    });
});
