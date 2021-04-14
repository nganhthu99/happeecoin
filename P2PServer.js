const Blockchain = require('./Blockchain')
const blockchain = require('./Global').blockchain
const WebSocket = require('ws');

const MessageType = {
    "QUERY_LATEST": 0,
    "QUERY_ALL": 1,
    "RESPONSE_BLOCKCHAIN": 2,
}

const sockets = []

function getSockets() {
    return sockets;
}

function initP2PServer(p2pPort) {
    const server = new WebSocket.Server({port: p2pPort})
    server.on('connection', (ws) => { // node(ws) connect successfully to p2pServer
        initConnection(ws)
    })
    console.log('Listening Websocket Peer-to-peer on port: ' + p2pPort)
}

function initConnection(ws) {
    sockets.push(ws);
    initErrorHandler(ws);
    initMessageHandler(ws);
    write(ws, queryLatestBlockMsg());
}

function initErrorHandler(ws) {
    const closeConnection = (myWs) => {
        console.log('Connection failed to peer: ' + myWs.url)
        sockets.splice(sockets.indexOf(myWs), 1)
    }

    ws.on('close', () => {
        closeConnection(ws)
    })

    ws.on('error', () => {
        closeConnection(ws)
    })
}

function initMessageHandler(ws) {
    ws.on('message', (message) => {
        switch (message.type) {
            case MessageType.QUERY_LATEST: // receive message asking to query for the latest block
                write(ws, responseLatestBlockMsg()); // it(ws) send the latest block to the websocket connection
                break;
            case MessageType.QUERY_ALL: // receive message asking to query for all blocks
                write(ws, responseAllBlockMsg()); // it(ws) send the all blocks to the websocket connection
                break;
            case MessageType.RESPONSE_BLOCKCHAIN: // receive message responding to query request
                const receivedBlocks = message.data;
                if (receivedBlocks === null) {
                    console.log('Invalid blocks received: ', message.data);
                    break;
                }
                handleBlockchainResponse(receivedBlocks);
                break;
        }
    })
}

function handleBlockchainResponse (receivedBlocks) {
    const receivedChain = new Blockchain(receivedBlocks)
    if (receivedBlocks.length === 0) {
        console.log('Received block chain size of 0');
        return;
    }
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!receivedChain.isValidBlockStructure(latestBlockReceived)) {
        console.log('Block structure invalid');
        return;
    }
    const latestBlockHeld = blockchain.getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log (
            'Blockchain possibly behind. We got: ' +
            latestBlockHeld.index +
            ' Peer got: ' +
            latestBlockReceived.index
        );
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (blockchain.addBlockToChain(latestBlockReceived)) {
                broadcast(responseLatestBlockMsg());
            }
        } else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllBlockMsg());
        } else {
            console.log('Received blockchain is longer than current blockchain');
            blockchain.replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
}

function write (ws, message) {
    ws.send(JSON.stringify(message))
}

function broadcast (message) {
    sockets.forEach((socket) => {
        write(socket, message)
    })
}

function queryLatestBlockMsg () {
    return {
        'type': MessageType.QUERY_LATEST,
        'data': null
    }
}

function queryAllBlockMsg () {
    return {
        'type': MessageType.QUERY_ALL,
        'data': null
    }
}

function responseLatestBlockMsg () {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify([blockchain.getLatestBlock()])
    }
}

function responseAllBlockMsg () {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify(blockchain.getBlockchain())
    }
}

module.exports = { initP2PServer, getSockets }
