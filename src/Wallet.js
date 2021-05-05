const ecdsa = require('elliptic')
const ec = new ecdsa.ec('secp256k1')
const _ = require('lodash')
const fs = require('fs')
const binaryToHex = require('./util/binaryToHex')
const { Transaction } = require("./Transaction")
const { TxIn } = require("./TransactionInput")
const { TxOut } = require("./TransactionOutput")

// generate and get private and public key
const privateKeyLocation = 'node/wallet/private_key'

const initWallet = () => {
    if (fs.existsSync(privateKeyLocation)) {
        console.log('private key: ', getPrivateKeyFromWallet())
        console.log('public key: ', getPublicKeyFromWallet())
        return
    }

    const newPrivateKey = generatePrivateKey()
    fs.writeFileSync(privateKeyLocation, newPrivateKey)
    console.log('New wallet with private key created')
}

const generatePrivateKey = () => {
    const keyPair = ec.genKeyPair()
    const privateKey = keyPair.getPrivate()
    return privateKey.toString(16)
}

const getPrivateKeyFromWallet = () => {
    const buffer = fs.readFileSync(privateKeyLocation, 'utf8')
    return buffer.toString()
}

const getPublicKeyFromWallet = () => {
    const privateKey = getPrivateKeyFromWallet()
    return ec
        .keyFromPrivate(privateKey, 'hex')
        .getPublic()
        .encode('hex')
}

// get balance from a (public key === address)
const getBalance = (address, unspentTxOuts) => {
    console.log("GET BALANCE")

    // const address = getPublicKeyFromWallet()
    return _(unspentTxOuts)
        .filter((uTxO) => uTxO.address === address)
        .map((uTxO) => uTxO.amount)
        .sum()
}

// //create transaction
// remove any of my unspent transaction output === any transaction input in pool
// these in a pool has not been confirmed yet
const filterTxPoolTxs = (myUnspentTxOuts, transactionPool) => {
    console.log("FILTER TRANSACTION POOL")

    const txIns = _(transactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value()

    const removable = []
    for (const unspentTxOut of myUnspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn) => {
            return (
                aTxIn.txOutIndex === unspentTxOut.txOutIndex &&
                aTxIn.txOutTransactionId === unspentTxOut.txOutTransactionId
            )
        })
        if (txIn !== undefined) {
            removable.push(unspentTxOut)
        }
    }

    return _.without(myUnspentTxOuts, ...removable)
}

const findTxOutsForAmount = (address, amount, unspentTxOuts, transactionPool) => {
    console.log("FIND TRANSACTION OUTS FOR AMOUNT")

    let myUnspentTxOuts = unspentTxOuts.filter((uTxO) => uTxO.address === address)

    myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOuts, transactionPool)

    let currentAmount = 0
    const includedUnspentTxOuts = []
    for (const txOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(txOut)
        currentAmount = currentAmount + txOut.amount
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount
            return {includedUnspentTxOuts, leftOverAmount}
        }
    }

    throw Error('Not enough coins to make this transaction')
}

const signTransaction = (transaction) => {
    const dataToSign = transaction.id
    const key = ec.keyFromPrivate(getPrivateKeyFromWallet(), 'hex')
    const signature = binaryToHex(key.sign(dataToSign).toDER())

    return signature
}

const createTxOuts = (receiverAddress, amount, myAddress, leftOverAmount) => {
    console.log("CREATE TRANSACTION OUTS")

    const txOut1 = new TxOut(receiverAddress, amount)
    if (leftOverAmount === 0) {
        return [txOut1]
    } else {
        const leftOverTx = new TxOut(myAddress, leftOverAmount)
        return [txOut1, leftOverTx]
    }
}

const createTransaction = (receiverAddress, amount, unspentTxOuts, transactionPool) => {
    console.log("CREATE TRANSACTION")

    const myAddress = getPublicKeyFromWallet()

    const {includedUnspentTxOuts, leftOverAmount} = findTxOutsForAmount(myAddress, amount, unspentTxOuts, transactionPool)

    const txIns = includedUnspentTxOuts.map((unspentTxOut) => {
        const txIn = new TxIn()
        txIn.txOutTransactionId = unspentTxOut.txOutTransactionId
        txIn.txOutIndex = unspentTxOut.txOutIndex
        return txIn
    })

    const txOuts = createTxOuts(receiverAddress, amount, myAddress, leftOverAmount)

    const newTransaction = new Transaction(txIns, txOuts)
    newTransaction.txIns = newTransaction.txIns.map((txIn) => {
        txIn.signature = signTransaction(newTransaction)
        return txIn
    })

    return newTransaction
}

module.exports = {
    getPrivateKeyFromWallet,
    getPublicKeyFromWallet,

    initWallet, // important
    getBalance, // important
    createTransaction // important
}
