require('dotenv').config()
const masterURL = process.env.MASTER_URL
const mongoose = require('mongoose')
const logger = require('../logger')

const master = mongoose.createConnection(masterURL)
    
master.on('error', (error) =>
{
    logger.error('Error occured while trying to connect to master database', error)
})
    
master.once('connected', () =>
{
    logger.info('Master database connected')
})

module.exports = master