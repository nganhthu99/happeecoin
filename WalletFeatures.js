const { getBalance, createTransaction } = require("./Wallet")
const { getTransactionPool, addTransactionToPool } = require("./TransactionPool")
const { getUnspentTxOuts, generateNextBlock, addBlockToChain } = require("./Blockchain")
const { broadcastLatest, broadcastTransactionPool } = require("./P2PServer")

const getBalanceAccount = () => {
    return getBalance(getUnspentTxOuts())
}

const sendTransaction = (receiverAddress, amount) => {
    const newTransaction = createTransaction(receiverAddress, amount, getUnspentTxOuts(), getTransactionPool())
    addTransactionToPool(newTransaction, getUnspentTxOuts())
    broadcastTransactionPool()
    return newTransaction
}

const mineBlock = () => {
    const newBlock = generateNextBlock()
    if (addBlockToChain(newBlock)) {
        broadcastLatest()
        return newBlock
    }
    return null
}

module.exports = {
    getBalanceAccount,
    sendTransaction,
    mineBlock
}

