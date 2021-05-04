const SHA256 = require('crypto-js/sha256');

const calculateHashForBlock = (block) => {
    return SHA256(
        block.index +
        block.timestamp +
        JSON.stringify(block.data) +
        block.previousHash +
        block.difficulty +
        block.nonce
    ).toString();
}

class Block {
    constructor(index, timestamp, data, previousHash, difficulty, nonce) {
        this.index = index
        this.timestamp = timestamp
        this.data = data
        this.previousHash = previousHash
        this.difficulty = difficulty
        this.nonce = nonce
        this.hash = calculateHashForBlock(this)
    }
}

module.exports = { Block, calculateHashForBlock }
