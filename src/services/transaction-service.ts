import {getConnection} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {ResultSetHeader} from "mysql2";
import {getCategories, getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";
import {PoolConnection} from "mysql2/promise";
import {bookPendingRecurringTransactions, updateTransactionLink} from "./recurring-transaction-service";
import {ServerError} from "../core/server-error";


export interface Transaction {
    id: string;
    rowIdx: number;
    refId: string | undefined;
    category: string;
    insertTimestamp: Date;
    pending: boolean | undefined;
    effectiveTimestamp: Date;
    value: number;
    value7: number;
    value19: number;
    vat7: number;
    vat19: number;
    note: string | undefined;
}

interface TransactionDiff {
    id: string;
    insertTimestamp: Date;
    effectiveTimestamp: Date | undefined;
    category: string | undefined;
    value: number | undefined;
    value7: number | undefined;
    value19: number | undefined;
    vat7: number | undefined;
    vat19: number | undefined;
    note: string | undefined;
    isDeposit: boolean | undefined;
}

export interface PaginatedTransactions {
    total: number;
    start: number;
    count: number;
    data: Transaction[];
}

const modelToTransaction = (t: TransactionModel, lookup: { [id: number]: string }): Transaction => {
    return {
        id: t.uuid,
        refId: t.ref_uuid,
        rowIdx: 1,
        category: lookup[t.category_id] ?? '[ERROR]',
        insertTimestamp: t.insert_timestamp,
        pending: t.effective_timestamp > new Date(),
        effectiveTimestamp: t.effective_timestamp,
        value: t.value,
        value7: t.value7 ?? 0,
        value19: t.value19 ?? 0,
        vat7: t.vat7 ?? 0,
        vat19: t.vat19 ?? 0,
        note: t.note,
    };
};

const transactionsDataEqual = (a: Transaction, b: Transaction): boolean => {
    return (
        a.effectiveTimestamp.getTime() === b.effectiveTimestamp.getTime() &&
        a.category === b.category &&
        a.value === b.value &&
        a.value19 === b.value19 &&
        a.value7 === b.value7 &&
        a.vat19 === b.vat19 &&
        a.vat7 === b.vat7 &&
        a.note === b.note
    );
};

export async function getTransactionByDatabaseId(conn: PoolConnection, organizationId: string, id: number): Promise<Transaction> {
    const [result] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, insert_timestamp,' +
        '       effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid, category_id, value, value19, value7,' +
        '       vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE id = ?',
        [id]
    );
    conn.release();

    if (result.length < 1 || result[0] === undefined) {
        throw new Error('Transaction not found');
    }

    return modelToTransaction(result[0], await getCategoriesLookup(organizationId));
}

export async function getTransaction(organizationId: string, id: string): Promise<Transaction> {
    const conn = await getConnection();
    const [result] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, insert_timestamp,' +
        '       effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid, category_id, value, value19, value7,' +
        '       vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE uuid = UUID_TO_BIN(?)' +
        ' AND organization_uuid = UUID_TO_BIN(?)',
        [id, organizationId]
    );
    conn.release();

    if (result.length < 1 || result[0] === undefined) {
        throw new ServerError(404, 'Transaction not found');
    }

    return modelToTransaction(result[0], await getCategoriesLookup(organizationId));
}

export async function getTransactionHistory(organizationId: string, transactionId: string): Promise<Transaction[]> {
    let transactions: Transaction[] = [];

    const categoriesLookup = await getCategoriesLookup(organizationId);
    const conn = await getConnection();
    const [result] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid, insert_timestamp,' +
        '       effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid, category_id, value, value19, value7,' +
        '       vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE current_version_uuid = UUID_TO_BIN(?)' +
        ' AND organization_uuid = UUID_TO_BIN(?)' +
        ' ORDER BY insert_timestamp DESC, id DESC',
        [transactionId, organizationId]
    );
    conn.release();

    for (const row of result) {
        transactions.push({
            id: row.uuid,
            rowIdx: 0,
            refId: row.ref_uuid,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: false,
            effectiveTimestamp: row.effective_timestamp,
            value: row.value,
            value7: row.value7 ?? 0,
            value19: row.value19 ?? 0,
            vat7: row.vat7 ?? 0,
            vat19: row.vat19 ?? 0,
            note: row.note,
        });
    }

    return transactions;
}

