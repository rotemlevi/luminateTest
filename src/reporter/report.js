const fs = require('fs');
const path = require('path');
const winston = require('winston');
const reportsDirectory = path.join(process.cwd(), 'reports');
const {
    splat,
    combine,
    timestamp,
    printf,
    colorize
} = winston.format;

fs.existsSync(reportsDirectory) || fs.mkdirSync(reportsDirectory);

const transports = [
    new winston.transports.File({
        level: 'info',
        filename: path.resolve(reportsDirectory, 'report.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: true
    }),
    new winston.transports.Console()
];

// meta param is ensured by splat()
const myFormat = printf(({
    timestamp,
    level,
    message,
    meta
}) => {
    var msg = "";
    try {
        msg = message[Object.keys(message)[0]].message;
    } finally {

    }
    return msg;
});

const logger = new winston.createLogger({
    format: combine(
        timestamp(),
        splat(),
        myFormat
    ),
    transports,
    exitOnError: false
});

module.exports = {
    reportSuccess: message => logger.info(message),
    reportFailure: message => logger.error(message)
};