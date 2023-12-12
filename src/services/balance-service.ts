import {BalanceModel} from "../models/balance-model";
import {AppDataSource} from "../core/database";
import {TransactionModel} from "../models/transaction-model";
import {ServerError} from "../core/server-error";
import {Between, EntityManager, Like} from "typeorm";


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
    endingAt.setUTCSeconds(endingAt.getUTCSeconds() - 1);


    let whereCondition: any = {
        organization_uuid: organizationId,
        active: true,
        effective_timestamp: Between(startingFrom, endingAt)
    };
    if (categoryId) {
        whereCondition = {...whereCondition, category_id: categoryId};
    }
    if (note) {
        whereCondition = {...whereCondition, note: Like(`%${note}%`)};
    }

    let rows: TransactionModel[] = await AppDataSource.manager.find(TransactionModel, {
        where: whereCondition,
        order: {
            effective_timestamp: 'ASC',
        }
    });


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
    const model = new BalanceModel();
    model.organization_uuid = organizationId;
    model.effective_from = balance.effectiveFrom;
    model.effective_to = balance.effectiveTo;
    model.valid_until = balance.validUntil;
    model.value = balance.total;
    model.vat19 = balance.vat.vat19;
    model.vat7 = balance.vat.vat7;
    model.pending_value = balance.pending.total;
    model.pending_vat19 = balance.pending.vat.vat19;
    model.pending_vat7 = balance.pending.vat.vat7;
    await AppDataSource.manager.save(model);

    if (model.id === 0) {
        throw new ServerError(500, 'Could not write balance');
    }
    return model.id;
}

export async function getBalance(organizationId: string, effectiveFrom: Date, effectiveTo: Date, categoryId: number | undefined, note: string | undefined): Promise<Balance> {
    let model: BalanceModel | null = null;

    // We do not cache filtered balances
    if (!categoryId && !note) {
        let dbResult = await AppDataSource.manager.createQueryBuilder()
            .select()
            .from(BalanceModel, 'b')
            .distinct(true)
            .where('organization_uuid = UUID_TO_BIN(:orgId)', {orgId: organizationId})
            .andWhere('dirty = false')
            .andWhere('valid_until > NOW()')
            .andWhere('effective_from = :from', {from: effectiveFrom.toISOString().substring(0, 19)})
            .andWhere('effective_to = :to', {to: effectiveTo.toISOString().substring(0, 19)})
            .execute();

        if (dbResult.length > 0) {
            model = dbResult[0];
        }
    }

    let balance: Balance;
    if (model !== null) {
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

export async function invalidateAllBalances(manager: EntityManager, organizationId: string): Promise<void> {
    await manager.createQueryBuilder()
        .update(BalanceModel)
        .set({
            dirty: true
        })
        .where('organization_uuid = UUID_TO_BIN(:orgId)', {orgId: organizationId})
        .execute();
}