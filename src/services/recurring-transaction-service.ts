import {AppDataSource} from "../core/database";
import {RecurringTransactionModel} from "../models/recurring-transaction-model";
import {getCategoriesLookup, getCategoriesReverseLookup} from "./categories-service";
import {
    getTransactionByDatabaseId,
    insertTransaction,
    modelToTransaction,
    Transaction,
    updateTransaction
} from "./transaction-service";
import {invalidateAllBalances} from "./balance-service";
import moment from 'moment-timezone';
import {EntityManager, LessThanOrEqual, MoreThan} from "typeorm";
import {RecurringBookedModel} from "../models/recurring-booked-model";
import {TransactionModel} from "../models/transaction-model";
import {ServerError} from "../core/server-error";
import {randomUUID} from "crypto";

export enum ExecutionPolicy {
    StartOfMonth,
    EndOfMonth,
}

export interface RecurringTransaction {
    id: string;
    active: boolean;
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

const SYSTEM_USER_UUID = process.env['SYSTEM_USER_UUID'] ?? 'c91d3ebb-06e1-413c-ba1d-f3fcac98e198';
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

const bookTransactionFromRecurring = async (manager: EntityManager, organizationId: string, recurring: RecurringTransaction): Promise<string | undefined> => {
    let t = makeTransactionFromRecurring(recurring);
    let resultId: string = '';

    let transactionId = await insertTransaction(manager, organizationId, SYSTEM_USER_UUID, t);
    if (transactionId === 0) {
        throw new Error('Error writing transaction, rolled back.' + t);
    }

    let transaction = await getTransactionByDatabaseId(manager, organizationId, transactionId);
    resultId = transaction.id;

    const link = new RecurringBookedModel();
    link.recurring_uuid = recurring.id;
    link.transaction_uuid = transaction.id;
    await manager.save(link);

    return resultId;
};

export async function getRecurringTransactionByDatabaseId(organizationId: string, id: number): Promise<RecurringTransaction> {
    const recurring = await AppDataSource.manager.findOne(RecurringTransactionModel, {
        where: {
            id: id
        }
    });

    if (!recurring) {
        throw new Error('Recurring transaction not found');
    }

    const categoriesLookup = await getCategoriesLookup(organizationId);
    return {
        id: recurring.uuid,
        active: recurring.active,
        insertTimestamp: recurring.insert_timestamp,
        timezone: recurring.timezone,
        executionPolicy: recurring.execution_policy,
        executionPolicyData: recurring.execution_policy_data ?? {},
        firstExecution: recurring.first_execution,
        nextExecution: recurring.next_execution,
        lastExecution: recurring.last_execution ?? undefined,
        category: categoriesLookup[recurring.category_id] ?? '[ERROR]',
        value: recurring.value,
        value19: recurring.value19 ?? undefined,
        value7: recurring.value7 ?? undefined,
        vat19: recurring.vat19 ?? undefined,
        vat7: recurring.vat7 ?? undefined,
        note: recurring.note ?? undefined,
    };
}


export async function getRecurringTransaction(organizationId: string, id: string): Promise<RecurringTransaction> {
    const recurring = await AppDataSource.manager.findOne(RecurringTransactionModel, {
        where: {
            uuid: id,
            organization_uuid: organizationId,
        }
    });

    if (!recurring) {
        throw new Error('Recurring transaction not found');
    }

    const categoriesLookup = await getCategoriesLookup(organizationId);
    return {
        id: recurring.uuid,
        active: recurring.active,
        insertTimestamp: recurring.insert_timestamp,
        timezone: recurring.timezone,
        executionPolicy: recurring.execution_policy,
        executionPolicyData: recurring.execution_policy_data ?? {},
        firstExecution: recurring.first_execution,
        nextExecution: recurring.next_execution,
        lastExecution: recurring.last_execution ?? undefined,
        category: categoriesLookup[recurring.category_id] ?? '[ERROR]',
        value: recurring.value,
        value19: recurring.value19 ?? undefined,
        value7: recurring.value7 ?? undefined,
        vat19: recurring.vat19 ?? undefined,
        vat7: recurring.vat7 ?? undefined,
        note: recurring.note ?? undefined,
    };
}

export async function getRecurringTransactions(organizationId: string, nextExecutionSmallerEqual: Date | undefined = undefined): Promise<RecurringTransaction[]> {
    let whereOptions: any = {
        organization_uuid: organizationId
    };
    if (nextExecutionSmallerEqual) {
        whereOptions = {...whereOptions, next_execution: LessThanOrEqual(nextExecutionSmallerEqual)};
    }

    const rows = await AppDataSource.manager.find(RecurringTransactionModel, {
        where: whereOptions,
        order: {
            active: 'DESC',
            id: 'DESC',
        },
    });

    const categoriesLookup = await getCategoriesLookup(organizationId);
    let recurringTransactions: RecurringTransaction[] = [];
    for (const recurring of rows) {
        recurringTransactions.push({
            id: recurring.uuid,
            active: recurring.active,
            insertTimestamp: recurring.insert_timestamp,
            timezone: recurring.timezone,
            executionPolicy: recurring.execution_policy,
            executionPolicyData: recurring.execution_policy_data ?? {},
            firstExecution: recurring.first_execution,
            nextExecution: recurring.next_execution,
            lastExecution: recurring.last_execution ?? undefined,
            category: categoriesLookup[recurring.category_id] ?? '[ERROR]',
            value: recurring.value,
            value19: recurring.value19 ?? undefined,
            value7: recurring.value7 ?? undefined,
            vat19: recurring.vat19 ?? undefined,
            vat7: recurring.vat7 ?? undefined,
            note: recurring.note ?? undefined,
        });
    }

    return recurringTransactions;
}

export async function insertRecurringTransaction(manager: EntityManager, organizationId: string, userId: string, recurring: RecurringTransaction): Promise<number> {
    const lookup = await getCategoriesReverseLookup(organizationId);

    const model = new RecurringTransactionModel();
    model.uuid = randomUUID();
    model.organization_uuid = organizationId;
    model.created_by_uuid = userId;
    model.timezone = recurring.timezone;
    model.execution_policy = recurring.executionPolicy;
    model.execution_policy_data = recurring.executionPolicyData;
    model.first_execution = recurring.firstExecution;
    model.next_execution = recurring.nextExecution;
    if (recurring.lastExecution) {
        model.last_execution = recurring.lastExecution;
    }
    model.category_id = lookup[recurring.category] ?? 0;
    model.value = recurring.value;
    if (recurring.value19) {
        model.value19 = recurring.value19;
    }
    if (recurring.value7) {
        model.value7 = recurring.value7;
    }
    if (recurring.vat19) {
        model.vat19 = recurring.vat19;
    }
    if (recurring.vat7) {
        model.vat7 = recurring.vat7;
    }
    if (recurring.note) {
        model.note = recurring.note;
    }
    await manager.save(model);

    return model.id;
}

export async function updateRecurringTransaction(manager: EntityManager, organizationId: string, userId: string, recurring: RecurringTransaction): Promise<void> {
    let id = await insertRecurringTransaction(manager, organizationId, userId, recurring);

    const newRecurring = await getRecurringTransactionByDatabaseId(organizationId, id);

    const model = new RecurringTransactionModel();
    model.uuid = recurring.id;
    model.organization_uuid = organizationId;
    model.active = false;
    model.ref_uuid = newRecurring.id;
    model.current_version_uuid = newRecurring.id;
    await manager.save(model);

    await manager.createQueryBuilder()
        .update(RecurringTransactionModel)
        .set({
            current_version_uuid: newRecurring.id,
        })
        .where({
            current_version_uuid: recurring.id,
        })
        .execute();
}

async function setRecurringTransactionInactive(transaction: EntityManager, organizationId: string, recurring: RecurringTransaction): Promise<void> {
    const model = new RecurringTransactionModel();
    model.organization_uuid = organizationId;
    model.uuid = recurring.id;
    model.active = false;
    await transaction.save(model);
}

export async function updateRecurringTransactionNextExecution(transaction: EntityManager, organizationId: string, recurring: RecurringTransaction): Promise<void> {
    const model = new RecurringTransactionModel();
    model.organization_uuid = organizationId;
    model.uuid = recurring.id;
    model.next_execution = recurring.nextExecution;
    await transaction.save(model);
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

export async function bookPendingRecurringTransactions(organizationId: string, previewCount: number): Promise<string[]> {
    let newIds: string[] = [];

    const now = new Date();
    let pending = await getRecurringTransactions(organizationId, now);

    for (const recurring of pending) {
        await AppDataSource.manager.transaction(async transaction => {
            const pendingTransactionDates = (await getPendingTransactionDatesForRecurring(transaction, recurring));

            newIds = newIds.concat(await bookTransactions(transaction, organizationId, recurring, pendingTransactionDates));

            await updateRecurringTransactionNextExecution(transaction, organizationId, recurring);

            newIds = newIds.concat(await prebookTransactions(transaction, organizationId, recurring, pendingTransactionDates, previewCount));
        });
    }

    return newIds;
}

export async function ensureRecurringPrebooked(organizationId: string, recurring: RecurringTransaction, previewCount: number): Promise<string[]> {
    const pendingTransactionDates = (await getPendingTransactionDatesForRecurring(AppDataSource.manager, recurring));
    return prebookTransactions(AppDataSource.manager, organizationId, recurring, pendingTransactionDates, previewCount);
}

export async function bookTransactions(transaction: EntityManager, organizationId: string, recurring: RecurringTransaction, prebookedDates: Date[]): Promise<string[]> {
    let newIds: string[] = [];
    const now = new Date();

    const prebookedTimes = prebookedDates.map(d => d.getTime());

    while (recurring.nextExecution <= now) {
        if (prebookedTimes.includes(recurring.nextExecution.getTime())) {
            continue;
        }

        const id = await bookTransactionFromRecurring(transaction, organizationId, recurring);
        if (!id) {
            break;
        }

        newIds.push(id);
        recurring.nextExecution = leapToNextExecution(recurring);
        if (recurring.lastExecution) {
            if (recurring.nextExecution > recurring.lastExecution) {
                await setRecurringTransactionInactive(transaction, organizationId, recurring);
                break;
            }
        }
    }

    return newIds;
}

export async function prebookTransactions(transaction: EntityManager, organizationId: string, recurring: RecurringTransaction, prebookedDates: Date[], previewCount: number): Promise<string[]> {
    let newIds: string[] = [];

    if (previewCount > 0) {

        if (prebookedDates.length === previewCount) {
            return [];
        }

        const prebookedTimes = prebookedDates.map(d => d.getTime());

        for (let i = 0; i < previewCount; i++) {
            if (!prebookedTimes.includes(recurring.nextExecution.getTime())) {
                const id = await bookTransactionFromRecurring(transaction, organizationId, recurring);
                if (!id) {
                    break;
                }

                newIds.push(id);
            }

            recurring.nextExecution = leapToNextExecution(recurring);
            if (recurring.lastExecution) {
                if (recurring.nextExecution > recurring.lastExecution) {
                    break;
                }
            }
        }
    }

    return newIds;
}

export async function updatePrebookedTransactions(manager: EntityManager, organizationId: string, recurring: RecurringTransaction): Promise<void> {
    const prebookeds = await manager.find(RecurringBookedModel, {
        where: {
            recurring_uuid: recurring.id,
            transaction: {
                organization_uuid: organizationId,
                effective_timestamp: MoreThan(new Date())
            },
        },
        relations: {
            transaction: true
        }
    });

    const categoryLookup = await getCategoriesLookup(organizationId);
    for (let prebooked of prebookeds) {
        let t = modelToTransaction(prebooked.transaction, categoryLookup);

        t.category = recurring.category;
        t.note = recurring.note;
        t.value = recurring.value;
        t.value19 = recurring.value19 ?? 0;
        t.value7 = recurring.value7 ?? 0;
        t.vat19 = recurring.vat19 ?? 0;
        t.vat7 = recurring.vat7 ?? 0;
        await updateTransaction(organizationId, SYSTEM_USER_UUID, t);
    }
}

export async function deleteRecurringTransaction(organizationId: string, recurringTransactionId: string, cascade: boolean = false): Promise<boolean> {
    await AppDataSource.manager.transaction(async transaction => {

        const subquery = transaction.createQueryBuilder()
            .select('transaction_uuid')
            .from(RecurringBookedModel, 'b')
            .where('b.recurring_uuid = UUID_TO_BIN(:recurring_id)', {recurring_id: recurringTransactionId});

        let updateQuery = transaction.createQueryBuilder()
            .update(TransactionModel)
            .set({
                active: false
            })
            .where('organization_uuid = UUID_TO_BIN(:orgId)', {orgId: organizationId})
            .andWhere('uuid IN (' + subquery.getQuery() + ')')
            .setParameters(subquery.getParameters());

        if (!cascade) {
            updateQuery.andWhere('effective_timestamp > NOW()');
        }

        const result = await updateQuery.execute();

        if (result.affected ?? 0 > 0) {
            await invalidateAllBalances(transaction, organizationId);
        }

        const model = await transaction.findOne(RecurringTransactionModel, {
            where: {
                organization_uuid: organizationId,
                uuid: recurringTransactionId,
            },
        });
        if (!model) {
            throw new ServerError(404, 'Recurring transaction not found')
        }

        model.active = false;
        await transaction.save(model);
    });

    return true;
}

export async function getPendingTransactionDatesForRecurring(transaction: EntityManager, recurring: RecurringTransaction): Promise<Date[]> {
    const rows = await transaction.createQueryBuilder()
        .select('t.effective_timestamp', 'effective_timestamp')
        .from(RecurringBookedModel, 'b')
        .innerJoin(TransactionModel, 't', 'b.transaction_uuid=t.uuid')
        .where('b.recurring_uuid = UUID_TO_BIN(:id)', {id: recurring.id})
        .andWhere('t.effective_timestamp > NOW()')
        .execute();

    let dates: Date[] = [];
    for (const row of rows) {
        dates.push(row.effective_timestamp);
    }

    return dates;
}

export async function updateTransactionLink(transaction: EntityManager, oldId: string, newId: string): Promise<void> {
    await transaction.createQueryBuilder()
        .update(RecurringBookedModel)
        .set({
            transaction_uuid: newId,
        })
        .where({
            transaction_uuid: oldId,
        })
        .execute();
}
