import {EntityManager} from "typeorm";
import {AppDataSource} from "../core/database";
import {SessionModel} from "../models/session-model";
import {BalanceModel} from "../models/balance-model";

// import {InviteModel} from "../models/invite-model";


export async function housekeep() {
    console.time('$ housekeeping');
    try {
        await deleteOutdatedSessions(AppDataSource.manager);
        await deleteDirtyBalances(AppDataSource.manager);
        // await deleteUnusedExpiredInvites(AppDataSource.manager);
        console.timeEnd('$ housekeeping');
    } catch (err) {
        console.timeEnd('$ housekeeping');
        console.error(err);
    }
}

async function deleteOutdatedSessions(manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder()
        .delete()
        .from(SessionModel)
        .where('valid_until < NOW()')
        .execute();
}

async function deleteDirtyBalances(manager: EntityManager): Promise<void> {
    await manager.createQueryBuilder()
        .delete()
        .from(BalanceModel)
        .where('dirty = true')
        .orWhere('valid_until < NOW()')
        .execute();
}

// async function deleteUnusedExpiredInvites(manager: EntityManager): Promise<void> {
//     await manager.createQueryBuilder()
//         .delete()
//         .from(InviteModel)
//         .where('organization_uuid IS NULL')
//         .andWhere('expires_at < NOW()')
//         .execute();
// }
