/* References
Running python scripts in NodeJS: https://medium.com/swlh/run-python-script-from-node-js-and-send-data-to-browser-15677fcf199f
*/
const express = require('express')
const { ObjectId } = require('mongodb')
const { spawn } = require('child_process')
const logSchema = require('../schemas/log')
const cataloglistSchema = require('../schemas/cataloglist')
const database = require('../connections/database')
const catalog = require('../connections/catalog')
const logger = require('../logger')
const fs = require('fs')
const router = express.Router()

const CATALOGLIST_OBJID = new ObjectId('6513714f70c183ef088ba28f')
const DELETE_PASSWORD = 'racing'


/* Reference
https://bobbyhadz.com/blog/javascript-typeerror-failed-to-fetch-cors
https://stackoverflow.com/questions/49343024/getting-typeerror-failed-to-fetch-when-the-request-hasnt-actually-failed
*/
router.use((_req, res, next) =>
{
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    next()
})


/*
Request usage:
req.body: collection: str, uploader: str, name: str, fileName: str, dataDate: str, comments: str, data: str
Response:
200: empty
400 & 500: message: error message
*/
const DATA_POST_REQUIRED_KEYS = ['collection', 'uploader', 'name', 'fileName', 'dataDate', 'comments', 'data']
router.post('/data', async (req, res) => 
{
    logger.http('Post request received on /data')
    try
    {
        logger.http(`Request body: ${JSON.stringify(req.body, null, 2)}`)

        // check if req.body is good
        if (!DATA_POST_REQUIRED_KEYS.every(item => item in req.body))
        {
            logger.http('Request body does not contain all required values, stopping')
            res.status(400).json({ message: 'Missing required values in request body' })
            return
        }
        
        // constructing model with request data
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

        // submit data to main database
        logger.info('Saving model to main database...')
        const dataToSave = await data.save()
        logger.info(`Saved model to main database: ${dataToSave}`)

        // update catalog database
        logger.info('Searching catalog database for cataloglist')
        const cataloglistModel = catalog.model('main', cataloglistSchema)
        let cataloglist = await cataloglistModel.findById(CATALOGLIST_OBJID)
        cataloglist.list.push({ 'collectionName': req.body.collection, 'entryName': req.body.name })
        await cataloglistModel.findByIdAndUpdate(CATALOGLIST_OBJID, { 'list': cataloglist.list })
        logger.info('Updated cataloglist')

        logger.http('Request successful')
        res.status(200).json({})
    }
    catch (error)
    {
        logger.error(`Unknown error occured at post /data: ${error.message}`)
        res.status(500).json({ message: `Unknown error occured: ${error.message}` })
    }
})


/*
Request usage:
req.body: collection: str, name: str
Response:
200: empty
400 & 500: message: error message
*/
DATA_DELETE_REQUIRED_KEYS = ['collection', 'name', 'password']
router.delete('/data', async (req, res) => 
{
    logger.http('Delete request received on /data')
    try
    {
        logger.http(`Request body: ${JSON.stringify(req.body, null, 2)}`)

        // check if req.body is good
        if (!DATA_DELETE_REQUIRED_KEYS.every(item => item in req.body))
        {
            logger.http('Request body does not contain all required values, stopping')
            res.status(400).json({ message: 'Missing required values in request body' })
            return
        }

        // check password
        if (req.body.password != DELETE_PASSWORD)
        {
            logger.warn(`Incorrect password detected: ${req.body.password}`)
            res.status(400).json({ message: 'Incorrect password' })
            return
        }
        
        // deleting entry on main database
        const logModel = database.model(req.body.collection, logSchema)
        if (!logModel)
        {
            logger.warn(`Didn't find collection named ${req.body.collection}, stopping`)
            res.status(400).json({ message: 'Collection doesn\'t exist' })
            return
        }
        const logEntry = await logModel.findOneAndDelete({ "name": req.body.name })
        logger.info(`Deleted log entry: ${logEntry}`)

        // delete collection if empty
        const docCount = await logModel.countDocuments({})
        logger.info(`${docCount} documents left in collection: ${req.body.collection}`)
        if (docCount == 0)
        {
            logModel.collection.drop()
            logger.info('Collection dropped')
        }

        // update on catalog database
        const cataloglistModel = catalog.model('main', cataloglistSchema)
        let cataloglist = await cataloglistModel.findById(CATALOGLIST_OBJID)
        const index = cataloglist.list.indexOf({ "collectionName": req.body.collection, "entryName": req.body.name })
        cataloglist.list.splice(index, 1)
        await cataloglistModel.findByIdAndUpdate(CATALOGLIST_OBJID, { "list": cataloglist.list })
        logger.info('Updated cataloglist')

        logger.http('Request successful')
        res.status(200).json({ })
    }
    catch (error)
    {
        logger.error(`Unknown error occured at delete /data: ${error.message}`)
        res.status(500).json({ message: `Unknown error occured: ${error.message}` })
    }
})

