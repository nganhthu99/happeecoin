const { initBlockchain } = require("./src/Blockchain");
const { connectToPeers } = require("./src/P2PServer");
const { initWallet } = require("./src/Wallet");
const { initHttpServer } = require('./src/HTTPServer')
const { initP2PServer } = require('./src/P2PServer')

initWallet()
initBlockchain()

initHttpServer(3003)
initP2PServer(6003)
connectToPeers('ws://localhost:6002/')
