require('dotenv').config()
const masterURL = process.env.MASTER_URL;
const mongoose = require('mongoose');

const master = mongoose.createConnection(masterURL);
    
master.on('error', (error) =>
{
    console.log(error)
})
    
master.once('connected', () =>
{
    console.log('Master database connected');
})

module.exports = master