// Reference: https://reflectoring.io/node-logging-winston/

const { format, createLogger, transports } = require('winston')
const { combine, timestamp, printf } = format
require('winston-daily-rotate-file')

const fileRotateTransport = new transports.DailyRotateFile(
{
    filename: 'logs/rotate-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
})

const customFormat = printf(({ level, message, timestamp }) => 
{
    return `${timestamp} ${level}: ${message}`;
})

const logger = createLogger(
{
    level: 'debug',
    format: combine(timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }), customFormat),
    transports: [fileRotateTransport, new transports.Console()]
})

module.exports = logger