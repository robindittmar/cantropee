import {getConnection} from "../core/database";
import {RecurringTransactionLinkEffectiveDate, RecurringTransactionModel} from "../models/recurring-transaction-model";
import {getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";
import {getTransactionByDatabaseId, insertTransaction, Transaction} from "./transaction-service";
import {invalidateAllBalances} from "./balance-service";
import {ResultSetHeader} from "mysql2";
import moment from 'moment-timezone';
import {PoolConnection} from "mysql2/promise";

export enum ExecutionPolicy {
    StartOfMonth,
    EndOfMonth,
}

export interface RecurringTransaction {
    id: string;
    active: boolean,
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
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, active,' +
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
        active: recurring.active !== 0,
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

export async function getRecurringTransactions(organizationId: string, nextExecutionSmallerEqual: Date | undefined = undefined): Promise<RecurringTransaction[]> {
    const query = !!nextExecutionSmallerEqual ?
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, active,' +
        '       insert_timestamp, timezone, execution_policy, execution_policy_data, first_execution,' +
        '       next_execution, last_execution, category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.recurring_transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND next_execution <= ?' +
        ' ORDER BY active DESC, id DESC'
        :
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, active,' +
        '       insert_timestamp, timezone, execution_policy, execution_policy_data, first_execution,' +
        '       next_execution, last_execution, category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.recurring_transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' ORDER BY active DESC, id DESC';

    const conn = await getConnection();
    const [dbRecurring] = await conn.query<RecurringTransactionModel[]>(
        query,
        [organizationId, nextExecutionSmallerEqual]
    );
    conn.release();

    const categoriesLookup = await getCategoriesLookup(organizationId);
    let recurringTransactions: RecurringTransaction[] = [];
    for (const recurring of dbRecurring) {
        recurringTransactions.push({
            id: recurring.uuid,
            active: recurring.active !== 0,
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
        });
    }

    return recurringTransactions;
}

export async function insertRecurringTransaction(organizationId: string, recurring: RecurringTransaction): Promise<number> {
    const lookup = await getCategoriesReverseLookup(organizationId);

    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.recurring_transactions' +
        ' (organization_uuid, timezone, execution_policy, execution_policy_data,' +
        ' first_execution, next_execution, last_execution, category_id,' +
        ' value, value19, value7, vat19, vat7, note)' +
        'VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            organizationId,
            recurring.timezone,
            recurring.executionPolicy,
            JSON.stringify(recurring.executionPolicyData),
            recurring.firstExecution,
            recurring.firstExecution, // this is on purpose
            recurring.lastExecution,
            lookup[recurring.category] ?? 0,
            recurring.value,
            recurring.value19 !== 0 ? recurring.value19 : null,
            recurring.value7 !== 0 ? recurring.value7 : null,
            recurring.vat19 !== 0 ? recurring.vat19 : null,
            recurring.vat7 !== 0 ? recurring.vat7 : null,
            recurring.note,
        ]
    );

    return result.insertId;
}

async function setRecurringTransactionInactive(conn: PoolConnection, organizationId: string, recurring: RecurringTransaction): Promise<boolean> {
    const [dbUpdate] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.recurring_transactions' +
        ' SET active=false' +
        ' WHERE organization_uuid=UUID_TO_BIN(?)' +
        ' AND uuid=UUID_TO_BIN(?)',
        [organizationId, recurring.id]
    );

    return dbUpdate.affectedRows === 1;
}

export async function updateRecurringTransactionNextExecution(conn: PoolConnection, organizationId: string, recurring: RecurringTransaction): Promise<boolean> {
    const [dbUpdate] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.recurring_transactions' +
        ' SET next_execution=?' +
        ' WHERE organization_uuid=UUID_TO_BIN(?)' +
        ' AND uuid=UUID_TO_BIN(?)',
        [recurring.nextExecution, organizationId, recurring.id]
    );

    return dbUpdate.affectedRows === 1;
}

const leapToNextExecution = (recurring: RecurringTransaction): Date => {
    let current = moment.utc(recurring.nextExecution).tz(recurring.timezone);

    if (recurring.executionPolicy === ExecutionPolicy.StartOfMonth) {
        let next = moment(current).add(1, 'month');
        return moment(next.utc()).toDate();
    } else if (recurring.executionPolicy === ExecutionPolicy.EndOfMonth) {
        let next = moment(current).add(1, 'day').endOf('month').endOf('day');
        return moment(next.utc()).toDate();
    }

    return current.utc().toDate();
};

