const _ = require('lodash')
const { validateTransaction, findUnspentTxOut } = require("./Transaction")

let transactionPool = [] // Transaction[]

const getTransactionPool = () => {
    return _.cloneDeep(transactionPool)
}

// new rule for transaction to add to pool: a transaction cannot be added to pool
// if any of the transaction inputs are already found in the existing transaction pool
const isValidTxForPool = (transaction) => {
    const getTxPoolIns = (pool) => {
        return _(pool)
            .map((tx) => tx.txIns)
            .flatten()
            .value()
    }

    const txPoolIns = getTxPoolIns(transactionPool)

    const containsTxIn = (txIns, txIn) => {
        return _.find(txPoolIns, (txPoolIn => {
            return (
                txIn.txOutIndex === txPoolIn.txOutIndex &&
                txIn.txOutTransactionId === txPoolIn.txOutTransactionId
            )
        }))
    }

    for (const txIn of transaction.txIns) {
        if (containsTxIn(txPoolIns, txIn)) {
            console.log('txIn already found in the txPool')
            return false
        }
    }

    return true
}

const addTransactionToPool = (transaction, unspentTxOuts) => {
    console.log("ADD TRANSACTION TO POOL")

    if (!validateTransaction(transaction, unspentTxOuts)) {
        throw Error('Trying to add invalid tx to pool')
    }

    if (!isValidTxForPool(transaction)) {
        throw Error('Trying to add invalid tx to pool')
    }

    console.log('Adding to txPool: %s', JSON.stringify(transaction))
    transactionPool.push(transaction)
}

// Revalidate the transaction pool every time a new block is found
const updateTransactionPool = (unspentTxOuts) => {
    console.log("UPDATE TRANSACTION POOL")

    const invalidTxs = []
    for (const tx of transactionPool) {
        for (const txIn of tx.txIns) {
            if (!findUnspentTxOut(txIn, unspentTxOuts)) {
                invalidTxs.push(tx)
                break
            }
        }
    }
    if (invalidTxs.length > 0) {
        console.log('Removing the following transactions from txPool: %s', invalidTxs)
        transactionPool = _.without(transactionPool, ...invalidTxs)
    }
}

module.exports = {
    getTransactionPool,
    updateTransactionPool,
    addTransactionToPool
}
