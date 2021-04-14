const { initHttpServer } = require('./HTTPServer')
const { initP2PServer } = require('./P2PServer')

initHttpServer(3001)
initP2PServer(6001)