export async function bookPendingRecurringTransactions(organizationId: string, _previewCount: number): Promise<string[]> {
    let newIds: string[] = [];

    const processTransaction = async (recurring: RecurringTransaction): Promise<string | undefined> => {
        let t = makeTransactionFromRecurring(recurring);

        await conn.query('START TRANSACTION');
        let transactionId = await insertTransaction(conn, organizationId, t);
        if (transactionId === 0) {
            await conn.query('ROLLBACK');
            console.error('Error writing transaction, rolled back.' + t);
            return undefined;
        }

        let transaction = await getTransactionByDatabaseId(conn, organizationId, transactionId);

        let [insertLink] = await conn.execute<ResultSetHeader>(
            'INSERT INTO cantropee.recurring_booked (recurring_uuid, transaction_uuid)' +
            ' VALUES (UUID_TO_BIN(?),UUID_TO_BIN(?))',
            [recurring.id, transaction.id]
        );
        if (insertLink.affectedRows !== 1) {
            await conn.query('ROLLBACK');
            console.error('Error writing link for recurring transaction, rolled back.' + recurring);
            return undefined;
        }

        await conn.query('COMMIT');
        return transaction.id;
    };

    const now = new Date();
    let pending = await getRecurringTransactions(organizationId, now);

    const conn = await getConnection();
    try {
        for (const recurring of pending) {
            while (recurring.nextExecution <= now) {
                const id = await processTransaction(recurring);
                if (!id) {
                    break;
                }

                newIds.push(id);
                recurring.nextExecution = leapToNextExecution(recurring);
                if (recurring.lastExecution) {
                    if (recurring.nextExecution > recurring.lastExecution) {
                        if (!await setRecurringTransactionInactive(conn, organizationId, recurring)) {
                            console.error('Could not invalidate recurring transactions that leaped over lastExecution');
                        }
                        break;
                    }
                }
            }

            if (!await updateRecurringTransactionNextExecution(conn, organizationId, recurring)) {
                console.error('Uh oh, could not update recurring transaction: ' + JSON.stringify(recurring));
            }

            // if (previewCount > 0) {
            //     const pendingTransactionDates = (await getPendingTransactionDatesForRecurring(conn, recurring)).map(d => d.getTime());
            //
            //     if (pendingTransactionDates.length === previewCount) {
            //         continue;
            //     }
            //
            //     for (let i = 0; i < previewCount; i++) {
            //         if (pendingTransactionDates.includes(recurring.nextExecution.getTime())) {
            //             continue;
            //         }
            //
            //         const id = await processTransaction(recurring);
            //         if (!id) {
            //             break;
            //         }
            //
            //         newIds.push(id);
            //         recurring.nextExecution = leapToNextExecution(recurring);
            //         if (recurring.lastExecution) {
            //             if (recurring.nextExecution > recurring.lastExecution) {
            //                 break;
            //             }
            //         }
            //     }
            // }
        }
    } finally {
        conn.release();
    }

    return newIds;
}

export async function deleteRecurringTransaction(organizationId: string, recurringTransactionId: string, cascade: boolean = false): Promise<boolean> {
    const conn = await getConnection();
    try {
        await conn.query('START TRANSACTION');

        if (cascade) {
            const [_] = await conn.query<ResultSetHeader>(
                'UPDATE cantropee.transactions SET active = false' +
                ' WHERE organization_uuid = UUID_TO_BIN(?)' +
                ' AND uuid IN (' +
                '   SELECT transaction_uuid FROM cantropee.recurring_booked WHERE recurring_uuid = UUID_TO_BIN(?))',
                [organizationId, recurringTransactionId]
            );

            if (!(await invalidateAllBalances(conn, organizationId))) {
                await conn.query('ROLLBACK');
                return false;
            }
        }

        const [updateRecurring] = await conn.query<ResultSetHeader>(
            'UPDATE cantropee.recurring_transactions SET active = false' +
            ' WHERE uuid = UUID_TO_BIN(?)' +
            ' AND organization_uuid = UUID_TO_BIN(?)',
            [recurringTransactionId, organizationId]
        );

        if (updateRecurring.affectedRows !== 1) {
            await conn.query('ROLLBACK');
            return false;
        }

        await conn.query('COMMIT')
        return true;
    } catch {
        await conn.query('ROLLBACK');
    } finally {
        conn.release();
    }

    return false;
}

export async function getPendingTransactionDatesForRecurring(conn: PoolConnection, recurring: RecurringTransaction): Promise<Date[]> {
    const [rows] = await conn.query<RecurringTransactionLinkEffectiveDate[]>(
        'SELECT T.effective_timestamp AS effective_timestamp' +
        ' FROM cantropee.recurring_booked B' +
        ' INNER JOIN cantropee.transactions T ON B.transaction_uuid=T.uuid' +
        ' WHERE B.recurring_uuid = UUID_TO_BIN(?)' +
        ' AND T.effective_timestamp > NOW()',
        [recurring.id]
    );

    let dates: Date[] = [];
    for (const row of rows) {
        dates.push(row.effective_timestamp);
    }

    return dates;
}

export async function updateTransactionLink(conn: PoolConnection, oldId: string, newId: string): Promise<boolean> {
    let [result] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.recurring_booked' +
        ' SET transaction_uuid=UUID_TO_BIN(?)' +
        ' WHERE transaction_uuid=UUID_TO_BIN(?)',
        [newId, oldId]
    );

    return result.affectedRows > 0;
}
