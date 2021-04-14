const Block = require('./Block')
// const genesisBlock = require('./Global').genesisBlock;

module.exports = class Blockchain {
    constructor(chain) {
        this.chain = chain
    }

    getBlockchain() {
        return this.chain
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }

    generateNextBlock(blockData) {
        const previousBlock = this.getLatestBlock()
        const nextIndex = previousBlock.index + 1
        const nextTimestamp = Date.now()
        const newBlock = new Block(nextIndex, nextTimestamp, blockData, previousBlock.hash)
        if (this.addBlockToChain(newBlock) === true) {
            // broadcastLatest()
            return newBlock
        }
        return null
    }

    addBlockToChain(newBlock) {
        if (this.isValidBlock(newBlock, this.getLatestBlock())) {
            this.chain.push(newBlock)
            return true
        }
        return false
    }

    isValidBlockStructure(block) {
        return typeof block.index === 'number'
            && typeof block.timestamp === 'number'
            && typeof block.data === 'string'
            && typeof block.previousHash === 'string'
            && typeof block.hash === 'string'
    }

    isValidBlock(currentBlock, previousBlock) {
        if (!this.isValidBlockStructure(currentBlock)) {
            console.log('New block invalid type.')
            return false
        }
        if (previousBlock.index + 1 !== currentBlock.index) {
            console.log('New block invalid index.')
            return false
        } else if (previousBlock.hash !== currentBlock.previousHash) {
            console.log('New block invalid previous hash.')
            return false
        } else if (currentBlock.calculateHash() !== currentBlock.hash) {
            console.log('New block invalid hash.')
            return false
        }
        return true
    }

    isValidChain (blockchainToValidate) {
        // const isValidGenesis = (firstBlock) => {
        //     return JSON.stringify(firstBlock) === JSON.stringify(genesisBlock)
        // }
        //
        // if (!isValidGenesis(blockchainToValidate[0])) {
        //     return false
        // }
        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (!this.isValidBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
                return false
            }
        }
        return true
    };

    replaceChain(newBlockChain) {
        if (this.isValidChain(newBlockChain) && newBlockChain.length > this.getBlockchain().length) {
            console.log('Received blockchain is valid.\nReplacing current blockchain with received blockchain.')
            this.chain = newBlockChain
            // broadcastLatest()
        } else {
            console.log('Received blockchain is invalid.')
        }
    }
}
