# middleware-bitcoin-blockprocessor [![Build Status](https://travis-ci.org/ChronoBank/middleware-bitcoin-blockprocessor.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-bitcoin-blockprocessor)

Middleware service for handling incoming transactions

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware-bitcoin)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go

#### About
This module is used for watching new blocks and txs for registered on platform users (please, check out - how you can register new user via [rest api](https://github.com/ChronoBank/middleware-bitcoin-rest)).


#### How does it work?

Block processor connects to ipc / http endpoint, fetch blocks one by one and cache them in mongodb.

Which txs block processor filter?

Block processor filter txs by specified user accounts (addresses). The addresses are presented in "bitcoinaccounts" collection with the following format:
```
{
    "_id": ObjectId("5a97c60b9d62a604cd8f2d99"),
    "address": "n4XmX91N5FfccY678vaG1ELNtXh6skVES7",
    "created": ISODate("2018-03-01T09:21:15.780Z"),
    "balances": {
        "confirmations6": 0,
        "confirmations3": 0,
        "confirmations0": 600
    }
}
```
So, when someone, for instance send a transaction (sample rpc request):
```
{id: 1, method: "sendtoaddress", params: ["2MuWbVXTtcKxE6WGfy6NiDTcarxhRUeavWS"]}

```

this tx is going to be included in next blocks. Block parser fetch these blocks, and filter by "input" and "output" recipients.
If one of them is presented in bitcoinaccounts collection in mongo, then this transaction will be broadcasted via rabbitmq.

```
{
 address: '2N5YSx3xQiZFhEGuvtSLT9e8WCqrT4uJFb1',
  txs:
   [ '9344d43d797b9a877b7e0268131868913f8b43091f638877ec3910e2e9f27669' ]
```




#### Why do we use rabbitmq?



Rabbitmq is used for 2 main reasons - the first one for inner communication between different core modules. And the second one - is for notification purpose. When a new transaction arrives and it satisfies the filter - block processor notiffy others about it though rabbitmq exhange strategy. The exnage is called 'events', and it has different kinds of routing keys. For a new tx the routing key is looked like so:

```
<rabbitmq_service_name>_transaction.{address}
```
Where address is to or from address (and default rabbitmq_service_name=bitcoin).


Also you can listen to new blocs:
```
<rabbitmq_service_name>_block
```


And even, you can subscribe to all bitcoin_transactions events by using wildcard:
```
<rabbitmq_service_name>_transaction.*
```

All in all, in order to be subscribed, you need to do the following:
1) check that exchange 'events exist'
2) assert a new queue (this should be your own unique queue)
3) bind your queue to 'events' exchange with appropriate routing key
4) consume (listen) your queue


But be aware of it - when a new tx arrives, the block processor sends 2 messages for the same one transaction - for both addresses, who participated in transaction (from and to recepients). The sent message represent the payload field from transaction object (by this unique field you can easely fetch the raw transaction from mongodb for your own purpose).


