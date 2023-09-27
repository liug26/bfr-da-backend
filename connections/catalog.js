require('dotenv').config()
const catalogURL = process.env.CATALOG_URL
const mongoose = require('mongoose')
const logger = require('../logger')

const catalog = mongoose.createConnection(catalogURL)
    
catalog.on('error', (error) =>
{
    logger.error('Error occured while trying to connect to catalog database', error)
})
    
catalog.once('connected', () =>
{
    logger.info('Catalog database connected')
})

module.exports = catalog