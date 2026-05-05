// =============================================================================
// db/connection.js — MySQL connection pool using mysql2/promise
// =============================================================================
// Wraps queries with Prometheus instrumentation (dbQueriesTotal, dbQueryDuration).
// Exports:
//   pool      — raw mysql2 pool (for migrations)
//   query()   — instrumented query helper
//   getPool() — returns the pool (for health checks)
// =============================================================================

const mysql = require('mysql2/promise');
const {
  dbQueriesTotal,
  dbQueryDuration,
  dbPoolActiveConnections,
} = require('../metrics');

let pool;

/**
 * Initialise the connection pool. Safe to call multiple times.
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'monitoring_demo',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Keep connections alive behind NAT / RDS proxy
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Periodically report pool stats
    setInterval(() => {
      const p = pool.pool; // underlying pool from mysql2
      if (p) {
        dbPoolActiveConnections.set(
          p._allConnections ? p._allConnections.length : 0
        );
      }
    }, 5000);
  }
  return pool;
}

/**
 * Execute a query with Prometheus instrumentation.
 *
 * @param {string} sql        — SQL statement
 * @param {any[]}  params     — Bind parameters
 * @param {string} operation  — e.g. 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
 * @param {string} table      — e.g. 'users', 'products', 'orders'
 * @returns {Promise<[any[], any]>}
 */
async function query(sql, params = [], operation = 'UNKNOWN', table = 'unknown') {
  const end = dbQueryDuration.startTimer({ operation, table });
  try {
    const result = await getPool().execute(sql, params);
    dbQueriesTotal.inc({ operation, table, success: 'true' });
    return result;
  } catch (err) {
    dbQueriesTotal.inc({ operation, table, success: 'false' });
    throw err;
  } finally {
    end();
  }
}

module.exports = { getPool, query };
