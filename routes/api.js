/* References
Running python scripts in NodeJS: https://medium.com/swlh/run-python-script-from-node-js-and-send-data-to-browser-15677fcf199f
*/
const express = require('express');
const { ObjectId } = require('mongodb');
const { spawn } = require('child_process')
const logSchema = require('../schemas/log');
const datalistSchema = require('../schemas/datalist');
const database = require('../connections/database')
const master = require('../connections/master')
const fs = require('fs')
const router = express.Router()

const DATALIST_OBJID = new ObjectId('648e0c3534eca556e2aa62eb')
const TEMPLOG_PATH = 'templog.csv'
const TEMPPLOT_PATH = 'tempplot.html'

/* Reference
https://bobbyhadz.com/blog/javascript-typeerror-failed-to-fetch-cors
https://stackoverflow.com/questions/49343024/getting-typeerror-failed-to-fetch-when-the-request-hasnt-actually-failed
*/
router.use((_req, res, next) =>
{
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
  
    next();
});

/*
Request usage:
req.body: collection: str, uploader: str, name: str, fileName: str, dataDate: Date, comments: str, data: [str]
*/
router.post('/data', async (req, res) => 
{
    console.log('Post request received')
    try
    {
        console.log(req.body)
        
        const logModel = database.model(req.body.collection, logSchema)
        const data = new logModel(
        {
            uploader: req.body.uploader,
            uploadDate: Date.now(),
            name: req.body.name,
            fileName: req.body.fileName,
            dataDate: req.body.dataDate,
            comments: req.body.comments,
            data: req.body.data
        })

        const dataToSave = await data.save();
        console.log('Successfully saved data to database')
        console.log(dataToSave)

        const datalistModel = master.model('datalist', datalistSchema)
        let datalist = await datalistModel.findById(DATALIST_OBJID)
        datalist.list.push({ "collectionName": req.body.collection, "entryName": req.body.name })
        await datalistModel.findByIdAndUpdate(DATALIST_OBJID, { "list": datalist.list })
        console.log('Successfully updated datalist')

        res.status(200).json({ })
    }
    catch (error)
    {
        res.status(400).json({ message: error.message })
    }
})


/*
Request usage:
req.body: collection: str, name: str
*/
router.delete('/data', async (req, res) => 
{
    console.log('Delete request received')
    try
    {
        console.log(req.body)
        
        const logModel = database.model(req.body.collection, logSchema)
        const logEntry = await logModel.findOneAndDelete({ "name": req.body.name })
        console.log('Successfully deleted log entry')
        console.log(logEntry)

        const datalistModel = master.model('datalist', datalistSchema)
        let datalist = await datalistModel.findById(DATALIST_OBJID)
        const index = datalist.list.indexOf({ "collectionName": req.body.collection, "entryName": req.body.name })
        datalist.list.splice(index, 1)
        await datalistModel.findByIdAndUpdate(DATALIST_OBJID, { "list": datalist.list })
        console.log('Successfully updated datalist')

        const docCount = await logModel.countDocuments({})
        console.log(`${docCount} documents left in collection: ${req.body.collection}`)
        if (docCount == 0)
        {
            logModel.collection.drop()
            console.log('Collection successfully dropped')
        }

        res.status(200).json({ })
    }
    catch (error)
    {
        res.status(400).json({ message: error.message })
    }
})

router.get('/datatree', async (req, res) => 
{
    console.log('Get datatree request received')
    try
    {
        let root = { name: 'root', next: []}
        const datalistModel = master.model('datalist', datalistSchema)
        let datalist = await datalistModel.findById(DATALIST_OBJID)
        datalist.list.forEach((element) =>
        {
            const dir = element.collectionName.split('/')
            if (!root.next.some((element) => { return element.name == dir[0] }))
                root.next.push({ name: dir[0], next: [] })
            let topFolder = root.next.find((element) => { return element.name == dir[0] })
            if (!topFolder.next.some((element) => { return element.name == dir[1] }))
                topFolder.next.push({ name: dir[1], next: [] })
            let subFolder = topFolder.next.find((element) => { return element.name == dir[1] })
            subFolder.next.push({ name: element.entryName, next: [] })
        })
        console.log('Tree built successfully')
        res.status(200).json(root.next)
    }
    catch (error)
    {
        res.status(400).json({ message: error.message })
    }
})

router.get('/plot', async (req, res) => 
{
    console.log('Get plot request received')
    try
    {
        console.log(req.query)

        const logModel = database.model(req.query.collection, logSchema)
        const logEntry = await logModel.findOne({ "name": req.query.name })
        console.log('Successfully get log entry')
        console.log(logEntry)

        console.log('Writing data to temporary file')
        fs.writeFileSync(TEMPLOG_PATH, logEntry.data);

        console.log('Spawning log2plot process')
        const log2plot = spawn('python3', ['log2plot.py', '-p'].concat(req.query.plot.split(',')).concat(['-i', TEMPLOG_PATH]));
        let stdOut = ""
        let stdErr = ""
        log2plot.stdout.on('data', function (data)
        {
            stdOut = data.toString()
        });

        log2plot.stderr.on('data', function (data)
        {
            console.log(`Error: ${data.toString()}`);
            stdErr = data.toString()
        });

        log2plot.on('close', (code) => 
        {
            console.log(`child process close all stdio with code ${code}`)

            if (code == 0)
            {
                console.log('Reading plot as html')
                const plot = fs.readFileSync(TEMPPLOT_PATH, 'utf8')
                res.status(200).json({ pythonLog: stdOut, error: stdErr, plot: plot })
            }
            else
                res.status(400).json({ pythonLog: stdOut, error: stdErr })
        });
    }
    catch (error)
    {
        res.status(400).json({ message: error.message })
    }
})

module.exports = router;