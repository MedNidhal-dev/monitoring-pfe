const { createClient } = require('redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await client.connect();
  console.log('Rediis connected');
}

module.exports = { client, connectRedis };