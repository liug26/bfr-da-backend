const mongoose = require('mongoose')

const logSchema = new mongoose.Schema(
{
    uploader: String,
    uploadDate: { type: Date, default: Date.now },
    name: String,
    fileName: String,
    dataDate: String,
    comments: String,
    data: String
})

module.exports = logSchema