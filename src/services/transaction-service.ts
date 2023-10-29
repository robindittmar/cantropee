import {getConnection, ResultUUID} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {ResultSetHeader} from "mysql2";
import {BalanceModel} from "../models/balance-model";
import {getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";
import {PoolConnection} from "mysql2/promise";


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

// interface TransactionDiff {
//     insertTimestamp: Date;
//     category: string | undefined;
//     effectiveTimestamp: Date | undefined;
//     value: number | undefined;
//     value7: number | undefined;
//     value19: number | undefined;
//     vat7: number | undefined;
//     vat19: number | undefined;
//     note: string | undefined;
// }

export interface PaginatedTransactions {
    total: number;
    start: number;
    count: number;
    data: Transaction[];
}

export interface Balance {
    total: number;
    vat: {
        total: number;
        vat19: number;
        vat7: number;
    }
    pending: {
        total: number;
        vat: {
            total: number;
            vat19: number;
            vat7: number;
        }
    }
}

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

async function recalculateBalance(organizationId: string, startingFrom: Date = new Date(1970, 1, 1), endingAt: Date = new Date()): Promise<BalanceModel> {
    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
        '       category_id, value, value19, value7, vat19, vat7, note' +
        ' FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND active = true' +
        ' AND effective_timestamp >= ?' +
        ' AND effective_timestamp < ?' +
        ' ORDER BY effective_timestamp ASC',
        [organizationId, startingFrom, endingAt]
    );

    const now = new Date();
    let validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    let earliestPendingTransaction: Date | undefined = undefined;

    let total = 0;
    let totalVat19 = 0;
    let totalVat7 = 0;

    let pending = 0;
    let pendingVat19 = 0;
    let pendingVat7 = 0;
    for (let row of rows) {
        const value = row.value;
        const vat19 = row.vat19 ?? 0;
        const vat7 = row.vat7 ?? 0;

        if (row.effective_timestamp < now) {
            total = total + value;
            totalVat19 = totalVat19 + vat19;
            totalVat7 = totalVat7 + vat7;
        } else {
            if (earliestPendingTransaction === undefined) {
                earliestPendingTransaction = new Date(row.effective_timestamp);
            }

            pending = pending + value;
            pendingVat19 = pendingVat19 + vat19;
            pendingVat7 = pendingVat7 + vat7;
        }
    }

    validUntil = earliestPendingTransaction ?? validUntil;
    const [res] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cantropee.balance' +
        ' (organization_uuid, effective_from, effective_to, valid_until, value, vat19, vat7, pending_value, pending_vat19, pending_vat7)' +
        ' VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,?,?)',
        [
            organizationId,
            startingFrom,
            endingAt,
            validUntil,
            total,
            totalVat19,
            totalVat7,
            pending,
            pendingVat19,
            pendingVat7,
        ]
    );
    conn.release();

    if (res.affectedRows < 1) {
        throw new Error('Could not write balance');
    }

    return {
        constructor: {name: "RowDataPacket"},
        id: res.insertId,
        organization_uuid: organizationId,
        insert_timestamp: new Date(),
        effective_from: startingFrom,
        effective_to: endingAt,
        value: total,
        vat19: totalVat19,
        vat7: totalVat7,
        pending_value: pending,
        pending_vat19: pendingVat19,
        pending_vat7: pendingVat7,
        valid_until: validUntil,
        dirty: 0
    };
}

