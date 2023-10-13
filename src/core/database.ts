import * as mysql from 'mysql2/promise';

let mysqlConnectionPool: mysql.Pool;

export function initDatabaseConnection() {
    mysqlConnectionPool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'cantropee',
        port: 3306,
        charset: 'utf8',
        database: 'cantropee'
    });
}

export async function getConnection() {
    return await mysqlConnectionPool.getConnection();
}
