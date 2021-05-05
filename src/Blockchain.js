const _ = require('lodash')
const fs = require('fs')
const hexToBinary = require('./util/hexToBinary')
const { Block, calculateHashForBlock } = require('./Block')
const { genesisTransaction, getCoinbaseTransaction, processTransactions } = require("./Transaction")
const { getPublicKeyFromWallet } = require("./Wallet")
const { getTransactionPool, updateTransactionPool } = require("./TransactionPool")

// Unspent transaction outputs
// let unspentTxOuts = processTransactions([genesisTransaction], 0, []) // UnspentTxOut[]

let unspentTxOuts = []

const getUnspentTxOuts = () => {
    return _.cloneDeep(unspentTxOuts)
}

const setUnspentTxOuts = (newUnspentTxOut) => {
    unspentTxOuts = newUnspentTxOut
}

// Blockchain
let chain = [] // Block[]

const blockchainLocation = 'node/blockchain/data'

const initBlockchain = () => {
    if (fs.existsSync(blockchainLocation)) {
        let buffer = fs.readFileSync(blockchainLocation, 'utf8')
        chain = JSON.parse(buffer)
        unspentTxOuts = processChain(chain)
        console.log("DSADSADSADAS: ", unspentTxOuts)
        return
    }

    chain = [genesisBlock]
    unspentTxOuts = processChain(chain)
    saveBlockchain()
}

const saveBlockchain = () => {
    fs.writeFileSync(blockchainLocation, JSON.stringify(chain), 'utf8')
}

const genesisBlock = new Block (
    0,
    1618302806719,
    [genesisTransaction],
    null,
    5,
    0
)

const getBlockchain = () => {
    return chain
}

const getLatestBlock = () => {
    return chain[chain.length - 1]
}

// Difficulty
const BLOCK_GENERATION_INTERVAL = 10 // How often (in seconds) a block should be found

const DIFFICULTY_ADJUSTMENT_INTERVAL = 10 // How often (in blocks) the difficulty should adjust to the hash rate

const getAdjustedDifficulty = () => {
    const latestBlock = getLatestBlock()
    const prevAdjustmentBlock = chain[chain.length - DIFFICULTY_ADJUSTMENT_INTERVAL]
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1
    } else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1
    } else {
        return prevAdjustmentBlock.difficulty
    }
}

const getDifficulty = () => {
    const latestBlock = getLatestBlock()
    if (latestBlock.index !== 0 &&
        latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0) {
        return getAdjustedDifficulty()
    } else {
        return latestBlock.difficulty
    }
}

// Find block with hash matches difficulty
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash)
    const requiredPrefix = '0'.repeat(difficulty)
    return hashInBinary.startsWith(requiredPrefix)
}

const findBlock = (index, timestamp, data, previousHash, difficulty) => {
    console.log("FIND BLOCK")

    let nonce = 0
    while (true) {
        const block = new Block(index, timestamp, data, previousHash, difficulty, nonce)
        if (hashMatchesDifficulty(block.hash, difficulty)) {
            return block
        }
        nonce++
    }
}

// Mine transactions to get new block
const generateNextBlock = () => {
    console.log("GENERATE NEXT BLOCK")

    const coinbaseTx = getCoinbaseTransaction(getPublicKeyFromWallet(), getLatestBlock().index + 1)
    const blockData = [coinbaseTx].concat(getTransactionPool())

    const previousBlock = getLatestBlock()
    const nextIndex = previousBlock.index + 1
    const nextTimestamp = Date.now()

    const difficulty = getDifficulty(getBlockchain())
    return findBlock(nextIndex, nextTimestamp, blockData, previousBlock.hash, difficulty)
}

// Add block to chain
const addBlockToChain = (newBlock) => {
    console.log("ADD BLOCK TO CHAIN")

    if (isValidBlock(newBlock, getLatestBlock())) {
        // process transactions before adding block of transactions into block chain
        const updateUnspentTxOuts = processTransactions(newBlock.data, newBlock.index, unspentTxOuts)
        if (updateUnspentTxOuts === null) {
            return false
        }
        chain.push(newBlock)
        saveBlockchain()
        setUnspentTxOuts(updateUnspentTxOuts)
        updateTransactionPool(unspentTxOuts)
        return true
    }
    return false
}

// replace chain: not by length, but by cumulative difficulty
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b)
}

const processChain = (newBlockchain) => {
    console.log("PROCESS CHAIN")

    let aUnspentTxOuts = []

    for (let i = 0; i < newBlockchain.length; i++) {
        const currentBlock = newBlockchain[i]

        aUnspentTxOuts = processTransactions(currentBlock.data, currentBlock.index, aUnspentTxOuts)
        if (aUnspentTxOuts === null) {
            console.log('Invalid transactions in blockchain')
            return null
        }
    }
    return aUnspentTxOuts
}

const replaceChain = (newBlockChain) => {
    if (isValidChain(newBlockChain) && getAccumulatedDifficulty(newBlockChain) > getAccumulatedDifficulty(chain)) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain.')
        const updateUnspentTxOuts = processChain(newBlockChain)
        if (updateUnspentTxOuts === null) {
            return false
        }
        chain = newBlockChain
        saveBlockchain()
        setUnspentTxOuts(updateUnspentTxOuts)
        updateTransactionPool(updateUnspentTxOuts)
        return true
    }
    console.log('Received blockchain is invalid.')
    return false
}

// is valid chain
const isValidBlockStructure = (block) => {
    return typeof block.index === 'number'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'object'
        && typeof block.previousHash === 'string'
        && typeof block.hash === 'string'
}

const isValidTimestamp = (newBlock, previousBlock) => {
    return (
        previousBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < Date.now()
    )
}

const isValidBlock = (currentBlock, previousBlock) => {
    console.log("IS VALID BLOCK")

    if (!isValidBlockStructure(currentBlock)) {
        console.log('New block invalid type.')
        return false
    }
    if (previousBlock.index + 1 !== currentBlock.index) {
        console.log('New block invalid index.')
        return false
    } else if (previousBlock.hash !== currentBlock.previousHash) {
        console.log('New block invalid previous hash.')
        return false
    }

    // timestamp validation
    else if (!isValidTimestamp(currentBlock, previousBlock)) {
        console.log('Invalid timestamp')
        return false
    }

    // hash match difficulty validation
    else if (!hashMatchesDifficulty(currentBlock.hash, currentBlock.difficulty)) {
        console.log('New block hash dont match difficulty')
        return false
    }

    else if (calculateHashForBlock(currentBlock) !== currentBlock.hash) {
        console.log('New block invalid hash.')
        return false
    }
    return true
}

const isValidChain = (blockchainToValidate) => {
    const isValidGenesis = (firstBlock) => {
        return JSON.stringify(firstBlock) === JSON.stringify(genesisBlock)
    }

    if (!isValidGenesis(blockchainToValidate[0])) {
        return false
    }

    for (let i = 1; i < blockchainToValidate.length; i++) {
        if (!isValidBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return false
        }
    }
    return true
}

module.exports = {
    initBlockchain,

    getUnspentTxOuts,

    getBlockchain,
    getLatestBlock,

    generateNextBlock,
    addBlockToChain,
    replaceChain,

    isValidBlockStructure,
    isValidBlock,
    isValidChain
}
