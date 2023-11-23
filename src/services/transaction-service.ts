import {AppDataSource} from "../core/database";
import {TransactionModel} from "../models/transaction-model";
import {getCategories, getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";
import {bookPendingRecurringTransactions, updateTransactionLink} from "./recurring-transaction-service";
import {ServerError} from "../core/server-error";
import {Between, EntityManager, In, Like} from "typeorm";
import {BalanceModel} from "../models/balance-model";


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
        refId: t.ref_uuid ?? undefined,
        rowIdx: 0,
        category: lookup[t.category_id] ?? '[ERROR]',
        insertTimestamp: t.insert_timestamp,
        pending: t.effective_timestamp > new Date(),
        effectiveTimestamp: t.effective_timestamp,
        value: t.value,
        value7: t.value7 ?? 0,
        value19: t.value19 ?? 0,
        vat7: t.vat7 ?? 0,
        vat19: t.vat19 ?? 0,
        note: t.note ?? undefined,
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

export async function getTransactionByDatabaseId(transaction: EntityManager, organizationId: string, id: number): Promise<Transaction> {
    const result = await transaction.findOne(TransactionModel, {
        where: {
            id: id
        }
    });

    if (!result) {
        throw new ServerError(404, 'Transaction not found');
    }

    return modelToTransaction(result, await getCategoriesLookup(organizationId));
}

export async function getTransaction(organizationId: string, id: string): Promise<Transaction> {
    const result = await AppDataSource.manager.findOne(TransactionModel, {
        where: {
            uuid: id,
            organization_uuid: organizationId,
        }
    });

    if (!result) {
        throw new ServerError(404, 'Transaction not found');
    }

    return modelToTransaction(result, await getCategoriesLookup(organizationId));
}

export async function getTransactionHistory(organizationId: string, transactionId: string): Promise<Transaction[]> {
    let transactions: Transaction[] = [];

    const categoriesLookup = await getCategoriesLookup(organizationId);
    const result = await AppDataSource.manager.find(TransactionModel, {
        where: {
            organization_uuid: organizationId,
            current_version_uuid: transactionId,
        },
        order: {
            insert_timestamp: 'DESC',
            id: 'DESC',
        },
    });

    for (const row of result) {
        transactions.push(modelToTransaction(row, categoriesLookup));
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

    effectiveTo.setUTCSeconds(effectiveTo.getUTCSeconds() - 1);
    const sortDirection = reverse ? 'ASC' : 'DESC';
    let whereCondition: any = {
        organization_uuid: organizationId,
        active: true,
        effective_timestamp: Between(effectiveFrom, effectiveTo),
        category_id: In(categories),
    }
    if (notes) {
        whereCondition = {...whereCondition, note: Like(`%${notes}%`)};
    }

    const [rows, total] = await AppDataSource.manager.findAndCount(TransactionModel, {
        where: whereCondition,
        order: {
            effective_timestamp: sortDirection,
            id: sortDirection,
        },
        skip: start,
        take: count,
    });

    result.total = total;

    const now = new Date();
    for (let row of rows) {
        result.data.push({
            id: row.uuid,
            rowIdx: reverse ? (start + 1 + result.count) : (result.total - result.count - start),
            refId: row.ref_uuid ?? undefined,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: row.effective_timestamp > now,
            effectiveTimestamp: row.effective_timestamp,
            value: row.value,
            value7: row.value7 ?? 0,
            value19: row.value19 ?? 0,
            vat7: row.vat7 ?? 0,
            vat19: row.vat19 ?? 0,
            note: row.note ?? undefined,
        });
        result.count += 1;
    }

    return result;
}

export async function countTransactionsByCategory(organizationId: string, categoryId: number): Promise<number> {
    return AppDataSource.manager.count(TransactionModel, {
        where: {
            organization_uuid: organizationId,
            category_id: categoryId,
        }
    });
}

export async function getAllTransactions(organizationId: string): Promise<Transaction[]> {
    let transactions: Transaction[] = [];
    const categoriesLookup = await getCategoriesLookup(organizationId);

    const rows = await AppDataSource.manager.find(TransactionModel, {
        where: {
            organization_uuid: organizationId
        }
    });

    // TODO: We need to carry 'active' flag etc :D (MAYBE we should actually full on dump the model)
    let count = 1;
    for (const row of rows) {
        transactions.push({
            id: row.uuid,
            rowIdx: count,
            refId: row.ref_uuid ?? undefined,
            category: categoriesLookup[row.category_id] ?? '[ERROR]',
            insertTimestamp: row.insert_timestamp,
            pending: undefined,
            effectiveTimestamp: row.effective_timestamp,
            value: row.value,
            value7: row.value7 ?? 0,
            value19: row.value19 ?? 0,
            vat7: row.vat7 ?? 0,
            vat19: row.vat19 ?? 0,
            note: row.note ?? undefined,
        });

        count += 1;
    }

    return transactions;
}

export async function insertTransaction(transaction: EntityManager, organizationId: string, t: Transaction) {
    const categoriesReverseLookup = await getCategoriesReverseLookup(organizationId);
    if (!(t.category in categoriesReverseLookup)) {
        throw new ServerError(400, `invalid category: '${t.category}'`);
    }
    const categoryId = categoriesReverseLookup[t.category]!;

    if (t.value === 0) {
        throw new ServerError(400, 'invalid amount for transaction: 0');
    }

    const model = new TransactionModel();
    model.organization_uuid = organizationId;
    model.effective_timestamp = t.effectiveTimestamp;
    model.ref_uuid = t.refId ?? null;
    model.category_id = categoryId;
    model.value = t.value;
    model.value19 = t.value19 !== 0 ? t.value19 : null;
    model.value7 = t.value7 !== 0 ? t.value7 : null;
    model.vat19 = t.vat19 !== 0 ? t.vat19 : null;
    model.vat7 = t.vat7 !== 0 ? t.vat7 : null;
    model.note = t.note ?? null;
    await transaction.save(model);

    const update = await transaction
        .createQueryBuilder()
        .update(BalanceModel)
        .set({
            dirty: true
        })
        .where('organization_uuid = UUID_TO_BIN(:orgId)', {orgId: organizationId})
        .andWhere('dirty = 0')
        .andWhere('effective_from <= :timestamp', {timestamp: t.effectiveTimestamp})
        .andWhere('effective_to > :timestamp', {timestamp: t.effectiveTimestamp})
        .execute();

    if (update.affected ?? 0 < 1) {
        console.warn('Could not mark balance as dirty');
    }

    return model.id;
}

async function updatePreviousVersions(transaction: EntityManager, oldId: string, newId: string) {
    const updateLastVersion = await transaction
        .createQueryBuilder()
        .update(TransactionModel)
        .set({
            active: false,
            current_version_uuid: newId
        })
        .where('uuid = UUID_TO_BIN(:id)', {id: oldId})
        .execute();

    if (updateLastVersion.affected !== 1) {
        throw new Error('UpdateTransaction: Could not set transaction active=false');
    }

    await transaction
        .createQueryBuilder()
        .update(TransactionModel)
        .set({
            current_version_uuid: newId,
        })
        .where('current_version_uuid = UUID_TO_BIN(:id)', {id: oldId})
        .execute();
}

export async function updateTransaction(organizationId: string, t: Transaction): Promise<{ id: string }> {
    let oldId = t.id;
    let oldTransaction = await getTransaction(organizationId, oldId);

    if (transactionsDataEqual(t, oldTransaction)) {
        throw new Error('Transactions identical');
    }

    let newId: string = '';
    await AppDataSource.manager.transaction(async manager => {
        t.refId = oldId;
        const id = await insertTransaction(manager, organizationId, t);
        let newTransaction = await getTransactionByDatabaseId(manager, organizationId, id);
        newId = newTransaction.id;

        await updatePreviousVersions(manager, oldId, newId);

        // Ultimately this should be an event -- "transactions has updated";
        // which recurring transactions subscribe to.
        await updateTransactionLink(manager, oldId, newId);
    });

    return {id: newId};
}
