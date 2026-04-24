const { createClient } = require('redis');

const client = createClient({
  url: 'redis://192.168.75.129:6379'  // Your VM IP
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await client.connect();
  console.log('Redis connected');
}

module.exports = { client, connectRedis };