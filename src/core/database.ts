import * as mysql from 'mysql2/promise';
import {RowDataPacket} from "mysql2/promise";
import {DataSource} from "typeorm";
import {BalanceModel} from "../models/balance-model";
import {CategoryModel} from "../models/category-model";
import {OrganizationModel} from "../models/organization-model";
import {OrganizationUserModel} from "../models/organization-user-model";
import {RoleModel} from "../models/role-model";
import {UserModel} from "../models/user-model";
import {UserSettingsModel} from "../models/user-settings-model";
import {SessionModel} from "../models/session-model";

let mysqlConnectionPool: mysql.Pool;

export interface ResultUUID extends RowDataPacket {
    uuid: string;
}

export function initDatabaseConnection() {
    mysqlConnectionPool = mysql.createPool({
        host: process.env['NODE_ENV'] === 'development' ? 'localhost' : 'mysql',
        user: 'ctp_svc_usr',
        password: 'vmV55V4E7GF4wD^bD#x*Rd4ruR!HXn*a',
        port: 3306,
        charset: 'utf8',
        database: 'cantropee',
        timezone: 'Z',
        enableKeepAlive: true,
    });
}

export async function getConnection() {
    return await mysqlConnectionPool.getConnection();
}


export const AppDataSource: DataSource = new DataSource({
    type: 'mysql',
    host: process.env['NODE_ENV'] === 'development' ? 'localhost' : 'mysql',
    port: 3306,
    username: 'root',
    password: 'cantropee',
    database: 'cantropee',
    logging: process.env['NODE_ENV'] === 'development',
    entities: [
        BalanceModel,
        CategoryModel,
        OrganizationModel,
        OrganizationUserModel,
        RoleModel,
        SessionModel,
        UserModel,
        UserSettingsModel,
    ],
    migrations: [],
    subscribers: [],
});
