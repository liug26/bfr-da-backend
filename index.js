/* Reference
Good video on ExpressJS: https://www.youtube.com/watch?v=SccSCuHhOw0
Restful API w/ Express, MongoDB: https://www.freecodecamp.org/news/build-a-restful-api-using-node-express-and-mongodb/
How to deploy Express & Node to AWS EC2: https://jonathans199.medium.com/how-to-deploy-node-express-api-to-ec2-instance-in-aws-bc038a401156
*/
const express = require('express')
const database = require('./connections/database')
const master = require('./connections/master')
const logger = require('./logger')
const app = express()
const port = 3001

logger.info('Script starts')
app.use(express.json({ limit: '50mb' }))

app.listen(port, () => 
{
    logger.info(`Listening on port ${port}`)
})

app.get('/', (req, res) => 
{
    res.send((database.readyState == 1 ? 'Main database connected' : 'Main database disconnected') + '\n' + 
    (master.readyState == 1 ? 'Master database connected' : 'Master database disconnected'))
})

const apiRoute = require('./routes/api');
app.use('/api', apiRoute)