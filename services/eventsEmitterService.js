const bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'core.blockProcessor.services.eventsEmitterService'});

/**
 * @service
 * @description push a new message to the event's exchange with
 * specified routing key - i.e. event param
 * @param amqpInstance - amqp's connection instance
 * @param event - event's name
 * @param data - custom data
 * @returns {Promise.<void>}
 */
module.exports = async (amqpInstance, event, data) => {

  let channel = await amqpInstance.createChannel();

  try {
    await channel.assertExchange('events', 'topic', {durable: false});
  } catch (e) {
    channel = await amqpInstance.createChannel();
  }

  try {
    await channel.publish('events', event, new Buffer(JSON.stringify(data)));
  } catch (e) {
    log.error(e);
  }

  await channel.close();

};
