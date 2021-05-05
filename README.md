# CRYPTOCURRENCY HAPPEECOIN WITH BLOCKCHAIN

### Reference
[Naivecoin: a tutorial for building a cryptocurrency](https://lhartikk.github.io/) \
[SavjeeCoin](https://github.com/Savjee/SavjeeCoin) \
[How Bitcoin Works Under the Hood](http://www.imponderablethings.com/2013/07/how-bitcoin-works-under-hood.html) \
[But how does bitcoin actually work?](https://www.youtube.com/watch?v=bBC-nXj3Ng4) \
[Blockchain 101 - A Visual Demo](https://www.youtube.com/watch?v=_160oMzblY8) 

### Implement Blockchain
Following [Naivecoin: a tutorial for building a cryptocurrency](https://lhartikk.github.io/) tutorial
1. Implement minimal working blockchain
    * HTTP Server to receive API call 
    * Peer-to-peer communication through web socket. Sockets are add manually.
    * Blockchain data is stored in a variable, check block's and chain's validation before add the new block to chain or replace chain
2. Include proof of work
    * Block has 2 new fields: `difficulty` and `nonce`. 
    * Generate new block by finding a specific number called `nonce` that make the hash of the block starts with a `difficulty` number of zeros.
    * Define `how often a block should be generate (in minutes)` and `how often the difficulty level should be adjusted (in blocks)`
    * Replace the chain not by the longest length but by the highest cumulative difficulty, which proves the chosen chain is the one required the most resource (time) to produce.
3. Transactions
    * A transaction includes :
        * List of `transaction inputs` referring to some unspent transaction outputs from previous confirmed transactions having the receiver address match with this address (who is making a new transaction)
        * List of `transaction outputs` - technically maximum of 2 outputs. One is for the receiver address with the amount of coin you want to send and one for himself with the amount of coin change 
    * A specific type of transaction called `Coinbase transaction` is placed as the first transaction of a block, having no inputs and one output which is the rewarding coins for the address that generated (mined) that block
    * Unspent transaction outputs data is stored in a variable. When a block is being added to the chain, it will go through validation and if valid, unspent transaction outputs will get updated: adding new transaction outputs, and removing used ones
4. Wallet
    * Generate private key and save in file
    * Public key is derived from private key and is used as the address to make transaction
    * Account balance is calculated by sum up all amount of unspent transaction outputs having receiver address same as one's address
    * Each transaction will get signed by the private key of the person who make that transaction
5. Transactions pool
    * After sending coin to an address, new transaction will be created and added to the transactions pool then waiting to be confirmed / mined by some nodes
    * When a node deciding to mine a new block, all transactions in transactions pool will be used as data for that block

**Improvements: Blockchain data in tutorial is stored in variable only, in this project blockchain data when get updated will also save to file**

### Implement User Interface
1. [Explorer UI](https://github.com/nganhthu99/happeeexplorer.git) \
Simple Web application runs in localhost to look up data in blockchain, including: 
    * Blockchain
    * Transactions pool
    * Unspent transaction outputs 
2. [Wallet UI](https://github.com/nganhthu99/happeewallet.git) \
Simple Web application runs in localhost, with features: 
    * Create a private key and derive a public key from it to use as the address
    * View account balance
    * Send coins to any other address
    * Mine a new block

### Instruction
1. Blockchain
    * Clone this project in your computer
    * Open Main.js and adjust your settings:
        * initHttpServer(port): set which port the HTTP Server will be running
        * initP2PServer(port): set which port the P2P Server websocket will be running
        * connectToPeers(url): manually adding any number of other web socket to communicate with each other in this network
    * `npm install`
    * `npm start`
2. Explorer
    * Clone [Explorer UI](https://github.com/nganhthu99/happeeexplorer.git)
    * Go to /src/Service/api and change the port to the one you are running HTTP Server
    * `yarn install`
    * `yarn start`
3. Wallet
    * Clone [Wallet UI](https://github.com/nganhthu99/happeewallet.git)
    * Go to /src/Service/api and change the port to the one you are running HTTP Server
    * `yarn install`
    * `yarn start`
