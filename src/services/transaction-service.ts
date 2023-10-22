import {getConnection} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {Currencies, Money} from "ts-money";
import {ResultSetHeader} from "mysql2";
import {BalanceModel} from "../models/balance-model";
import {getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";


export interface Transaction {
    id: string;
    rowIdx: number;
    refId: number | undefined;
    category: string;
    insertTimestamp: Date;
    pending: boolean | undefined;
    effectiveTimestamp: Date;
    value: Money;
    value7: Money;
    value19: Money;
    vat7: Money;
    vat19: Money;
}

export interface PaginatedTransactions {
    total: number;
    start: number;
    count: number;
    data: Transaction[];
}

export interface Balance {
    total: Money;
    vat: {
        total: Money;
        vat19: Money;
        vat7: Money;
    }
    pending: {
        total: Money;
        vat: {
            total: Money;
            vat19: Money;
            vat7: Money;
        }
    }
}

async function recalculateBalance(organizationId: string, startingFrom: Date = new Date(1970, 1, 1), endingAt: Date = new Date()): Promise<BalanceModel> {
    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(id) AS id, BIN_TO_UUID(organization_id) AS organization_id,' +
        '       insert_timestamp, effective_timestamp, active, ref_id,' +
        '       category_id, value, value19, value7, vat19, vat7' +
        ' FROM cantropee.transactions' +
        ' WHERE organization_id = UUID_TO_BIN(?)' +
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

    let total = new Money(0, Currencies['EUR']!);
    let totalVat19 = new Money(0, Currencies['EUR']!);
    let totalVat7 = new Money(0, Currencies['EUR']!);

    let pending = new Money(0, Currencies['EUR']!);
    let pendingVat19 = new Money(0, Currencies['EUR']!);
    let pendingVat7 = new Money(0, Currencies['EUR']!);
    for (let row of rows) {
        const value = new Money(row.value, Currencies['EUR']!);
        const vat19 = new Money(row.vat19 ?? 0, Currencies['EUR']!)
        const vat7 = new Money(row.vat7 ?? 0, Currencies['EUR']!);

        if (row.effective_timestamp < now) {
            total = total.add(value);
            totalVat19 = totalVat19.add(vat19);
            totalVat7 = totalVat7.add(vat7);
        } else {
            if (earliestPendingTransaction === undefined) {
                earliestPendingTransaction = new Date(row.effective_timestamp);
            }

            pending = pending.add(value);
            pendingVat19 = pendingVat19.add(vat19);
            pendingVat7 = pendingVat7.add(vat7);
        }
    }

    validUntil = earliestPendingTransaction ?? validUntil;
    const [res] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cantropee.balance' +
        ' (organization_id, effective_from, effective_to, valid_until, value, vat19, vat7, pending_value, pending_vat19, pending_vat7)' +
        ' VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,?,?)',
        [
            organizationId,
            startingFrom,
            endingAt,
            validUntil,
            total.amount,
            totalVat19.amount,
            totalVat7.amount,
            pending.amount,
            pendingVat19.amount,
            pendingVat7.amount,
        ]
    );
    conn.release();

    if (res.affectedRows < 1) {
        throw new Error('Could not write balance');
    }

    return {
        constructor: {name: "RowDataPacket"},
        id: res.insertId,
        organization_id: organizationId,
        insert_timestamp: new Date(),
        effective_from: startingFrom,
        effective_to: endingAt,
        value: total.amount,
        vat19: totalVat19.amount,
        vat7: totalVat7.amount,
        pending_value: pending.amount,
        pending_vat19: pendingVat19.amount,
        pending_vat7: pendingVat7.amount,
        valid_until: validUntil,
        dirty: false
    };
}

