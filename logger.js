const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({level, message, timestamp}) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`
        })
    ),

    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'ecr-cleanup.log'})
    ]
});

module.exports = logger;