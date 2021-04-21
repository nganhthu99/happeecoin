class UnspentTxOut {
    constructor(txOutTransactionId, txOutIndex, address, amount) {
        this.txOutTransactionId = txOutTransactionId // transaction.id
        this.txOutIndex = txOutIndex // transaction.txOuts[index]
        this.address = address
        this.amount = amount
    }
}

module.exports = { UnspentTxOut }