export async function getBalance(organizationId: string, effectiveFrom: Date, effectiveTo: Date): Promise<Balance> {
    const conn = await getConnection();
    let [rows] = await conn.query<BalanceModel[]>(
        'SELECT id, BIN_TO_UUID(organization_id) AS organization_id, insert_timestamp,' +
        '       effective_from, effective_to, value, vat19, vat7, pending_value,' +
        '       pending_vat19, pending_vat7, valid_until, dirty' +
        ' FROM cantropee.balance' +
        ' WHERE organization_id = UUID_TO_BIN(?)' +
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

    let total = new Money(rows[0]?.value ?? 0, Currencies['EUR']!);
    let vat19 = new Money(rows[0]?.vat19 ?? 0, Currencies['EUR']!);
    let vat7 = new Money(rows[0]?.vat7 ?? 0, Currencies['EUR']!);
    let vatTotal = vat19.add(vat7);

    let pendingTotal = new Money(rows[0]?.pending_value ?? 0, Currencies['EUR']!);
    let pendingVat19 = new Money(rows[0]?.pending_vat19 ?? 0, Currencies['EUR']!);
    let pendingVat7 = new Money(rows[0]?.pending_vat7 ?? 0, Currencies['EUR']!);
    let pendingVatTotal = pendingVat19.add(pendingVat7);

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
        'SELECT BIN_TO_UUID(id) AS id, BIN_TO_UUID(organization_id) AS organization_id, insert_timestamp,' +
        '       effective_timestamp, active, ref_id, category_id, value, value19, value7,' +
        '       vat19, vat7' +
        ' FROM cantropee.transactions' +
        ' WHERE id = ?',
        [id]
    );
    conn.release();

    if (result.length < 1 || result[0] === undefined) {
        throw new Error('Transaction not found');
    }

    // TODO: Check ref_id and follow that chain (when param """recursive""" = true)

    let t = result[0];
    return {
        id: t.id,
        refId: t.ref_id,
        rowIdx: 1,
        category: categoriesLookup[t.category_id] ?? '[ERROR]',
        insertTimestamp: t.insert_timestamp,
        pending: t.effective_timestamp > new Date(),
        effectiveTimestamp: t.effective_timestamp,
        value: new Money(t.value, Currencies['EUR']!),
        value7: new Money(t.value7 ?? 0, Currencies['EUR']!),
        value19: new Money(t.value19 ?? 0, Currencies['EUR']!),
        vat7: new Money(t.vat7 ?? 0, Currencies['EUR']!),
        vat19: new Money(t.vat19 ?? 0, Currencies['EUR']!),
    };
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
        ' WHERE organization_id = UUID_TO_BIN(?)' +
        ' AND active = true' +
        ' AND effective_timestamp >= ?' +
        ' AND effective_timestamp < ?',
        [organizationId, effectiveFrom, effectiveTo]
    );
    result.total = res[0]?.count ?? -1;

    const sortDirection = reverse ? 'ASC' : 'DESC';
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT BIN_TO_UUID(id) AS id, BIN_TO_UUID(organization_id) AS organization_id,' +
        '       insert_timestamp, effective_timestamp, active, ref_id, category_id, value,' +
        '       value19, value7, vat19, vat7' +
        ' FROM cantropee.transactions' +
        ' WHERE organization_id = UUID_TO_BIN(?)' +
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
            id: row.id,
            rowIdx: reverse ? (start + 1 + result.count) : (result.total - result.count),
            refId: row.ref_id,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: row.effective_timestamp > now,
            effectiveTimestamp: row.effective_timestamp,
            value: new Money(row.value, Currencies['EUR']!),
            value7: new Money(row.value7 ?? 0, Currencies['EUR']!),
            value19: new Money(row.value19 ?? 0, Currencies['EUR']!),
            vat7: new Money(row.vat7 ?? 0, Currencies['EUR']!),
            vat19: new Money(row.vat19 ?? 0, Currencies['EUR']!),
        });
        result.count += 1;
    }

    return result;
}

export async function insertTransaction(organizationId: string, t: Transaction) {
    const categoriesReverseLookup = await getCategoriesReverseLookup(organizationId);
    if (!(t.category in categoriesReverseLookup)) {
        throw new Error(`Invalid category '${t.category}'`);
    }
    const categoryId = categoriesReverseLookup[t.category];

    if (t.value.amount === 0) {
        throw new Error('Invalid amount for transaction: 0');
    }

    const conn = await getConnection();
    const [res] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.transactions' +
        ' (organization_id, effective_timestamp, ref_id, category_id, value, value19, value7, vat19, vat7)' +
        ' VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,?)',
        [
            organizationId,
            t.effectiveTimestamp.toISOString().slice(0, 19).replace('T', ' '),
            t.refId,
            categoryId,
            t.value.amount,
            t.value19.amount,
            t.value7.amount,
            t.vat19.amount,
            t.vat7.amount,
        ]
    );

    const [update] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.balance' +
        ' SET dirty = true' +
        ' WHERE organization_id = UUID_TO_BIN(?)' +
        ' AND dirty = false' +
        ' AND effective_from <= ?' +
        ' AND effective_to > ?',
        [organizationId, t.effectiveTimestamp, t.effectiveTimestamp]
    );
    conn.release();

    if (update.affectedRows < 1) {
        throw new Error('Could not mark balance as dirty');
    }

    return {id: res.insertId};
}
