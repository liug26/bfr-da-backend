require('dotenv').config()
const databaseURL = process.env.DATABASE_URL;
const mongoose = require('mongoose');

const database = mongoose.createConnection(databaseURL);
    
database.on('error', (error) =>
{
    console.log(error)
})
    
database.once('connected', () =>
{
    console.log('Main database connected');
})

module.exports = database