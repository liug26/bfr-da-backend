/* Reference
Good video on ExpressJS: https://www.youtube.com/watch?v=SccSCuHhOw0
Restful API w/ Express, MongoDB: https://www.freecodecamp.org/news/build-a-restful-api-using-node-express-and-mongodb/
How to deploy Express & Node to AWS EC2: https://jonathans199.medium.com/how-to-deploy-node-express-api-to-ec2-instance-in-aws-bc038a401156
*/

const express = require('express');
const database = require('./connections/database');
const catalog = require('./connections/catalog');
const logger = require('./logger');
const redisClient = require('./utils/redis-client'); // Importing Redis client
const app = express();
const port = 3000;

logger.info('Script starts');
app.use(express.json({ limit: '50mb' }));

// Establish Redis connection
redisClient.connect().catch(err => {
    logger.error('Failed to connect to Redis:', err);
});

app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
});

app.get('/', async (req, res) => {
    try {
        // Check Redis connection status
        const redisStatus = redisClient.isOpen ? 'Redis connected' : 'Redis disconnected';

        // Check MongoDB connection statuses
        const mainDbStatus = database.readyState == 1 ? 'Main database connected' : 'Main database disconnected';
        const catalogDbStatus = catalog.readyState == 1 ? 'Catalog database connected' : 'Catalog database disconnected';

        res.send(`${mainDbStatus}\n${catalogDbStatus}\n${redisStatus}`);
    } catch (error) {
        logger.error('Error in root route:', error.message);
        res.status(500).send('An error occurred while fetching status.');
    }
});

// Importing and using the API routes
const apiRoute = require('./routes/api');
app.use('/api', apiRoute);

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    await redisClient.quit(); // Close Redis connection
    process.exit(0);
});
