const WebSocket = require('ws');
const { getBlockchain, getLatestBlock, addBlockToChain, replaceChain, isValidBlockStructure } = require("./Blockchain");

// Constant message
const MessageType = {
    "QUERY_LATEST": 0,
    "QUERY_ALL": 1,
    "RESPONSE_BLOCKCHAIN": 2,
}

const queryLatestBlockMsg = {
    'type': MessageType.QUERY_LATEST,
    'data': null
}

const queryAllBlockMsg = {
    'type': MessageType.QUERY_ALL,
    'data': null
}

const responseLatestBlockMsg = {
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([getLatestBlock()])
}

const responseAllBlockMsg = {
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify(getBlockchain())
}

const sockets = []

const getSockets = () => {
    return sockets;
}

const connectToPeers = (newPeer) => {
    const ws = new WebSocket(newPeer)
    ws.on('open', () => {
        initConnection(ws)
    })
    ws.on('error', () => {
        console.log('Connection failed')
    })
}

const initP2PServer = (p2pPort) => {
    const server = new WebSocket.Server({port: p2pPort})
    server.on('connection', (ws) => { // node(ws) connect successfully to p2pServer
        initConnection(ws)
    })
    console.log('Listening Websocket Peer-to-peer on port: ' + p2pPort)
}

const initConnection = (ws) => {
    sockets.push(ws);
    initErrorHandler(ws);
    initMessageHandler(ws);
    write(ws, queryLatestBlockMsg);
}

const initErrorHandler = (ws) => {
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

const initMessageHandler = (ws) => {
    ws.on('message', (message) => {
        switch (message.type) {
            case MessageType.QUERY_LATEST: // receive message asking to query for the latest block
                write(ws, responseLatestBlockMsg); // it(ws) send the latest block to the websocket connection
                break;
            case MessageType.QUERY_ALL: // receive message asking to query for all blocks
                write(ws, responseAllBlockMsg); // it(ws) send the all blocks to the websocket connection
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

const handleBlockchainResponse = (receivedBlocks) => {
    if (receivedBlocks.length === 0) {
        console.log('Received block chain size of 0');
        return;
    }
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!isValidBlockStructure(latestBlockReceived)) {
        console.log('Block structure invalid');
        return;
    }
    const latestBlockHeld = getLatestBlock();
    if (latestBlockHeld.index < latestBlockReceived.index) {
        console.log (
            'Blockchain possibly behind. We got: ' +
            latestBlockHeld.index +
            ' Peer got: ' +
            latestBlockReceived.index
        );
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (addBlockToChain(latestBlockReceived)) {
                broadcast(responseLatestBlockMsg);
            }
        } else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllBlockMsg);
        } else {
            console.log('Received blockchain is longer than current blockchain');
            replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
}

const write = (ws, message) => {
    ws.send(JSON.stringify(message))
}

const broadcast = (message) => {
    sockets.forEach((socket) => {
        write(socket, message)
    })
}

const broadcastLatest = () => {
    broadcast(responseLatestBlockMsg)
}

module.exports = {
    getSockets,
    connectToPeers,
    initP2PServer,
    broadcastLatest
}