#### cache system
In order to make it possible to work with custom queries (in [rest](https://github.com/ChronoBank/middleware-bitcoin-rest)), or perform any kind of analytic tasks, we have introduced the caching system. This system stores all blocks and txs in mongodb under the specific collections: blocks, txes, txlogs.


##### bitcoinblocks
The bitcoinblocks collection stores only the most valuable information about the block. Here is the example of block:
```
    "_id" : "000000000345750aadfe3660f18d087d03a8695a1ef797951fae53b4355154d4",
    "bits" : 486604799,
    "created" : ISODate("2018-06-04T12:05:43.380Z"),
    "merkleRoot" : "408446159f03a966f9d073d7ee5e52fd0907207ab39f0fa2c1bec94ad2e83526",
    "number" : 1297961,
    "timestamp" : 1526604394
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the hash of block
| bits   | false | the block size
| created   | false | date, when block has been cached
| merkleRoot   | false | merkle root of current block
| number   | true | block number
| timestamp   | false | date, when block has been mined



##### bitcointxes
The bitcointxes collection stores only the most valuable information about the transaction. Here is the example of transaction:
```
    "_id" : "af1c01ca488126e760e9b688f2b2fc59d80a6f78de090cf94b03cdf74cb7bf69",
    "blockNumber" : 1297963,
    "index" : 5,
    "timestamp" : 1528113943339
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the hash of transaction
| blockNumber   | false | the block number
| index   | true | the transaction index in block
| timestamp   | true | the timestamp when tx has been mined

##### bitcointxcoins
The bitcointxcoins collection represents the coins concept: in bitcoin, we don't have the one-to-one transaction, like in ethereum, and as a result,don't have balance at all. Instead, bitcoin use the unspent outputs (UTXO) and calculate balance based on them. The UTXO, according to this concept, may also be called "coins". The coins have their life: when we just recieve new UTXO (someone has sent us the tx) - the coin is going to be created. But, when we decide to spend this UTXO (transfer to someone), this coin is marked as spent.

In order to reduce the amount of stored data, we have introduced this coins structure:

```
    "_id" : "33070fe93da6e67c9fc08a8cb9074e27",
    "address" : "2MuWbVXTtcKxE6WGfy6NiDTcarxhRUeavWS",
    "inputBlock" : 1297963,
    "inputIndex" : 0,
    "inputTxIndex" : 6,
    "outputBlock" : 1297916,
    "outputIndex" : 1,
    "outputTxIndex" : 40,
    "value" : "13601080"
```

Here is the description:

| field name | index | description|
| ------ | ------ | ------ |
| _id   | true | the unique id of coin (it's md5 checsum)
| address   | true | the address, from which the log has been emitted
| inputBlock   | true | block number, where the tx has been included, which used this coin as input
| inputIndex   | true | input index in transaction
| inputTxIndex   | true | transaction index in input block
| outputBlock   | true | block number, where the tx has been included, which used this coin as output
| outputIndex   | true | output index in transaction
| outputTxIndex   | true | transaction index in output block
| value   | false | the transfer amount

Beside just storing coins, we also are able to restore transaction's inputs and outputs from these coins.


### ipc node

For the moment, block processor has the ipc / http interface support. In case you wish to run the node and work with it by ipc, thwn you need to run a full bcoin node with ipc support. You can grab it [here](https://github.com/ChronoBank/bcoin-ipc-node).


### supported networks

The actual network could be set with NETWORK param. All supported networks are presented below:

| name | description|
| ------ | ------ |
| main   | bitcoin mainnet
| testnet   | bitcoin testnet
| regtest   | bitcoin regtest network
| btg   | bitcoin gold mainnet
| btgtest   | bitcoin gold testnet
| bcc   | bitcoin cash mainnet
| bcctest   | bitcoin cash testnet
| litecoin   | litecoin mainnet
| litecointest   | litecoin testnet


##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_URI=mongodb://localhost:27017/data
RABBIT_URI=amqp://localhost:5672
RABBIT_SERVICE_NAME=app_bitcoin
MONGO_COLLECTION_PREFIX=bitcoin
NETWORK=regtest
SYNC_SHADOW=1
ZMQ=tcp://127.0.0.1:43332
NETWORK=testnet
#IPC_NAME=bitcoin
#IPC_PATH=/tmp/
CONNECTION_URI=/tmp/bitcoin
```


The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| RABBIT_URI   | rabbitmq URI connection string
| RABBIT_SERVICE_NAME   | rabbitmq queues prefix
| MONGO_COLLECTION_PREFIX   | the prefix name for all created collections, like for Account model - it will be called (in our case) bitcoinAccount
| NETWORK   | network name (alias)- is used for connecting via ipc (regtest, main, testnet, bcc)
| SYNC_SHADOW   | sync blocks in background
| IPC_NAME (deprecated)   | ipc file name
| IPC_PATH (deprecated)   | directory, where to store ipc file (you can skip this option on windows)
| CONNECTION_URI   | the URI of the endpoint (may be ipc or http)


License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY