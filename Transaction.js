const ecdsa = require('elliptic')
const ec = new ecdsa.ec('secp256k1')
const SHA256 = require('crypto-js/sha256')
const _ = require('lodash')
const { TxOut } = require("./TransactionOutput")
const { TxIn } = require("./TransactionInput")
const { UnspentTxOut } = require("./UnspentTransactionOutput")

const getTransactionId = (transaction) => {
    const txInContent = transaction.txIns
        .map((txIn) => txIn.txOutTransactionId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '')

    const txOutContent = transaction.txOuts
        .map((txOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '')

    return SHA256(txInContent + txOutContent).toString()
}

class Transaction {
    constructor(txIns, txOuts) {
        this.txIns = txIns // TxIn[]
        this.txOuts = txOuts // TxOut[]
        this.id = getTransactionId(this)
    }
}

const genesisTransaction = new Transaction(
    [{
        'signature': '',
        'txOutTransactionId': '',
        'txOutIndex': 0
    }],
    [{
        'address': '040ccac3f0823a62c40f2521efb5f3888775e39dc25e225beddbe81f32e3a37d8b3aea125d465b50a9387091b735da378641fff0e09d281f68330b9b408f0153d8',
        'amount': 50
    }]
)

// get coinbase reward transaction
const COINBASE_AMOUNT = 50

const getCoinbaseTransaction = (address, blockIndex) => {
    console.log("GET COINBASE TRANSACTION")

    const txIns = [new TxIn("", blockIndex, "")]
    const txOuts = [new TxOut(address, COINBASE_AMOUNT)]
    return new Transaction(txIns, txOuts)
}

// isValidTransactionsStructure
const isValidAddress = (address) => {
    if (address.length !== 130) {
        console.log('Invalid public key length')
        return false
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('Public key must contain only hex characters')
        return false
    } else if (!address.startsWith('04')) {
        console.log('Public key must start with 04')
        return false
    }
    return true
}

const isValidTxOutStructure = (txOut) => {
    if (txOut == null) {
        console.log('txOut is null')
        return false
    } else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut')
        return false
    } else if (!isValidAddress(txOut.address)) {
        console.log('invalid TxOut address')
        return false
    } else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut')
        return false
    } else {
        return true
    }
}

const isValidTxInStructure = (txIn) => {
    if (txIn == null) {
        console.log('txIn is null')
        return false
    } else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn')
        return false
    } else if (typeof txIn.txOutTransactionId !== 'string') {
        console.log('invalid txOutId type in txIn')
        return false
    } else if (typeof  txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn')
        return false
    } else {
        return true
    }
}

const isValidTransactionStructure = (transaction) => {
    if (typeof transaction.id !== 'string') {
        console.log('TransactionId missing')
        return false
    }

    if (!(transaction.txIns instanceof Array)) {
        console.log('Invalid txIns type in transaction')
        return false
    }
    if (!transaction.txIns
        .map(isValidTxInStructure)
        .reduce((a, b) => (a && b), true)) {
        return false
    }

    if (!(transaction.txOuts instanceof Array)) {
        console.log('invalid txIns type in transaction')
        return false
    }
    if (!transaction.txOuts
        .map(isValidTxOutStructure)
        .reduce((a, b) => (a && b), true)) {
        return false
    }

    return true
}

const isValidTransactionsStructure = (transactions) => {
    console.log("IS VALID TRANSACTIONS STRUCTURE")

    return transactions
        .map(isValidTransactionStructure)
        .reduce((a, b) => (a && b), true)
}

// validateBlockTransactions
const validateTxIn = (txIn, transaction, unspentTxOuts) => {
    console.log("VALIDATE TRANSACTION IN")

    const referencedUTxOut = findUnspentTxOut(txIn, unspentTxOuts)

    if (referencedUTxOut == null) {
        console.log('Referenced txOut not found: ' + JSON.stringify(txIn))
        return false
    }

    const key = ec.keyFromPublic(referencedUTxOut.address, 'hex')
    return key.verify(transaction.id, txIn.signature)
}