export async function getBalance(organizationId: string, effectiveFrom: Date, effectiveTo: Date): Promise<Balance> {
    const conn = await getConnection();
    let [rows] = await conn.query<BalanceModel[]>(
        'SELECT id, BIN_TO_UUID(organization_uuid) AS organization_uuid, insert_timestamp,' +
        '       effective_from, effective_to, value, vat19, vat7, pending_value,' +
        '       pending_vat19, pending_vat7, valid_until, dirty' +
        ' FROM cantropee.balance' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND dirty = false' +
        ' AND valid_until > NOW()' +
        ' AND effective_from = ?' +
        ' AND effective_to = ?' +
        ' ORDER BY id DESC' +
        ' LIMIT 1',
        [organizationId, effectiveFrom, effectiveTo]
    );
    conn.release();

    if (rows.length < 1) {
        rows = [await recalculateBalance(organizationId, effectiveFrom, effectiveTo)];
    }

    let total = rows[0]?.value ?? 0;
    let vat19 = rows[0]?.vat19 ?? 0;
    let vat7 = rows[0]?.vat7 ?? 0;
    let vatTotal = vat19 + vat7;

    let pendingTotal = rows[0]?.pending_value ?? 0;
    let pendingVat19 = rows[0]?.pending_vat19 ?? 0;
    let pendingVat7 = rows[0]?.pending_vat7 ?? 0;
    let pendingVatTotal = pendingVat19 + pendingVat7;

    return {
        total: total,
        vat: {
            total: vatTotal,
            vat19: vat19,
            vat7: vat7,
        },
        pending: {
            total: pendingTotal,
            vat: {
                total: pendingVatTotal,
                vat19: pendingVat19,
                vat7: pendingVat7,
            }
        },
    };
}

export async function getTransaction(organizationId: string, id: string): Promise<Transaction> {
    const categoriesLookup = await getCategoriesLookup(organizationId);

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
        throw new Error('Transaction not found');
    }

    // TODO: Check ref_id and follow that chain (when param """recursive""" = true)

    let t = result[0];
    return {
        id: t.uuid,
        refId: t.ref_uuid,
        rowIdx: 1,
        category: categoriesLookup[t.category_id] ?? '[ERROR]',
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
        ' ORDER BY insert_timestamp DESC',
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

export async function getTransactions(organizationId: string, effectiveFrom: Date, effectiveTo: Date, start: number, count: number, reverse: boolean): Promise<PaginatedTransactions> {
    let result: PaginatedTransactions = {
        total: 0,
        start: start,
        count: 0,
        data: []
    };

    const categoriesLookup = await getCategoriesLookup(organizationId);

    const conn = await getConnection();
    const [res] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(*) AS count FROM cantropee.transactions' +
        ' WHERE organization_uuid = UUID_TO_BIN(?)' +
        ' AND active = true' +
        ' AND effective_timestamp >= ?' +
        ' AND effective_timestamp < ?',
        [organizationId, effectiveFrom, effectiveTo]
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
        ' ORDER BY effective_timestamp ' + sortDirection +
        ' LIMIT ?,?',
        [organizationId, effectiveFrom, effectiveTo, start, count]
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
        throw new Error(`Invalid category '${t.category}'`);
    }
    const categoryId = categoriesReverseLookup[t.category];

    if (t.value === 0) {
        throw new Error('Invalid amount for transaction: 0');
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
            t.value19,
            t.value7,
            t.vat19,
            t.vat7,
            t.note
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
        throw new Error('Could not mark balance as dirty');
    }

    return res.insertId;
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
        await insertTransaction(conn, organizationId, t);
        const [getNew] = await conn.query<ResultUUID[]>(
            'SELECT BIN_TO_UUID(uuid) AS uuid FROM cantropee.transactions WHERE ref_uuid=UUID_TO_BIN(?) LIMIT 1',
            [oldId]
        );
        let idResult = getNew[0];
        if (!idResult) {
            await conn.query('ROLLBACK');
            throw new Error('UpdateTransaction: Could not get ID for new transaction');
        }
        newId = idResult.uuid;

        const [updateLastVersion] = await conn.query<ResultSetHeader>(
            'UPDATE cantropee.transactions SET active=false, current_version_uuid=UUID_TO_BIN(?) WHERE uuid=UUID_TO_BIN(?)',
            [newId, oldId]
        );
        if (updateLastVersion.affectedRows !== 1) {
            await conn.query('ROLLBACK');
            throw new Error('UpdateTransaction: Could not set transaction active=false');
        }

        const [_updatePreviousVerions] = await conn.query<ResultSetHeader>(
            'UPDATE cantropee.transactions' +
            ' SET current_version_uuid=UUID_TO_BIN(?)' +
            ' WHERE current_version_uuid=UUID_TO_BIN(?)',
            [newId, oldId]
        );

        await conn.query('COMMIT');
    } catch (err) {
        console.log(err);
        await conn.query('ROLLBACK');
    } finally {
        conn.release();
    }

    return {id: newId};
}
