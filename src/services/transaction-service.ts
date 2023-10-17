import {getConnection} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {Currencies, Money} from "ts-money";
import {ResultSetHeader} from "mysql2";
import {BalanceModel} from "../models/balance-model";


export interface Transaction {
    id: number;
    refId: number | undefined;
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

async function recalculateBalance(startingFrom: Date = new Date(1970, 1, 1), endingAt: Date = new Date()): Promise<Money> {
    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= ?' +
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

    if (res.affectedRows < 1) {
        throw new Error('Could not write balance');
    }

    conn.release();

    return total;
}

export async function getCurrentBalance(): Promise<Balance> {
    await recalculateBalance();

    const conn = await getConnection();
    const [rows] = await conn.query<BalanceModel[]>(
        'SELECT * FROM `balance`' +
        ' ORDER BY `id` DESC' +
        ' LIMIT 1'
    );

    if (rows.length < 1) {
        throw Error('No balance found');
    }

    let total = new Money(rows[0]?.value ?? 0, Currencies['EUR']!);
    let vat19 = new Money(rows[0]?.vat19 ?? 0, Currencies['EUR']!);
    let vat7 = new Money(rows[0]?.vat7 ?? 0, Currencies['EUR']!);
    let vatTotal = vat19.add(vat7);

    conn.release();

    return {
        total,
        vat: {
            total: vatTotal,
            vat19,
            vat7,
        }
    };
}

export async function getTransactions(startingFrom: Date, start: number, count: number): Promise<PaginatedTransactions> {
    let result: PaginatedTransactions = {
        total: 0,
        start: start,
        count: 0,
        data: []
    };

    const conn = await getConnection();
    const [res] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(*) AS count FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= NOW()',
        [startingFrom]
    );
    result.total = res[0]?.count ?? -1;


    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= NOW()' +
        ' ORDER BY `effective_timestamp` DESC, `id` DESC' +
        ' LIMIT ?,?',
        [startingFrom, start, count]
    );

    for (let row of rows) {
        result.data.push({
            id: row.id,
            refId: row.ref_id,
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

    conn.release();

    return result;
}

export async function insertTransaction(t: Transaction) {
    const conn = await getConnection();
    const [res] = await conn.query<ResultSetHeader>(
        'INSERT INTO `transactions`' +
        ' (effective_timestamp, ref_id, value, value19, value7, vat19, vat7)' +
        ' VALUES (?,?,?,?,?,?,?)',
        [
            t.effectiveTimestamp.toISOString().slice(0, 19).replace('T', ' '),
            t.refId,
            t.value.amount,
            t.value19.amount,
            t.value7.amount,
            t.vat19.amount,
            t.vat7.amount,
        ]
    );

    return {id: res.insertId};
}
