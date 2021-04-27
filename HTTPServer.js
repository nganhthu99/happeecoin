const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')
const { getBalanceAccount, sendTransaction, mineBlock } = require("./WalletFeatures")
const { getTransactionPool } = require("./TransactionPool")
const { getBlockchain, getUnspentTxOuts } = require("./Blockchain")
const { getSockets, connectToPeers } = require("./P2PServer")

const initHttpServer = (httpPort) => {
    const app = express()

    app.use(bodyParser.json())

    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message)
        }
    })

    // Happee Explorer
    app.get('/blocks', (req, res) => {
        res.send(getBlockchain())
    })

    app.get('/unspent-transaction-outs', (req, res) => {
        res.send(getUnspentTxOuts())
    })

    app.get('/transaction-pool', (req, res) => {
        res.send(getTransactionPool())
    })

    app.get('/block/:hash', (req, res) => {
        const block = _.find(getBlockchain(), {'hash' : req.params.hash})
        res.send(block)
    })

    app.get('/transaction/:id', (req, res) => {
        const transaction = _(getBlockchain())
            .map((blocks) => blocks.data)
            .flatten()
            .find({'id': req.params.id})
        res.send(transaction)
    })

    // Happee Wallet
    app.get('/balance', (req, res) => {
        const balance = getBalanceAccount()
        res.send({'balance': balance})
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