export async function calcTransactionHistoryDiff(organizationId: string, transactionId: string): Promise<TransactionDiff[]> {
    const transaction = await getTransaction(organizationId, transactionId);
    const history = await getTransactionHistory(organizationId, transactionId);

    let result: TransactionDiff[] = [];
    result.push({
        id: transaction.id,
        insertTimestamp: transaction.insertTimestamp,
        effectiveTimestamp: transaction.effectiveTimestamp,
        category: transaction.category,
        value: transaction.value,
        value7: transaction.value7,
        value19: transaction.value19,
        vat7: transaction.vat7,
        vat19: transaction.vat19,
        note: transaction.note,
        isDeposit: transaction.value > 0,
    });

    let prev = transaction;
    let prevIsDeposit = transaction.value > 0;
    for (const t of history) {
        let isDeposit = t.value > 0;
        result.push({
            id: t.id,
            insertTimestamp: t.insertTimestamp,
            effectiveTimestamp: t.effectiveTimestamp.getTime() !== prev.effectiveTimestamp.getTime()
                ? t.effectiveTimestamp : undefined,
            category: t.category !== prev.category ? t.category : undefined,
            value: Math.abs(t.value) !== Math.abs(prev.value) ? t.value : undefined,
            value7: Math.abs(t.value7) !== Math.abs(prev.value7) ? t.value7 : undefined,
            value19: Math.abs(t.value19) !== Math.abs(prev.value19) ? t.value19 : undefined,
            vat7: Math.abs(t.vat7) !== Math.abs(prev.vat7) ? t.vat7 : undefined,
            vat19: Math.abs(t.vat19) !== Math.abs(prev.vat19) ? t.vat19 : undefined,
            note: t.note !== prev.note ? t.note : undefined,
            isDeposit: isDeposit !== prevIsDeposit ? isDeposit : undefined,
        });

        prev = t;
        prevIsDeposit = isDeposit;
    }

    return result;
}

export async function getTransactions(organizationId: string, effectiveFrom: Date, effectiveTo: Date, start: number, count: number, reverse: boolean, category: number | undefined, notes: string | undefined, previewCount: number): Promise<PaginatedTransactions> {
    let result: PaginatedTransactions = {
        total: 0,
        start: start,
        count: 0,
        data: []
    };

    await bookPendingRecurringTransactions(organizationId, previewCount);

    let categories: number[];
    if (category) {
        categories = [category];
    } else {
        categories = (await getCategories(organizationId)).map(c => c.id);
    }

    const categoriesLookup = await getCategoriesLookup(organizationId);

    const conn = await getConnection();
    const [res] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(*) AS count FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND active = true' +
        ' AND effective_timestamp >= ?' +
        ' AND effective_timestamp < ?' +
        ' AND category_id IN (?)' +
        (notes ? ' AND note LIKE ?' : ''),
        [organizationId, effectiveFrom, effectiveTo, categories, notes ? `%${notes}%` : undefined]
    );
    result.total = res[0]?.count ?? -1;

    const sortDirection = reverse ? 'ASC' : 'DESC';
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
        '       category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND active = true' +
        ' AND effective_timestamp >= ?' +
        ' AND effective_timestamp < ?' +
        ' AND category_id IN (?)' +
        (notes ? ' AND note LIKE ?' : '') +
        ' ORDER BY effective_timestamp ' + sortDirection + ', id ' + sortDirection +
        ' LIMIT ?,?',
        notes ?
            [organizationId, effectiveFrom, effectiveTo, categories, `%${notes}%`, start, count] :
            [organizationId, effectiveFrom, effectiveTo, categories, start, count]
    );
    conn.release();

    const now = new Date();
    for (let row of rows) {
        result.data.push({
            id: row.uuid,
            rowIdx: reverse ? (start + 1 + result.count) : (result.total - result.count - start),
            refId: row.ref_uuid,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: row.effective_timestamp > now,
            effectiveTimestamp: row.effective_timestamp,
            value: row.value,
            value7: row.value7 ?? 0,
            value19: row.value19 ?? 0,
            vat7: row.vat7 ?? 0,
            vat19: row.vat19 ?? 0,
            note: row.note,
        });
        result.count += 1;
    }

    return result;
}

