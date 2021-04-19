const { broadcastLatest } = require("./P2PServer");
const { Block, calculateHashForBlock } = require('./Block')

const genesisBlock = new Block (
    0,
    1618302806719,
    'Genesis Block',
    null
)

let chain = [genesisBlock]

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
    const newBlock = new Block(nextIndex, nextTimestamp, blockData, latestBlock.hash)
    if (addBlockToChain(newBlock) === true) {
        broadcastLatest()
        return newBlock
    }
    return null
}

const addBlockToChain = (newBlock) => {
    if (isValidBlock(newBlock, getLatestBlock())) {
        chain.push(newBlock)
        return true
    }
    return false
}

const replaceChain = (newBlockChain) => {
    if (isValidChain(newBlockChain) && newBlockChain.length > getBlockchain().length) {
        console.log('Received blockchain is valid.' +
            '\nReplacing current blockchain with received blockchain.')
        chain = newBlockChain
        broadcastLatest()
    } else {
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
    } else if (calculateHashForBlock(currentBlock) !== currentBlock.hash) {
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
