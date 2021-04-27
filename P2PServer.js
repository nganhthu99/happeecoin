const WebSocket = require('ws')
const { getTransactionPool, addTransactionToPool } = require("./TransactionPool")
const {
    getUnspentTxOuts,
    getBlockchain,
    getLatestBlock,
    addBlockToChain,
    replaceChain,
    isValidBlockStructure
} = require("./Blockchain")

// Constant message
const MessageType = {
    "QUERY_LATEST": 0,
    "QUERY_ALL": 1,
    "RESPONSE_BLOCKCHAIN": 2,
    "QUERY_TRANSACTION_POOL": 3,
    "RESPONSE_TRANSACTION_POOL": 4
}

const queryLatestBlockMsg = () => {
    return {
        'type': MessageType.QUERY_LATEST,
        'data': null
    }
}

const queryAllBlockMsg = () => {
    return {
        'type': MessageType.QUERY_ALL,
        'data': null
    }
}

const queryTransactionPoolMsg = () => {
    return {
        'type': MessageType.QUERY_TRANSACTION_POOL,
        'data': null
    }
}

const responseLatestBlockMsg = () => {
    const latestBlock = getLatestBlock()
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify([latestBlock])
    }
}

const responseAllBlockMsg = () => {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify(getBlockchain())
    }
}

const responseTransactionPoolMsg = () => {
    return {
        'type': MessageType.RESPONSE_TRANSACTION_POOL,
        'data': JSON.stringify(getTransactionPool())
    }
}

const sockets = []

const getSockets = () => {
    return sockets
}

const connectToPeers = (newPeer) => {
    const ws = new WebSocket(newPeer)
    ws.on('open', () => {
        initConnection(ws)
        console.log('Connection success')
    })
    ws.on('error', (error) => {
        console.log('Connection failed: ', error)
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
    sockets.push(ws)
    initErrorHandler(ws)
    initMessageHandler(ws)
    write(ws, queryLatestBlockMsg())

    setTimeout(() => {
        broadcast(queryTransactionPoolMsg())
    }, 500)
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

const JSONToObject = (data) => {
    try {
        return JSON.parse(data)
    } catch (e) {
        console.log(e)
        return null
    }
}

const initMessageHandler = (ws) => {
    ws.on('message', (message) => {
        message = JSONToObject(message)
        message.data = JSONToObject(message.data)
        switch (message.type) {
            // QUERY
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestBlockMsg())
                break
            case MessageType.QUERY_ALL:
                write(ws, responseAllBlockMsg())
                break
            case MessageType.QUERY_TRANSACTION_POOL:
                write(ws, responseTransactionPoolMsg())
                break
            // RESPONSE
            case MessageType.RESPONSE_BLOCKCHAIN:
                const receivedBlocks = message.data
                if (receivedBlocks === null) {
                    console.log('Invalid blocks received: ', message.data)
                    break
                }
                handleBlockchainResponse(receivedBlocks)
                break
            case MessageType.RESPONSE_TRANSACTION_POOL:
                console.log("RECEIVED TRANSACTION POOL")
                const receivedTransactions = message.data
                if (receivedTransactions === null) {
                    console.log('Invalid transaction received: %s', message.data)
                    break
                }
                handleTransactionPoolResponse(receivedTransactions)
                break
        }
    })
}

const handleTransactionPoolResponse = (receivedTransactions) => {
    receivedTransactions.forEach((transaction) => {
        try {
            addTransactionToPool(transaction, getUnspentTxOuts())
            broadcastTransactionPool()
        } catch (e) {
            console.log(e.message)
        }
    })
}

const handleBlockchainResponse = (receivedBlocks) => {
    if (receivedBlocks.length === 0) {
        console.log('Received block chain size of 0')
        return
    }
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1]
    if (!isValidBlockStructure(latestBlockReceived)) {
        console.log('Block structure invalid')
        return
    }
    const latestBlockHeld = getLatestBlock()
    if (latestBlockHeld.index < latestBlockReceived.index) {
        console.log (
            'Blockchain possibly behind. We got: ' +
            latestBlockHeld.index +
            ' Peer got: ' +
            latestBlockReceived.index
        )
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (addBlockToChain(latestBlockReceived)) {
                broadcastLatest()
            }
        } else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer')
            broadcast(queryAllBlockMsg())
        } else {
            console.log('Received blockchain is longer than current blockchain')
            replaceChain(receivedBlocks)
            broadcastLatest()
        }
    } else {
        console.log('received blockchain is not longer than received blockchain. Do nothing')
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
    broadcast(responseLatestBlockMsg())
}

const broadcastTransactionPool = () => {
    broadcast(responseTransactionPoolMsg())
}

module.exports = {
    getSockets,
    connectToPeers,
    initP2PServer,

    broadcastLatest,
    broadcastTransactionPool
}
