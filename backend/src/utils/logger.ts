import winston from 'winston';

const isProduction = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),

    transports: [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        }),

        new winston.transports.File({
            filename: "logs/combined.log",
        }),
    ],
});

if (!isProduction) {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({
                    format: "HH:mm:ss",
                }),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            ),
        })
    );   
}

export default logger;