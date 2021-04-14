const Block = require('./Block')
const Blockchain = require('./Blockchain')

const genesisBlock = new Block (
    0,
    1618302806719,
    'Genesis Block',
    null
)

const blockchain = new Blockchain([genesisBlock])

module.exports = { genesisBlock, blockchain }
