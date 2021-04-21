const { processTransactions } = require("./Transaction");
const { broadcastLatest } = require("./P2PServer");
const { Block, calculateHashForBlock } = require('./Block')
const { hexToBinary } = require('./util/hexToBinary')

const genesisBlock = new Block (
    0,
    1618302806719,
    'Genesis Block',
    null,
    0,
    0
)

let chain = [genesisBlock]

// unspent transaction output
let unspentTxOuts = [] // UnspentTxOut[]

const getBlockchain = () => {
    return chain
}

const getLatestBlock = () => {
    return chain[chain.length - 1]
}

const generateNextBlock = (blockData) => {
    const latestBlock = getLatestBlock()
    const nextIndex = latestBlock.index + 1
    const nextTimestamp = Date.now()

    // const newBlock = new Block(nextIndex, nextTimestamp, blockData, latestBlock.hash)

    // find block
    const difficulty = getDifficulty()
    const newBlock = findBlock(nextIndex, nextTimestamp, blockData, latestBlock.hash, difficulty)

    if (addBlockToChain(newBlock) === true) {
        broadcastLatest()
        return newBlock
    }
    return null
}

const addBlockToChain = (newBlock) => {
    if (isValidBlock(newBlock, getLatestBlock())) {
        // transaction
        const retVal = processTransactions(newBlock.data, unspentTxOuts, newBlock.index)
        if (retVal === null) {
            return false
        }
        unspentTxOuts = retVal

        chain.push(newBlock)
        return true
    }
    return false
}

const replaceChain = (newBlockChain) => {
    // if (isValidChain(newBlockChain) &&
    //     newBlockChain.length > getBlockchain().length) {
    //     console.log('Received blockchain is valid.' +
    //         '\nReplacing current blockchain with received blockchain.')
    //     chain = newBlockChain
    //     broadcastLatest()
    // }

    // replace chain: not by length, but by cumulative difficulty
    if (isValidChain(newBlockChain) &&
        getAccumulatedDifficulty(newBlockChain) > getAccumulatedDifficulty(chain)) {
        console.log('Received blockchain is valid.' +
            '\nReplacing current blockchain with received blockchain.')
        chain = newBlockChain
        broadcastLatest()
    }
    else {
        console.log('Received blockchain is invalid.')
    }
}

// general
const isValidBlockStructure = (block) => {
    return typeof block.index === 'number'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'object'
        && typeof block.previousHash === 'string'
        && typeof block.hash === 'string'
}

// general
const isValidBlock = (currentBlock, previousBlock) => {
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
    else if (hashMatchesDifficulty(currentBlock.hash, currentBlock.difficulty)) {
        console.log('New block hash dont match difficulty')
        return false
    }

    else if (calculateHashForBlock(currentBlock) !== currentBlock.hash) {
        console.log('New block invalid hash.')
        return false
    }
    return true
}

// general
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

// difficulty
const BLOCK_GENERATION_INTERVAL = 10 // How often (in seconds) a block should be found

const DIFFICULTY_ADJUSTMENT_INTERVAL = 10 // How often (in blocks) the difficulty should adjust to the hash rate

const getDifficulty = () => {
    const latestBlock = getLatestBlock()
    if (latestBlock.index !== 0 &&
        latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0) {
        return getAdjustedDifficulty()
    } else {
        return latestBlock.difficulty
    }
}

const getAdjustedDifficulty = () => {
    const latestBlock = getLatestBlock()
    const prevAdjustmentBlock = chain[chain.length - DIFFICULTY_ADJUSTMENT_INTERVAL]
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    } else {
        return prevAdjustmentBlock.difficulty;
    }
}

// timestamp validation
const isValidTimestamp = (newBlock, previousBlock) => {
    return (
        previousBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < Date.now()
    )
}

// find block
const findBlock = (index, timestamp, data, previousHash, difficulty) => {
    let nonce = 0
    while (true) {
        const block = new Block(index, timestamp, data, previousHash, difficulty, nonce)
        const hash = calculateHashForBlock(block)
        if (hashMatchesDifficulty(hash, difficulty)) {
            return block
        }
        nonce++
    }
}

// hash validation
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash)
    const requiredPrefix = '0'.repeat(difficulty)
    return hashInBinary.startsWith(requiredPrefix)
}

// replace chain: not by length, but by cumulative difficulty
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
}

module.exports = {
    getBlockchain,
    getLatestBlock,
    generateNextBlock,
    addBlockToChain,
    replaceChain,
    isValidBlockStructure,
    isValidBlock,
    isValidChain
}
