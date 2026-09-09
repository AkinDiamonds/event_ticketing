import winston from "winston";
import { env } from "#config/env.js";

const isProduction = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"] ?? (isProduction ? "info" : "debug"),

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  // Silence all output during test runs unless explicitly overridden.
  silent: isTest,

  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (!isProduction && !isTest) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${String(timestamp)} ${String(level)}: ${String(message)}`;
        })
      ),
    })
  );
}

export default logger;
