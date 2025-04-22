
// Import the winston library for logging
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',

    // Define the format of the log messages
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({level, message, timestamp}) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`
        })
    ),

    // Specify where the log messages should be output
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'ecr-cleanup.log'})
    ]
});

// Export the logger so it can be used in other files
module.exports = logger;