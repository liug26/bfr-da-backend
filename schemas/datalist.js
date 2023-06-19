const mongoose = require('mongoose')

const datalistSchema = new mongoose.Schema(
{
    "list": [
    {
        "collectionName": String,
        "entryName": String
    }]
})

module.exports = datalistSchema