class TxIn {
    constructor(txOutTransactionId, txOutIndex, signature) {
        this.txOutTransactionId = txOutTransactionId // transaction.id
        this.txOutIndex = txOutIndex // transaction.txOuts[index]
        this.signature = signature
    }
}

module.exports = { TxIn }
