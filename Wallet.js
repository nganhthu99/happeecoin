const ecdsa = require('elliptic')
const ec = new ecdsa.ec('secp256k1')
const { getUnspentTxOuts } = require("./Blockchain");
const { Transaction, getTransactionId, signTxIn } = require("./Transaction");
const { TxIn } = require("./TransactionInput");
const { TxOut } = require("./TransactionOutput");

// generate and get private and public key
const privateKeyLocation = 'node/wallet/private_key'

const generatePrivateKey = () => {
    const keyPair = ec.genKeyPair()
    const privateKey = keyPair.getPrivate()
    return privateKey.toString(16)
}

const initWallet = () => {
    // let's not override existing private keys
    if (existsSync(privateKeyLocation)) {
        return
    }

    const newPrivateKey = generatePrivateKey()
    writeFileSync(privateKeyLocation, newPrivateKey)
    console.log('new wallet with private key created')
}

const getPrivateKeyFromWallet = () => {
    const buffer = readFileSync(privateKeyLocation, 'utf8')
    return buffer.toString()
}

const getPublicKeyFromWallet = () => {
    const privateKey = getPrivateKeyFromWallet();
    return ec
        .keyFromPrivate(privateKey, 'hex')
        .getPublic()
        .encode('hex')
}

// get public key from private key
const getPublicKey = (privateKey) => {
    return ec
        .keyFromPrivate(privateKey, 'hex')
        .getPublic()
        .encode('hex')
}

// get balance from a (public key === address)
const getBalance = (address) => {
    const unspentTxOuts = getUnspentTxOuts()
    return _(unspentTxOuts)
        .filter((uTxO) => uTxO.address === address)
        .map((uTxO) => uTxO.amount)
        .sum();
}

// create transaction
const findTxOutsForAmount = (amount, address) => {
    const unspentTxOuts = getUnspentTxOuts()
    const myUnspentTxOuts = unspentTxOuts.filter((uTxO) => uTxO.address === address)

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

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TxOut(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
}

const createTransaction = (receiverAddress, amount, privateKey) => {

    const myAddress = getPublicKey(privateKey)

    const {includedUnspentTxOuts, leftOverAmount} = findTxOutsForAmount(amount, myAddress)

    const toUnsignedTxIn = (unspentTxOut) => {
        const txIn = new TxIn()
        txIn.txOutTransactionId = unspentTxOut.txOutTransactionId
        txIn.txOutIndex = unspentTxOut.txOutIndex
        return txIn
    }

    const newTransaction = new Transaction()

    newTransaction.txIns = includedUnspentTxOuts.map(toUnsignedTxIn)
    newTransaction.txIns = newTransaction.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(newTransaction, index, privateKey)
        return txIn
    })
    newTransaction.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount)
    newTransaction.id = getTransactionId(newTransaction)

    return newTransaction
}

module.exports = {
    getPrivateKeyFromWallet,
    getPublicKeyFromWallet,

    getPublicKey,
    getBalance,
    createTransaction
}
