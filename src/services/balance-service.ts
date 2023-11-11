import {BalanceModel} from "../models/balance-model";
import {getConnection} from "../core/database";
import {TransactionModel} from "../models/transaction-model";
import {ResultSetHeader} from "mysql2";
import {PoolConnection} from "mysql2/promise";
import {ServerError} from "../core/server-error";


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
    effectiveFrom: Date,
    effectiveTo: Date,
    validUntil: Date,
}

const modelToBalance = (model: BalanceModel): Balance => {
    return {
        effectiveFrom: model.effective_from,
        effectiveTo: model.effective_to,
        validUntil: model.valid_until,
        total: model.value,
        vat: {
            total: model.vat19 + model.vat7,
            vat19: model.vat19,
            vat7: model.vat7,
        },
        pending: {
            total: model.pending_value,
            vat: {
                total: model.pending_vat19 + model.pending_vat7,
                vat19: model.pending_vat19,
                vat7: model.pending_vat7,
            }
        },
    };
};

async function calculateBalance(organizationId: string, startingFrom: Date = new Date(1970, 1, 1), endingAt: Date = new Date(), categoryId: number | undefined, note: string | undefined): Promise<Balance> {
    let rows: TransactionModel[] = [];

    const conn = await getConnection();
    if (categoryId && note) {
        [rows] = await conn.execute<TransactionModel[]>(
            'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
            '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
            '       category_id, value, value19, value7, vat19, vat7, note' +
            ' FROM cantropee.transactions' +
            ' WHERE organization_uuid = UUID_TO_BIN(?)' +
            ' AND active = true' +
            ' AND effective_timestamp >= ?' +
            ' AND effective_timestamp < ?' +
            ' AND category_id IN (?)' +
            ' AND note LIKE ?' +
            ' ORDER BY effective_timestamp ASC',
            [organizationId, startingFrom, endingAt, categoryId, `%${note}%`]
        );
    } else if (categoryId) {
        [rows] = await conn.execute<TransactionModel[]>(
            'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
            '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
            '       category_id, value, value19, value7, vat19, vat7, note' +
            ' FROM cantropee.transactions' +
            ' WHERE organization_uuid = UUID_TO_BIN(?)' +
            ' AND active = true' +
            ' AND effective_timestamp >= ?' +
            ' AND effective_timestamp < ?' +
            ' AND category_id IN (?)' +
            ' ORDER BY effective_timestamp ASC',
            [organizationId, startingFrom, endingAt, categoryId]
        );
    } else if (note) {
        [rows] = await conn.execute<TransactionModel[]>(
            'SELECT BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
            '       insert_timestamp, effective_timestamp, active, BIN_TO_UUID(ref_uuid) AS ref_uuid,' +
            '       category_id, value, value19, value7, vat19, vat7, note' +
            ' FROM cantropee.transactions' +
            ' WHERE organization_uuid = UUID_TO_BIN(?)' +
            ' AND active = true' +
            ' AND effective_timestamp >= ?' +
            ' AND effective_timestamp < ?' +
            ' AND note LIKE ?' +
            ' ORDER BY effective_timestamp ASC',
            [organizationId, startingFrom, endingAt, `%${note}%`]
        );
    } else {
        [rows] = await conn.execute<TransactionModel[]>(
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
    }
    conn.release();

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

    return {
        effectiveFrom: startingFrom,
        effectiveTo: endingAt,
        validUntil: validUntil,
        total: total,
        vat: {
            total: totalVat19 + totalVat7,
            vat19: totalVat19,
            vat7: totalVat7,
        },
        pending: {
            total: pending,
            vat: {
                total: pendingVat19 + pendingVat7,
                vat19: pendingVat19,
                vat7: pendingVat7,
            }
        },
    };
}

async function insertBalance(organizationId: string, balance: Balance): Promise<number> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.balance' +
        ' (organization_uuid, effective_from, effective_to, valid_until, value, vat19, vat7, pending_value, pending_vat19, pending_vat7)' +
        ' VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,?,?)',
        [
            organizationId,
            balance.effectiveFrom,
            balance.effectiveTo,
            balance.validUntil,
            balance.total,
            balance.vat.vat19,
            balance.vat.vat7,
            balance.pending.total,
            balance.pending.vat.vat19,
            balance.pending.vat.vat7,
        ]
    );
    conn.release();

    if (result.insertId === 0) {
        throw new ServerError(500, 'Could not write balance');
    }
    return result.insertId;
}

export async function getBalance(organizationId: string, effectiveFrom: Date, effectiveTo: Date, categoryId: number | undefined, note: string | undefined): Promise<Balance> {
    let model: BalanceModel | undefined = undefined;

    // We do not cache filtered balances
    if (!categoryId && !note) {
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

        model = rows[0];
    }

    let balance: Balance;
    if (model !== undefined) {
        balance = modelToBalance(model);
    } else {
        balance = await calculateBalance(organizationId, effectiveFrom, effectiveTo, categoryId, note);

        // We do not cache filtered balances
        if (!categoryId && !note) {
            await insertBalance(organizationId, balance);
        }
    }

    return balance;
}

export async function invalidateAllBalances(conn: PoolConnection, organizationId: string): Promise<boolean> {
    const [result] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.balance SET dirty=true WHERE organization_uuid = UUID_TO_BIN(?)',
        [organizationId]
    );

    return result.warningStatus === 0;
}