const fs = require('fs');
const path = require('path');
const winston = require('winston');
const logDirectory = path.join(process.cwd(), 'logs');
 
const {
    errors,
    metadata,
    json,
    splat,
    combine,
    timestamp,
    printf,
    colorize
} = winston.format;

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);


const errorPrinter = winston.format.printf(info => {
    return info.message;
});

const transports = [
    new winston.transports.File({
        filename: path.resolve(logDirectory, 'tester.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false,
    }),
    new winston.transports.Console({
        format: combine(
            errorPrinter
        ),
        colorize: true
    })
];

const logger = new winston.createLogger({
    transports,
    format: combine(
        errors({
            stack: true
        }),
        metadata(),
        json(),
    ),
    exitOnError: false
});

module.exports = logger;