import {InviteModel} from "../models/invite-model";
import {AppDataSource} from "../core/database";
import {ServerError} from "../core/server-error";
import {UserModel} from "../models/user-model";
import {UserSettingsModel} from "../models/user-settings-model";
import * as bcrypt from "bcrypt";
import {randomUUID} from "crypto";
import {addUserToOrganization, createOrganization} from "./organization-service";

export interface Invite {
    id: string;
    insertTimestamp: Date;
    issuedBy: string;
    expiresAt: Date;
    acceptedAt: Date | undefined;
    organizationId: string | undefined;
}

const modelToInvite = (model: InviteModel): Invite => {
    return {
        id: model.uuid,
        insertTimestamp: model.insert_timestamp,
        issuedBy: model.issued_by,
        expiresAt: model.expires_at,
        acceptedAt: model.accepted_at ?? undefined,
        organizationId: model.organization_uuid ?? undefined,
    };
};

export async function createInvite(userId: string): Promise<Invite> {
    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() + 1);

    const model = new InviteModel();
    model.issued_by = userId;
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

export async function validateInvite(inviteId: string): Promise<boolean> {
    const invite = await AppDataSource.manager.findOne(InviteModel, {
        where: {
            uuid: inviteId,
        }
    });
    if (!invite) {
        return false;
    }
    if (invite.expires_at < new Date()) {
        return false;
    }

    // organization_uuid will be non-null after invite is used
    return !invite.organization_uuid;
}

export async function useInvite(inviteId: string, orgName: string, currency: string, useTaxes: boolean, userEmail: string, userPassword: string): Promise<void> {
    const now = new Date();

    const invite = await AppDataSource.manager.findOne(InviteModel, {
        where: {
            uuid: inviteId,
        }
    });
    if (!invite) {
        throw new ServerError(404, 'Invite not found');
    }
    if (invite.expires_at < now) {
        throw new ServerError(404, 'Invite has expired');
    }
    if (!!invite.organization_uuid) {
        throw new ServerError(404, 'Invite has already been used');
    }

    await AppDataSource.manager.transaction(async t => {
        const user = new UserModel();
        user.uuid = randomUUID();
        user.email = userEmail;
        user.password = await bcrypt.hash(userPassword, 4);
        user.require_password_change = false;
        await t.save(user);

        const createOrgResult = await createOrganization(t, {
            id: '',
            name: orgName,
            currency: currency,
            usesTaxes: useTaxes,
            previewRecurringCount: 3,
            privileges: [],
        });
        await addUserToOrganization(t, createOrgResult.organizationId, user.uuid, createOrgResult.adminRoleId);

        const userSettings = new UserSettingsModel();
        userSettings.user_uuid = user.uuid;
        userSettings.default_organization_uuid = createOrgResult.organizationId;
        userSettings.can_create_invite = true;
        await t.save(userSettings);

        invite.organization_uuid = createOrgResult.organizationId;
        invite.accepted_by = user.uuid;
        invite.accepted_at = now;
        await t.save(invite);
    });
}
