const typechain = require('hardhat-typechain');
const ethers = require('@nomiclabs/hardhat-ethers');
const waffle = require('@nomiclabs/hardhat-waffle');
const etherscan = require('@nomiclabs/hardhat-etherscan');
const solhint = require('@nomiclabs/hardhat-solhint');

require('dotenv').config();
const privateKey = process.env.PRIVATE_KEY;

const { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } = require("hardhat/builtin-tasks/task-names");
const path = require("path");

// Ignore TokenVester.sol as that was compiled and deployed on a different version
// Workaround credits: https://github.com/fvictorio/hardhat-examples/tree/master/ignore-solidity-files
subtask(
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  async (_, { config }, runSuper) => {
    const paths = await runSuper();
    return paths
      .filter(solidityFilePath => {
        const relativePath = path.relative(config.paths.sources, solidityFilePath)
        return relativePath !== "TokenVester.sol";
      })
  }
);

module.exports = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      accounts: [{ privateKey: privateKey, balance: '1000000000000000000000' }],
    },
    fuji: {
      url: `https://api.avax-test.network/ext/bc/C/rpc`,
      accounts: [privateKey],
    },
    mumbai: {
      url: `https://rpc.ankr.com/polygon_mumbai`,
      accounts: [privateKey],
    },
    fantom_testnet: {
      url: `https://rpc.testnet.fantom.network`,
      accounts: [privateKey],
    },
    goerli: {
      url: `https://rpc.ankr.com/eth_goerli`,
      accounts: [privateKey],
    },
    avalanche: {
      url: `https://api.avax.network/ext/bc/C/rpc`,
      accounts: [privateKey],
    },
    polygon: {
      url: `https://polygon-rpc.com`,
      accounts: [privateKey],
    },
    bnb: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: [privateKey],
    },
    linea: {
      url: `https://rpc.linea.build`,
      accounts: [privateKey],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.8.18/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
}
