# middleware-bitcoin-blockprocessor [![Build Status](https://travis-ci.org/ChronoBank/middleware-bitcoin-blockprocessor.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-bitcoin-blockprocessor)

Middleware service for handling incoming transactions

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware-bitcoin)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go

#### About
This module is used for watching new blocks and txs for registered on platform users (please, check out - how you can register new user via [rest api](https://github.com/ChronoBank/middleware-bitcoin-rest)).


#### How does it work?

Block processor - acts as a cache and notification system: It process blocks
from the specified network, notify users about new incoming blocks and transactions, and store blocks and all utxo in mongo.

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

##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_URI=mongodb://localhost:27017/data
RABBIT_URI=amqp://localhost:5672
RABBIT_SERVICE_NAME=app_bitcoin
MONGO_COLLECTION_PREFIX=bitcoin
NETWORK=regtest
CONSENSUS_BLOCK_VALIDATE_AMOUNT=12
SYNC_SHADOW=1
ZMQ=tcp://127.0.0.1:43332
NETWORK=testnet
IPC_NAME=bitcoin
IPC_PATH=/tmp/
```

The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| RABBIT_URI   | rabbitmq URI connection string
| RABBIT_SERVICE_NAME   | rabbitmq queues prefix
| MONGO_COLLECTION_PREFIX   | the prefix name for all created collections, like for Account model - it will be called (in our case) bitcoinAccount
| NETWORK   | network name (alias)- is used for connecting via ipc (regtest, main, testnet, bcc)
| CONSENSUS_BLOCK_VALIDATE_AMOUNT   | validate last blocks (by hash), in order to make sure, that last blocks hasn't been dropped
| SYNC_SHADOW   | sync blocks in background
| IPC_NAME   | ipc file name
| IPC_PATH   | directory, where to store ipc file (you can skip this option on windows)

### ipc node

For the moment, block processor has only the ipc interface support, and as a result, you need to run a full bcoin node with ipc support. You can grab it [here](https://github.com/ChronoBank/bcoin-ipc-node).


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


License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY