const express = require('express')
const bodyParser = require('body-parser')
const { getSockets, connectToPeers } = require("./P2PServer");
const { getBlockchain, generateNextBlock } = require("./Blockchain");

const initHttpServer = (httpPort) => {
    const app = express()

    app.use(bodyParser.json())

    app.get('/blocks', (req, res) => {
        res.send(getBlockchain())
    })

    app.post('/mineBlock', (req, res) => {
        const newBlock = generateNextBlock(req.body.data)
        res.send(newBlock)
    })

    app.get('/peers', (req, res) => {
        res.send(getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort))
    })

    app.post('/addPeer', (req, res) => {
        connectToPeers(req.body.peer)
        res.send();
    })

    app.listen(httpPort, () => {
        console.log('Listening HTTP on port: ' + httpPort);
    })
}

module.exports = { initHttpServer }