const validateTransaction = (transaction, unspentTxOuts) => {
    console.log("VALIDATE TRANSACTION")

    if (getTransactionId(transaction) !== transaction.id) {
        console.log('Invalid tx id: ' + transaction.id)
        return false
    }

    const hasValidTxIns = transaction.txIns
        .map((txIn) => validateTxIn(txIn, transaction, unspentTxOuts))
        .reduce((a, b) => a && b, true)
    if (!hasValidTxIns) {
        console.log('Some of the txIns are invalid in tx: ' + transaction.id)
        return false
    }

    const totalTxInValues = transaction.txIns
        .map((txIn) => findUnspentTxOut(txIn, unspentTxOuts).amount)
        .reduce((a, b) => (a + b), 0)
    const totalTxOutValues = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0)
    if (totalTxOutValues !== totalTxInValues) {
        console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id)
        return false
    }

    return true
}

const validateCoinbaseTx = (transaction, blockIndex) => {
    if (transaction == null) {
        console.log('The first transaction in the block must be coinbase transaction')
        return false
    }
    if (getTransactionId(transaction) !== transaction.id) {
        console.log('Invalid coinbase tx id: ' + transaction.id)
        return false
    }
    if (transaction.txIns.length !== 1) {
        console.log('One txIn must be specified in the coinbase transaction')
        return false
    }
    if (transaction.txIns[0].txOutIndex !== blockIndex) {
        console.log('The txIn signature in coinbase tx must be the block height')
        return false
    }
    if (transaction.txOuts.length !== 1) {
        console.log('Invalid number of txOuts in coinbase transaction')
        return false
    }
    if (transaction.txOuts[0].amount !== COINBASE_AMOUNT) {
        console.log('Invalid coinbase amount in coinbase transaction')
        return false
    }
    return true
}

const validateBlockTransactions = (transactions, blockIndex, unspentTxOuts) => {
    console.log("VALIDATE BLOCK TRANSACTIONS")

    const hasDuplicates = (txIns) => {
        const groups = _.countBy(txIns, (txIn) => txIn.txOutTransactionId + txIn.txOutTransactionId)
        return _(groups)
            .map((value, key) => {
                if (value > 1) {
                    console.log('Duplicate txIn: ' + key)
                    return true
                } else {
                    return false
                }
            })
            .includes(true)
    }

    const coinbaseTx = transactions[0]
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log('Invalid coinbase transaction: ' + JSON.stringify(coinbaseTx))
        return false
    }

    //check for duplicate txIns. Each txIn can be included only once
    const txIns = _(transactions)
        .map(tx => tx.txIns)
        .flatten()
        .value()
    if (hasDuplicates(txIns)) {
        return false
    }

    // all but coinbase transactions
    const normalTransactions = transactions.slice(1)
    return normalTransactions
        .map((tx) => validateTransaction(tx, unspentTxOuts))
        .reduce((a, b) => (a && b), true)
}

// process transactions
// find if a transaction input existed in the unspent transaction outputs
const findUnspentTxOut = (txIn, unspentTxOuts) => {
    console.log("FIND UNSPENT TRANSACTION OUT")

    return unspentTxOuts.find((uTxO) => {
        return (
            uTxO.txOutTransactionId === txIn.txOutTransactionId &&
            uTxO.txOutIndex === txIn.txOutIndex
        )
    })
}

// update unspent transaction outputs after making new transactions
const updateUnspentTxOuts = (newTransactions, unspentTxOuts) => {
    console.log("UPDATE UNSPENT TRANSACTION OUTS")

    const newUnspentTxOuts = newTransactions
        .map((t) => t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount)))
        .reduce((a, b) => a.concat(b), [])

    const consumedTxOuts = newTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutTransactionId, txIn.txOutIndex, '', 0))

    return unspentTxOuts
        .filter((uTxO) => !findUnspentTxOut(uTxO, consumedTxOuts))
        .concat(newUnspentTxOuts)
}

const processTransactions = (transactions, blockIndex, unspentTxOuts) => {
    console.log("PROCESS TRANSACTIONS")

    if (!isValidTransactionsStructure(transactions)) {
        return null
    }

    if (!validateBlockTransactions(transactions, blockIndex, unspentTxOuts)) {
        console.log('Invalid block transactions')
        return null
    }

    return updateUnspentTxOuts(transactions, unspentTxOuts)
}

module.exports = {
    Transaction,
    getTransactionId,
    genesisTransaction,
    getCoinbaseTransaction,

    processTransactions, // important: add block
    updateUnspentTxOuts,

    findUnspentTxOut,
    validateTransaction,
    isValidAddress
}

