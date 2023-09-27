const mongoose = require('mongoose')

const catalogListSchema = new mongoose.Schema(
{
    list: [
    {
        collectionName: String,
        entryName: String
    }]
})

module.exports = catalogListSchema