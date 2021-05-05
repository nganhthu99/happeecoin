const { initBlockchain } = require("./Blockchain");
const { connectToPeers } = require("./P2PServer");
const { initWallet } = require("./Wallet");
const { initHttpServer } = require('./HTTPServer')
const { initP2PServer } = require('./P2PServer')

initWallet()
initBlockchain()

initHttpServer(3003)
initP2PServer(6003)
connectToPeers('ws://localhost:6002/')
