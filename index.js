/* Reference
Good video on ExpressJS: https://www.youtube.com/watch?v=SccSCuHhOw0
Restful API w/ Express, MongoDB: https://www.freecodecamp.org/news/build-a-restful-api-using-node-express-and-mongodb/
How to deploy Express & Node to AWS EC2: https://jonathans199.medium.com/how-to-deploy-node-express-api-to-ec2-instance-in-aws-bc038a401156
*/
const express = require('express')
const database = require('./connections/database')
const master = require('./connections/master')
const app = express()
const port = 3001


app.use(express.json());

app.listen(port, () => 
{
    console.log(`BFRDA listening on port ${port}`)
})

app.get('/', (req, res) => 
{
    /*
    if (db_connected == -1)
        res.send('Connecting to database...')
    else if (db_connected == 0)
        res.send('Failed to connect to database')
    else
        res.send('Connected to database')
    */
   console.log(database.readyState)
   res.send('Hello World!')
})

const apiRoute = require('./routes/api');
app.use('/api', apiRoute)