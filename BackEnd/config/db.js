const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;

const poolConfig = connectionUri
  ? {
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 2,
      maxIdle: 1,
      idleTimeout: 5000,
      queueLimit: 0,
      ssl:
        connectionUri.includes("clever-cloud") || connectionUri.includes("ssl")
          ? { rejectUnauthorized: false }
          : undefined,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "12345",
      database: process.env.DB_NAME || "dacnpm",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      waitForConnections: true,
      connectionLimit: 2,
      maxIdle: 1,
      idleTimeout: 5000,
      queueLimit: 0,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

const db = mysql.createPool(poolConfig);

module.exports = db;