/*
Request usage: no body needed
Response:
200: returns an array of objects that contain: a string called name, and a similar array of objects called next
400 & 500: message: error message
*/
router.get('/datatree', async (req, res) => 
{
    logger.http('Get request received on /datatree')
    try
    {
        // get datatree from catalog
        logger.info('Getting datatree from catalog database')
        const cataloglistModel = catalog.model('main', cataloglistSchema)
        let cataloglist = await cataloglistModel.findById(CATALOGLIST_OBJID)

        // construct tree object from list
        logger.info('Constructing tree object from list')
        let root = { name: 'root', next: [] }
        cataloglist.list.forEach((element) =>
        {
            // dir[0] is superFolder, dir[1] is subFolder
            const dir = element.collectionName.split('/')
            // if superFolder doesn't exist, make one
            if (!root.next.some((element) => { return element.name == dir[0] }))
                root.next.push({ name: dir[0], next: [] })
            // get superFolder
            let superFolder = root.next.find((element) => { return element.name == dir[0] })
            // if subFolder doesn't exist under superFolder, make one
            if (!superFolder.next.some((element) => { return element.name == dir[1] }))
                superFolder.next.push({ name: dir[1], next: [] })
            // get subFolder
            let subFolder = superFolder.next.find((element) => { return element.name == dir[1] })
            // add entry under subFolder
            subFolder.next.push({ name: element.entryName, next: [] })
        })
        logger.info('Tree built successfully')

        logger.http('Request successful')
        res.status(200).json(root.next)
    }
    catch (error)
    {
        console.log(error)
        logger.error(`Unknown error occured at get /datatree: ${error.message}`)
        res.status(500).json({ message: `Unknown error occured: ${error.message}` })
    }
})


/*
Request usage:
req.body: collection: str, name: str, plot: comma-separated string, no space, extraArgs (additional): str
Response:
200: plot: a string called plot that can be parsed as html containing the plot
400 & 500: message: error message
*/
const PLOT_GET_REQUIRED_KEYS = ['collection', 'name', 'plot', 'parser']
router.get('/plot', async (req, res) => 
{
    logger.http('Get request received on /plot')
    try
    {
        logger.http(`Request query: ${JSON.stringify(req.query, null, 2)}`)

        // check if req.query is good
        if (!PLOT_GET_REQUIRED_KEYS.every(item => item in req.query))
        {
            logger.http('Request query does not contain all required values, stopping')
            res.status(400).json({ message: 'Missing required values in request query' })
            return
        }

        // check if parser exists
        let parser = `${req.query.parser}.py`
        if (!fs.existsSync(parser))
        {
            logger.warn(`Parser: ${parser} does not exist`)
            res.status(400).json({ message: 'Parser does not exist' })
            return
        }

        // check and get collection & entry
        const logModel = database.model(req.query.collection, logSchema)
        if (!logModel)
        {
            logger.warn(`Didn't find collection named ${req.query.collection}, stopping`)
            res.status(400).json({ message: 'Collection doesn\'t exist' })
            return
        }
        const logEntry = await logModel.findOne({ "name": req.query.name })
        if (!logEntry)
        {
            logger.warn(`Didn't find entry named ${req.query.name}, stopping`)
            res.status(400).json({ message: 'Entry doesn\'t exist' })
            return
        }
        logger.info('Got log entry')

        // write log data to temp file
        temp_filename = Math.random().toString(36).substring(2, 5)
        templog = `${temp_filename}.csv`
        tempplot = `${temp_filename}.html`
        logger.info('Writing log data to templog')
        fs.writeFileSync(templog, logEntry.data)

        // spwan python process to generate plot
        logger.info('Spawning log2plot process')
        let args = ['-p'].concat(req.query.plot.split(',')).concat(['-i', templog, '-o', tempplot, '-v', req.query.parser])
        if (req.query.extraArgs != undefined)
            args = args.concat([req.query.extraArgs])
        logger.info(`Arguments: ${args.join(' ')}`)
        const log2plot = spawn('python3', ['log2plot.py'].concat(args))
        let stdOut = ""
        let stdErr = ""

        // harvest python script outputs
        log2plot.stdout.on('data', function (data)
        {
            stdOut = data.toString()
        })

        log2plot.stderr.on('data', function (data)
        {
            stdErr = data.toString()
        })

        log2plot.on('close', (code) => 
        {
            logger.info(`Child process close all stdio with code ${code}`)

            if (code == 0)
            {
                logger.info('Reading tempplot')
                const plot = fs.readFileSync(tempplot, 'utf8')
                logger.http('Request successful')
                res.status(200).json({ plot: plot })
            }
            else
            {
                logger.error(`log2plot produces error: ${stdErr}`)
                logger.info(`log2plot produces log: ${stdOut}`)
                res.status(400).json({ message: `Error occured while generating plot: ${stdErr}` })
            }

            if (fs.existsSync(templog))
                fs.unlinkSync(templog)
            if (fs.existsSync(tempplot))
                fs.unlinkSync(tempplot)
        })

        // if the code above is never called, this should result in a timeout
    }
    catch (error)
    {
        logger.error(`Unknown error occured at get /plot: ${error.message}`)
        res.status(500).json({ message: `Unknown error occured: ${error.message}` })
    }
})


module.exports = router
