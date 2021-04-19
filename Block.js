const SHA256 = require('crypto-js/sha256');

class Block {
    constructor(index, timestamp, data, previousHash) {
        this.index = index
        this.timestamp = timestamp
        this.data = data
        this.previousHash = previousHash
        this.hash = calculateHashForBlock(this)
    }
}

const calculateHashForBlock = (block) => {
    return SHA256(
        block.index,
        block.timestamp,
        JSON.stringify(block.data),
        block.previousHash,
    ).toString();
}

module.exports = { Block, calculateHashForBlock }
