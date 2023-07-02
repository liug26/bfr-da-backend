require('dotenv').config()
const databaseURL = process.env.DATABASE_URL
const mongoose = require('mongoose')
const logger = require('../logger')

const database = mongoose.createConnection(databaseURL)
    
database.on('error', (error) =>
{
    logger.error('Error occured while trying to connect to main database', error)
})
    
database.once('connected', () =>
{
    logger.info('Main database connected')
})

module.exports = database