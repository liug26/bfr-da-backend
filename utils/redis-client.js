const redis = require('redis');
const logger = require('../logger'); // Assuming you have a logger module set up

// Create and configure the Redis client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379', // Redis URL from environment variable or default to localhost
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
    logger.error('Redis error: ', err);
});

// Log when the Redis client is ready
redisClient.on('ready', () => {
    logger.info('Connected to Redis successfully');
});

// Export the Redis client
module.exports = redisClient;
