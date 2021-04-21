const SHA256 = require('crypto-js/sha256');
const binaryToHex = require('./util/binaryToHex')
const { getPublicKey } = require("./Wallet");
const { TxOut } = require("./TransactionOutput");
const { TxIn } = require("./TransactionInput");
const { UnspentTxOut } = require("./UnspentTransactionOutput");

const COINBASE_AMOUNT = 50;

class Transaction {
    constructor(txIns, txOuts) {
        this.txIns = txIns // TxIn[]
        this.txOuts = txOuts // TxOut[]
        this.id = getTransactionId(this)
    }
}

const getTransactionId = (transaction) => {
    const txInContent = transaction.txIns
        .map((txIn) => txIn.txOutTransactionId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');

    const txOutContent = transaction.txOuts
        .map((txOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');

    return SHA256(txInContent + txOutContent).toString();
}

const getCoinbaseTransaction = (address, blockIndex) => {
    const t = new Transaction();
    const txIn = new TxIn();
    txIn.signature = "";
    txIn.txOutTransactionId = "";
    txIn.txOutIndex = blockIndex;

    t.txIns = [txIn];
    t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
    t.id = getTransactionId(t);
    return t;
}

const findUnspentTxOut = (txOutTransactionId, txOutIndex, unspentTxOuts) => {
    return unspentTxOuts.find((uTxO) => {
        return (
            uTxO.txOutTransactionId === txOutTransactionId &&
            uTxO.txOutIndex === txOutIndex
        )
    })
}

const signTxIn = (transaction, txInIndex, privateKey, unspentTxOuts) => {
    const txIn = transaction.txIns[txInIndex]

    const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutTransactionId, txIn.txOutIndex, unspentTxOuts);

    if (referencedUnspentTxOut == null) {
        console.log('Could not find referenced txOut');
        throw Error();
    }

    if (getPublicKey(privateKey) !== referencedUnspentTxOut.address) {
        console.log('Trying to sign an input with private' +
            ' key that does not match the address that is referenced in txIn');
        throw Error();
    }

    const dataToSign = transaction.id;
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = binaryToHex(key.sign(dataToSign).toDER());

    return signature;
}

const updateUnspentTxOuts = (newTransactions, unspentTxOuts) => {
    const newUnspentTxOuts = newTransactions
        .map((t) => t.txOuts)
        .map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount))
        .reduce((a, b) => a.concat(b), []);

    const consumedTxOuts = newTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutTransactionId, txIn.txOutIndex, '', 0));

    const resultingUnspentTxOuts = unspentTxOuts
        .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutTransactionId, uTxO.txOutIndex, consumedTxOuts)))
        .concat(newUnspentTxOuts);

    return resultingUnspentTxOuts;
}

// isValidTransactionsStructure
const isValidAddress = (address) => {
    if (address.length !== 130) {
        console.log('Invalid public key length')
        return false
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('Public key must contain only hex characters')
        return false;
    } else if (!address.startsWith('04')) {
        console.log('Public key must start with 04')
        return false
    }
    return true
}

const isValidTxInStructure = (txIn) => {
    if (txIn == null) {
        console.log('txIn is null');
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
    return transactions
        .map(isValidTransactionStructure)
        .reduce((a, b) => (a && b), true)
}

// validateBlockTransactions
const validateTxIn = (txIn, transaction, unspentTxOuts) => {
    const referencedUTxOut = unspentTxOuts.find((uTxO) => {
        return (
            uTxO.txOutTransactionId === txIn.txOutTransactionId &&
            uTxO.txOutIndex === txIn.txOutIndex
        )
    })

    if (referencedUTxOut == null) {
        console.log('Referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }

    const key = ec.keyFromPublic(referencedUTxOut.address, 'hex');
    return key.verify(transaction.id, txIn.signature);
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
        return
    }
    if (transaction.txIns[0].txOutIndex !== blockIndex) {
        console.log('The txIn signature in coinbase tx must be the block height')
        return false
    }
    if (transaction.txOuts.length !== 1) {
        console.log('invalid number of txOuts in coinbase transaction')
        return false
    }
    if (transaction.txOuts[0].amount != COINBASE_AMOUNT) {
        console.log('invalid coinbase amount in coinbase transaction')
        return false
    }
    return true
}

const validateTransaction = (transaction, unspentTxOuts) => {
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
        .map((txIn) => findUnspentTxOut(txIn.txOutTransactionId, txIn.txOutIndex, aUnspentTxOuts).amount)
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

const validateBlockTransactions = (transactions, unspentTxOuts, blockIndex) => {
    const hasDuplicates = (txIns) => {
        const groups = _.countBy(txIns, (txIn) => txIn.txOutTransactionId + txIn.txOutTransactionId);
        return _(groups)
            .map((value, key) => {
                if (value > 1) {
                    console.log('Duplicate txIn: ' + key);
                    return true;
                } else {
                    return false;
                }
            })
            .includes(true);
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
        .value();
    if (hasDuplicates(txIns)) {
        return false;
    }

    // all but coinbase transactions
    const normalTransactions = transactions.slice(1);
    return normalTransactions
        .map((tx) => validateTransaction(tx, unspentTxOuts))
        .reduce((a, b) => (a && b), true);
}

const processTransactions = (transactions, unspentTxOuts, blockIndex) => {
    if (!isValidTransactionsStructure(transactions)) {
        return null;
    }

    if (!validateBlockTransactions(transactions, unspentTxOuts, blockIndex)) {
        console.log('Invalid block transactions');
        return null;
    }

    return updateUnspentTxOuts(transactions, unspentTxOuts);
}

module.exports = {
    Transaction,
    getTransactionId,
    getCoinbaseTransaction,
    signTxIn,
    processTransactions,
}

