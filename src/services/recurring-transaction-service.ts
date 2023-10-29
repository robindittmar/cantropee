import {getConnection} from "../core/database";
import {RecurringTransactionModel} from "../models/recurring-transaction-model";
import {getCategoriesLookup} from "./categories-service";
import {getTransactionByDatabaseId, insertTransaction, Transaction} from "./transaction-service";
import {ResultSetHeader} from "mysql2";
import moment from 'moment-timezone';

export enum ExecutionPolicy {
    StartOfMonth,
    EndOfMonth,
}

export interface RecurringTransaction {
    id: string;
    insertTimestamp: Date;
    timezone: string;
    executionPolicy: ExecutionPolicy;
    executionPolicyData: object;
    firstExecution: Date;
    nextExecution: Date;
    lastExecution: Date | undefined;
    category: string;
    value: number;
    value7: number | undefined;
    value19: number | undefined;
    vat7: number | undefined;
    vat19: number | undefined;
    note: string | undefined;
}

const makeTransactionFromRecurring = (recurring: RecurringTransaction): Transaction => {
    return {
        id: '',
        rowIdx: -1,
        refId: undefined,
        pending: undefined,
        insertTimestamp: new Date(),
        category: recurring.category,
        effectiveTimestamp: recurring.nextExecution,
        value: recurring.value,
        value7: recurring.value7 ?? 0,
        value19: recurring.value19 ?? 0,
        vat7: recurring.vat7 ?? 0,
        vat19: recurring.vat19 ?? 0,
        note: recurring.note,
    };
}

export async function getRecurringTransaction(organizationId: string, id: string): Promise<RecurringTransaction> {
    const conn = await getConnection();
    const [dbRecurring] = await conn.query<RecurringTransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid' +
        '       insert_timestamp, timezone, execution_policy, execution_policy_data, first_execution,' +
        '       next_execution, last_execution, category_id, value, value19, value7, vat19, vat7, note' +
        'FROM cantropee.recurring_transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND uuid = UUID_TO_BIN(id)' +
        ' AND active = true',
        [organizationId, id]
    );
    conn.release();

    let recurring = dbRecurring[0];
    if (!recurring) {
        throw new Error('Recurring transaction not found');
    }

    const categoriesLookup = await getCategoriesLookup(organizationId);

    return {
        id: recurring.uuid,
        insertTimestamp: recurring.insert_timestamp,
        timezone: recurring.timezone,
        executionPolicy: recurring.execution_policy,
        executionPolicyData: recurring.execution_policy_data ?? {},
        firstExecution: recurring.first_execution,
        nextExecution: recurring.next_execution,
        lastExecution: recurring.last_execution,
        category: categoriesLookup[recurring.category_id] ?? '[ERROR]',
        value: recurring.value,
        value19: recurring.value19,
        value7: recurring.value7,
        vat19: recurring.vat19,
        vat7: recurring.vat7,
        note: recurring.note,
    };
}

export async function getRecurringTransactions(organizationId: string, pendingOnly: boolean = false): Promise<RecurringTransaction[]> {
    const query = pendingOnly ?
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, timezone, execution_policy, execution_policy_data, first_execution,' +
        '       next_execution, last_execution, category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.recurring_transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND next_execution <= NOW()' +
        ' AND active = true'
        :
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, timezone, execution_policy, execution_policy_data, first_execution,' +
        '       next_execution, last_execution, category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.recurring_transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND active = true';

    const conn = await getConnection();
    const [dbRecurring] = await conn.query<RecurringTransactionModel[]>(
        query,
        [organizationId]
    );
    conn.release();

    const categoriesLookup = await getCategoriesLookup(organizationId);
    let recurringTransactions: RecurringTransaction[] = [];
    for (const recurring of dbRecurring) {
        recurringTransactions.push({
            id: recurring.uuid,
            insertTimestamp: recurring.insert_timestamp,
            timezone: recurring.timezone,
            executionPolicy: recurring.execution_policy,
            executionPolicyData: recurring.execution_policy_data ?? {},
            firstExecution: recurring.first_execution,
            nextExecution: recurring.next_execution,
            lastExecution: recurring.last_execution,
            category: categoriesLookup[recurring.category_id] ?? '[ERROR]',
            value: recurring.value,
            value19: recurring.value19,
            value7: recurring.value7,
            vat19: recurring.vat19,
            vat7: recurring.vat7,
            note: recurring.note,
        })
    }

    return recurringTransactions;
}

export async function updateRecurringTransactionNextExecution(organizationId: string, recurring: RecurringTransaction): Promise<boolean> {
    const conn = await getConnection();
    const [dbUpdate] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.recurring_transactions' +
        ' SET next_execution=?' +
        ' WHERE organization_uuid=UUID_TO_BIN(?)' +
        ' AND uuid=UUID_TO_BIN(?)',
        [recurring.nextExecution, organizationId, recurring.id]
    );
    conn.release();

    return dbUpdate.affectedRows === 1;
}

// Get local time zone in frontend:
// Intl.DateTimeFormat().resolvedOptions().timeZone
const leapToNextExecution = (recurring: RecurringTransaction): Date => {
    let current = moment.utc(recurring.nextExecution).tz(recurring.timezone);

    if (recurring.executionPolicy === ExecutionPolicy.StartOfMonth) {
        let next = moment(current).add(1, 'month');
        return moment(next.utc()).toDate();
    } else {
        let next = moment(current).add(1, 'day').endOf('month').endOf('day');
        return moment(next.utc()).toDate();
    }
};

export async function bookPendingRecurringTransactions(organizationId: string): Promise<string[]> {
    let newIds: string[] = [];

    let pending = await getRecurringTransactions(organizationId, true);

    const conn = await getConnection();
    try {
        let now = new Date();
        for (const recurring of pending) {
            while (recurring.nextExecution <= now) {
                let t = makeTransactionFromRecurring(recurring);

                await conn.query('START TRANSACTION');
                let transactionId = await insertTransaction(conn, organizationId, t);
                if (transactionId === 0) {
                    await conn.query('ROLLBACK');
                    console.error('Error writing transaction, rolled back.' + t);
                    break;
                }
                console.log(transactionId);

                let transaction = await getTransactionByDatabaseId(conn, organizationId, transactionId);

                let [insertLink] = await conn.execute<ResultSetHeader>(
                    'INSERT INTO cantropee.recurring_booked (recurring_uuid, transaction_uuid)' +
                    ' VALUES (UUID_TO_BIN(?),UUID_TO_BIN(?))',
                    [recurring.id, transaction.id]
                );
                if (insertLink.affectedRows !== 1) {
                    await conn.query('ROLLBACK');
                    console.error('Error writing link for recurring transaction, rolled back.' + recurring);
                    break;
                }

                await conn.query('COMMIT');

                newIds.push(transaction.id);
                recurring.nextExecution = leapToNextExecution(recurring);
            }

            if (!await updateRecurringTransactionNextExecution(organizationId, recurring)) {
                console.error('Uh oh, could not update recurring transaction: ' + JSON.stringify(recurring));
            }
        }
    } finally {
        conn.release();
    }

    return newIds;
}
