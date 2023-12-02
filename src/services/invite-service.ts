import {InviteModel} from "../models/invite-model";
import {AppDataSource} from "../core/database";
import {ServerError} from "../core/server-error";

export interface Invite {
    id: string;
    insertTimestamp: Date;
    expiresAt: Date;
    acceptedAt: Date | undefined;
}

const modelToInvite = (model: InviteModel): Invite => {
    return {
        id: model.uuid,
        insertTimestamp: model.insert_timestamp,
        expiresAt: model.expires_at,
        acceptedAt: model.accepted_at ?? undefined,
    };
};

export async function createInvite(): Promise<Invite> {
    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() + 1);

    const model = new InviteModel();
    model.expires_at = now;
    await AppDataSource.manager.save(model);

    const final = await AppDataSource.manager.findOne(InviteModel, {
        where: {
            id: model.id,
        }
    });
    if (!final) {
        throw new ServerError(500, 'Could not create invite');
    }

    return modelToInvite(final);
}