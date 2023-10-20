import {getConnection} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {Currencies, Money} from "ts-money";
import {ResultSetHeader} from "mysql2";
import {BalanceModel} from "../models/balance-model";
import {getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";


export interface Transaction {
    id: number;
    refId: number | undefined;
    category: string;
    insertTimestamp: Date;
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
}

async function recalculateBalance(startingFrom: Date = new Date(1970, 1, 1), endingAt: Date = new Date()): Promise<BalanceModel> {
    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` >= ?' +
        ' AND `effective_timestamp` < ?' +
        ' ORDER BY `effective_timestamp` ASC, `id` ASC',
        [startingFrom, endingAt]
    );

    let total = new Money(0, Currencies['EUR']!);
    let totalVat19 = new Money(0, Currencies['EUR']!);
    let totalVat7 = new Money(0, Currencies['EUR']!);
    for (let row of rows) {
        const value = new Money(row.value, Currencies['EUR']!);
        const vat19 = new Money(row.vat19 ?? 0, Currencies['EUR']!)
        const vat7 = new Money(row.vat7 ?? 0, Currencies['EUR']!);

        total = total.add(value);
        totalVat19 = totalVat19.add(vat19);
        totalVat7 = totalVat7.add(vat7);
    }

    const [res] = await conn.execute<ResultSetHeader>(
        'INSERT INTO `balance`' +
        ' (effective_from, effective_to, value, vat19, vat7)' +
        ' VALUES (?,?,?,?,?)',
        [startingFrom, endingAt, total.amount, totalVat19.amount, totalVat7.amount]
    );
    conn.release();

    if (res.affectedRows < 1) {
        throw new Error('Could not write balance');
    }

    return {
        constructor: {name: "RowDataPacket"},
        id: res.insertId,
        insert_timestamp: new Date(),
        effective_from: startingFrom,
        effective_to: endingAt,
        value: total.amount,
        vat19: totalVat19.amount,
        vat7: totalVat7.amount,
        dirty: false
    };
}

export async function getBalance(effectiveFrom: Date, effectiveTo: Date): Promise<Balance> {
    const conn = await getConnection();
    let [rows] = await conn.query<BalanceModel[]>(
        'SELECT * FROM `balance`' +
        ' WHERE dirty = false' +
        ' AND effective_from = ?' +
        ' AND effective_to = ?' +
        ' ORDER BY `id` DESC' +
        ' LIMIT 1',
        [effectiveFrom, effectiveTo]
    );
    conn.release();

    if (rows.length < 1) {
        rows = [await recalculateBalance(effectiveFrom, effectiveTo)];
    }

    let total = new Money(rows[0]?.value ?? 0, Currencies['EUR']!);
    let vat19 = new Money(rows[0]?.vat19 ?? 0, Currencies['EUR']!);
    let vat7 = new Money(rows[0]?.vat7 ?? 0, Currencies['EUR']!);
    let vatTotal = vat19.add(vat7);

    return {
        total,
        vat: {
            total: vatTotal,
            vat19,
            vat7,
        }
    };
}

export async function getTransaction(id: number): Promise<Transaction> {
    const categoriesLookup = await getCategoriesLookup();

    const conn = await getConnection();
    const [result] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions` WHERE `id` = ?', [id]
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
        category: categoriesLookup[t.category_id] ?? '[ERROR]',
        insertTimestamp: t.insert_timestamp,
        effectiveTimestamp: t.effective_timestamp,
        value: new Money(t.value, Currencies['EUR']!),
        value7: new Money(t.value7 ?? 0, Currencies['EUR']!),
        value19: new Money(t.value19 ?? 0, Currencies['EUR']!),
        vat7: new Money(t.vat7 ?? 0, Currencies['EUR']!),
        vat19: new Money(t.vat19 ?? 0, Currencies['EUR']!),
    };
}

export async function getTransactions(effectiveFrom: Date, effectiveTo: Date, start: number, count: number): Promise<PaginatedTransactions> {
    let result: PaginatedTransactions = {
        total: 0,
        start: start,
        count: 0,
        data: []
    };

    const categoriesLookup = await getCategoriesLookup();

    const conn = await getConnection();
    const [res] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(*) AS count FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` >= ?' +
        ' AND `effective_timestamp` < ?',
        [effectiveFrom, effectiveTo]
    );
    result.total = res[0]?.count ?? -1;


    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` >= ?' +
        ' AND `effective_timestamp` < ?' +
        ' ORDER BY `effective_timestamp` DESC, `id` DESC' +
        ' LIMIT ?,?',
        [effectiveFrom, effectiveTo, start, count]
    );
    conn.release();

    for (let row of rows) {
        result.data.push({
            id: row.id,
            refId: row.ref_id,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
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

export async function insertTransaction(t: Transaction) {
    const categoriesReverseLookup = await getCategoriesReverseLookup();
    if (!(t.category in categoriesReverseLookup)) {
        throw new Error(`Invalid category ${t.category}`);
    }
    const categoryId = categoriesReverseLookup[t.category];

    const conn = await getConnection();
    const [res] = await conn.query<ResultSetHeader>(
        'INSERT INTO `transactions`' +
        ' (effective_timestamp, ref_id, category_id, value, value19, value7, vat19, vat7)' +
        ' VALUES (?,?,?,?,?,?,?,?)',
        [
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
        'UPDATE `balance`' +
        ' SET `dirty` = true' +
        ' WHERE `dirty` = false' +
        ' AND `effective_from` <= ?' +
        ' AND `effective_to` > ?',
        [t.effectiveTimestamp, t.effectiveTimestamp]
    );
    conn.release();

    if (update.affectedRows < 1) {
        throw new Error('Could not mark balance as dirty');
    }

    return {id: res.insertId};
}
