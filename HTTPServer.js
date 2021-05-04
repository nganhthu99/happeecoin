const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')
const cors = require('cors')
const {initWallet, getPublicKeyFromWallet, getBalance} = require("./Wallet");
const { getBalanceAccount, sendTransaction, mineBlock, getMyUnspentTxOuts } = require("./WalletFeatures")
const { getTransactionPool } = require("./TransactionPool")
const { getBlockchain, getLatestBlock, getUnspentTxOuts } = require("./Blockchain")
const { getSockets, connectToPeers } = require("./P2PServer")

const initHttpServer = (httpPort) => {
    const app = express()

    app.use(cors())
    app.use(bodyParser.json())

    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message)
        }
    })

    // Happee Explorer
    app.get('/difficulty', (req, res) => {
        res.send({difficulty: getLatestBlock().difficulty})
    })

    app.get('/chain-length', (req, res) => {
        res.send({length: getLatestBlock().index + 1})
    })

    app.get('/pool-size', (req, res) => {
        res.send({size: getTransactionPool().length})
    })

    app.get('/blocks', (req, res) => {
        res.send(getBlockchain())
    })

    app.get('/unspent-transaction-outs', (req, res) => {
        res.send(getUnspentTxOuts())
    })

    app.get('/transaction-pool', (req, res) => {
        res.send(getTransactionPool())
    })

    app.get('/block', (req, res) => {
        let block
        console.log(req.query)
        if (req.query.hash) {
            block = _.find(getBlockchain(), {'hash': req.query.hash})
        } else if (req.query.index) {
            block = _.find(getBlockchain(), {'index': Number(req.query.index)})
        }
        if (block) {
            res.send(block)
        } else {
            res.status(400).send("Found no block")
        }
    })

    app.get('/transaction/:id', (req, res) => {
        const confirmedTransaction = _(getBlockchain())
            .map((blocks) => blocks.data)
            .flatten()
            .find({'id': req.params.id})

        const unconfirmedTransaction = _.find(getTransactionPool(), {'id': req.params.id})

        if (confirmedTransaction) {
            confirmedTransaction.confirmed = true
            res.send(confirmedTransaction)
        } else if (unconfirmedTransaction) {
            unconfirmedTransaction.confirmed = false
            res.send(unconfirmedTransaction)
        } else {
            res.status(400).send("Found no transaction")
        }
    })

    // app.get('/transaction/:id', (req, res) => {
    //     const transaction = _.find(getTransactionPool(), {'id': req.params.id})
    //     res.send(transaction)
    // })

    app.get('/balance/:address', (req, res) => {
        const balance = getBalance(req.params.address, getUnspentTxOuts())
        res.send({'balance': balance})
    })

    // Happee Wallet
    app.get('/address', (req, res) => {
        const address = getPublicKeyFromWallet()
        res.send({address: address})
    })

    app.get('/balance', (req, res) => {
        const balance = getBalanceAccount()
        res.send({'balance': balance})
    })

    app.get('/my-unspent-transaction-outputs', (req, res) => {
        const myUnspentTxOuts = getMyUnspentTxOuts()
        res.send({unspentTxOuts: myUnspentTxOuts})
    })

    app.post('/send-transaction', (req, res) => {
        try {
            const address = req.body.address
            const amount = req.body.amount

            if (address === undefined || amount === undefined) {
                throw Error('Invalid address or amount')
            }

            const resp = sendTransaction(address, amount)
            res.send(resp)
        } catch (e) {
            console.log(e.message)
            res.status(400).send(e.message)
        }
    })

    app.post('/mine-block', (req, res) => {
        const newBlock = mineBlock()
        if (newBlock === null) {
            res.status(400).send('Could not generate block')
        } else {
            res.send(newBlock)
        }
    })

    // Network nodes
    app.get('/peers', (req, res) => {
        res.send(getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort))
    })

    app.post('/add-peer', (req, res) => {
        connectToPeers(req.body.peer)
        res.send()
    })

    app.post('/stop', (req, res) => {
        res.send({'msg' : 'Stopping server'})
        process.exit()
    })

    app.listen(httpPort, () => {
        console.log('Listening HTTP on port: ' + httpPort)
    })
}

module.exports = { initHttpServer }
