import {DataSource} from "typeorm";
import {BalanceModel} from "../models/balance-model";
import {CategoryModel} from "../models/category-model";
import {OrganizationModel} from "../models/organization-model";
import {OrganizationUserModel} from "../models/organization-user-model";
import {RoleModel} from "../models/role-model";
import {UserModel} from "../models/user-model";
import {UserSettingsModel} from "../models/user-settings-model";
import {SessionModel} from "../models/session-model";
import {TransactionModel} from "../models/transaction-model";
import {RecurringBookedModel} from "../models/recurring-booked-model";
import {RecurringTransactionModel} from "../models/recurring-transaction-model";


export const AppDataSource: DataSource = new DataSource({
    type: 'mysql',
    host: process.env['NODE_ENV'] === 'development' ? 'localhost' : 'mysql',
    port: 3306,
    timezone: 'Z',
    supportBigNumbers: true,
    maxQueryExecutionTime: 5000,
    poolSize: 10,
    username: 'root',
    password: 'cantropee',
    database: 'cantropee',
    logging: process.env['NODE_ENV'] === 'development',
    entities: [
        BalanceModel,
        CategoryModel,
        OrganizationModel,
        OrganizationUserModel,
        RecurringBookedModel,
        RecurringTransactionModel,
        RoleModel,
        SessionModel,
        TransactionModel,
        UserModel,
        UserSettingsModel,
    ],
    migrations: [],
    subscribers: [],
});
