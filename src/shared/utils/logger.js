const winston = require('winston');
const { env } = require('../config/env');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
  }),
  new winston.transports.File({ 
    filename: path.join(logsDir, 'all.log') 
  }),
];

const logger = winston.createLogger({
  level: env.server.nodeEnv === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});

module.exports = { logger };
