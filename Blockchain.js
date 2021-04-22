const { processTransactions } = require("./Transaction")
const { broadcastLatest } = require("./P2PServer")
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

let unspentTxOuts = [] // UnspentTxOut[]

const getUnspentTxOuts = () => {
    return unspentTxOuts
}

let chain = [genesisBlock] // Block[]

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

    // find block
    const difficulty = getDifficulty()
    const newBlock = findBlock(nextIndex, nextTimestamp, blockData, latestBlock.hash, difficulty)

    if (addBlockToChain(newBlock) === true) {
        broadcastLatest()
        return newBlock
    }

    return null
}

// // transaction
// const generateRawNextBlock = (blockData) => {
//     const previousBlock = getLatestBlock();
//     const nextIndex = previousBlock.index + 1;
//     const nextTimestamp = Date.now();
//
//     const difficulty = getDifficulty(getBlockchain());
//     const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
//
//     if (addBlockToChain(newBlock)) {
//         broadcastLatest()
//         return newBlock
//     }
//
//     return null
// }
//
// const generateNextBlock = () => {
//     const coinbaseTx = getCoinbaseTransaction(getPublicKey(getPrivateFromWallet), getLatestBlock().index + 1);
//     const blockData = [coinbaseTx];
//     return generateRawNextBlock(blockData);
// }
//
// const generateNextBlockWithTransaction = (receiverAddress, amount) => {
//     if (!isValidAddress(receiverAddress)) {
//         throw Error('invalid address');
//     }
//     if (typeof amount !== 'number') {
//         throw Error('invalid amount');
//     }
//     const coinbaseTx = getCoinbaseTransaction(getPublicKey(getPrivateFromWallet), getLatestBlock().index + 1);
//     const tx = createTransaction(receiverAddress, amount, getPrivateKeyFromWallet());
//     const blockData = [coinbaseTx, tx];
//     return generateRawNextBlock(blockData);
// }

const addBlockToChain = (newBlock) => {
    if (isValidBlock(newBlock, getLatestBlock())) {
        // process transactions before adding block of transactions into block chain
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

// replace chain: not by length, but by cumulative difficulty
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
}

const replaceChain = (newBlockChain) => {
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

module.exports = {
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
