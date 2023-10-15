import {getConnection} from "../core/database";
import {CountAllResult, TransactionModel} from "../models/transaction-model";
import {Currencies, Money} from "ts-money";


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
    limit: number;
    offset: number;
    data: Transaction[];
}

export interface CurrentTotal {
    total: Money;
    history: Transaction[];
}

export async function getCurrentBalance(startingFrom: Date = new Date(1970, 1, 1)): Promise<CurrentTotal> {
    let transactions: Transaction[] = [];

    const conn = await getConnection();
    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= NOW()' +
        ' ORDER BY `effective_timestamp`, `id` ASC',
        [startingFrom]
    );

    let total = new Money(0, Currencies['EUR']!);
    for (let row of rows) {
        const value = new Money(row.value, Currencies['EUR']!);

        transactions.push({
            id: row.id,
            refId: row.ref_id,
            insertTimestamp: row.insert_timestamp,
            effectiveTimestamp: row.effective_timestamp,
            value,
            value7: new Money(row.value7 ?? 0, Currencies['EUR']!),
            value19: new Money(row.value19 ?? 0, Currencies['EUR']!),
            vat7: new Money(row.vat7 ?? 0, Currencies['EUR']!),
            vat19: new Money(row.vat19 ?? 0, Currencies['EUR']!),
        });
        total = total.add(value);
    }

    conn.release();

    return {
        total: total,
        history: transactions.reverse(),
    };
}

export async function getTransactions(startingFrom: Date, limit: number, offset: number): Promise<PaginatedTransactions> {
    let result: PaginatedTransactions = {
        total: 0,
        limit: limit,
        offset: offset,
        data: []
    };

    const conn = await getConnection();
    const [count] = await conn.query<CountAllResult[]>(
        'SELECT COUNT(*) AS count FROM `transaction`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= NOW()',
        [startingFrom]
    );
    result.total = count[0]?.count ?? -1;


    const [rows] = await conn.query<TransactionModel[]>(
        'SELECT * FROM `transactions`' +
        ' WHERE `active` = true' +
        ' AND `effective_timestamp` > ?' +
        ' AND `effective_timestamp` <= NOW()' +
        ' ORDER BY `effective_timestamp`, `id` DESC' +
        ' LIMIT ? OFFSET ?',
        [startingFrom, limit, offset]
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
    }

    conn.release();

    return result;
}
