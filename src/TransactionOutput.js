class TxOut {
    constructor(address, amount) {
        this.address = address // public key
        this.amount = amount
    }
}

module.exports = { TxOut }