export async function countTransactionsByCategory(organizationId: string, categoryId: number): Promise<number> {
    const conn = await getConnection();
    const [result] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(id) AS count FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND category_id = ?',
        [organizationId, categoryId]
    );
    conn.release();

    return result[0]?.count ?? 0;
}

export async function getAllTransactions(organizationId: string): Promise<Transaction[]> {
    let transactions: Transaction[] = [];
    const categoriesLookup = await getCategoriesLookup(organizationId);

    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
        '       category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)',
        [organizationId]
    );
    conn.release();

    // TODO: We need to carry 'active' flag etc :D (MAYBE we should actually full on dump the model)
    let count = 1;
    for (const row of rows) {
        transactions.push({
            id: row.uuid,
            rowIdx: count,
            refId: row.ref_uuid,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: undefined,
            effectiveTimestamp: row.effective_timestamp,
            value: row.value,
            value7: row.value7 ?? 0,
            value19: row.value19 ?? 0,
            vat7: row.vat7 ?? 0,
            vat19: row.vat19 ?? 0,
            note: row.note,
        });

        count += 1;
    }

    return transactions;
}

export async function insertTransaction(conn: PoolConnection, organizationId: string, t: Transaction) {
    const categoriesReverseLookup = await getCategoriesReverseLookup(organizationId);
    if (!(t.category in categoriesReverseLookup)) {
        throw new ServerError(400, `invalid category: '${t.category}'`);
    }
    const categoryId = categoriesReverseLookup[t.category];

    if (t.value === 0) {
        throw new ServerError(400, 'invalid amount for transaction: 0');
    }

    const [res] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.transactions' +
        ' (organization_uuid, effective_timestamp, ref_uuid, category_id, value, value19, value7, vat19, vat7, note)' +
        ' VALUES (UUID_TO_BIN(?),?,UUID_TO_BIN(?),?,?,?,?,?,?,?)',
        [
            organizationId,
            t.effectiveTimestamp.toISOString().slice(0, 19).replace('T', ' '),
            t.refId,
            categoryId,
            t.value,
            t.value19 !== 0 ? t.value19 : null,
            t.value7 !== 0 ? t.value7 : null,
            t.vat19 !== 0 ? t.vat19 : null,
            t.vat7 !== 0 ? t.vat7 : null,
            t.note,
        ]
    );

    const [update] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.balance' +
        ' SET dirty = true' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND dirty = false' +
        ' AND effective_from <= ?' +
        ' AND effective_to > ?',
        [organizationId, t.effectiveTimestamp, t.effectiveTimestamp]
    );

    if (update.affectedRows < 1) {
        console.warn('Could not mark balance as dirty');
    }

    return res.insertId;
}

async function updatePreviousVersions(conn: PoolConnection, oldId: string, newId: string) {
    const [updateLastVersion] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.transactions SET active=false, current_version_uuid=UUID_TO_BIN(?) WHERE uuid=UUID_TO_BIN(?)',
        [newId, oldId]
    );
    if (updateLastVersion.affectedRows !== 1) {
        throw new Error('UpdateTransaction: Could not set transaction active=false');
    }

    const [_updatePreviousVersions] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.transactions' +
        ' SET current_version_uuid=UUID_TO_BIN(?)' +
        ' WHERE current_version_uuid=UUID_TO_BIN(?)',
        [newId, oldId]
    );
}

export async function updateTransaction(organizationId: string, t: Transaction): Promise<{ id: string }> {
    let oldId = t.id;
    let oldTransaction = await getTransaction(organizationId, oldId);

    if (transactionsDataEqual(t, oldTransaction)) {
        throw new Error('Transactions identical');
    }

    let newId: string = '';
    const conn = await getConnection();
    try {
        await conn.query('START TRANSACTION');

        t.refId = oldId;
        const id = await insertTransaction(conn, organizationId, t);
        let newTransaction = await getTransactionByDatabaseId(conn, organizationId, id);
        newId = newTransaction.id;

        await updatePreviousVersions(conn, oldId, newId);

        // Ultimately this should be an event -- "transactions has updated";
        // which recurring transactions subscribe to.
        await updateTransactionLink(conn, oldId, newId);

        await conn.query('COMMIT');
    } catch (err) {
        console.log(err);
        await conn.query('ROLLBACK');
    } finally {
        conn.release();
    }

    return {id: newId};
}
