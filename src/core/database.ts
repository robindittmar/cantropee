import * as mysql from 'mysql2/promise';
import {RowDataPacket} from "mysql2/promise";

let mysqlConnectionPool: mysql.Pool;

export interface ResultUUID extends RowDataPacket {
    uuid: string;
}

export function initDatabaseConnection() {
    mysqlConnectionPool = mysql.createPool({
        host: process.env['NODE_ENV'] === 'development' ? 'localhost' : 'mysql',
        user: 'root',
        password: 'cantropee',
        port: 3306,
        charset: 'utf8',
        database: 'cantropee',
        timezone: 'Z',
    });

    let acquired = 0;
    mysqlConnectionPool.on('acquire', () => {
        acquired += 1;
    });
    mysqlConnectionPool.on('release', () => {
        acquired -= 1;
    });
}

export async function getConnection() {
    return await mysqlConnectionPool.getConnection();
}
