import {AppDataSource} from "../core/database";
import * as bcrypt from 'bcrypt';
import {UserModel} from "../models/user-model";
import {Organization, getOrganizationsForUser} from "./organization-service";
import {OrganizationUserModel} from "../models/organization-user-model";
import {UserSettingsModel} from "../models/user-settings-model";
import {ServerError} from "../core/server-error";

export interface User {
    id: string;
    email: string;
    settings: UserSettings;
    organizations: Organization[];
}

export interface UserSettings {
    defaultOrganization: string;
    canCreateInvite: boolean;
    language: string;
    locale: string;
    timezone: string;
    privateMode: boolean;
    defaultPreviewPending: boolean;
    defaultSortingOrderAsc: boolean;
    extra: object | null;
}

export interface OrgUser {
    id: string;
    email: string;
    role: string;
}


export async function getUserById(id: string): Promise<User> {
    const user = await AppDataSource.manager.findOne(UserModel, {
        where: {
            uuid: id
        }
    });

    if (user === null) {
        throw new Error('What the fuck?');
    }

    return {
        id: user.uuid,
        email: user.email,
        settings: {
            defaultOrganization: user.settings.default_organization_uuid,
            canCreateInvite: user.settings.can_create_invite,
            language: user.settings.language,
            locale: user.settings.locale,
            timezone: user.settings.timezone,
            privateMode: user.settings.private_mode,
            defaultPreviewPending: user.settings.default_preview_pending,
            defaultSortingOrderAsc: user.settings.default_sorting_order_asc,
            extra: user.settings.extra,
        },
        organizations: await getOrganizationsForUser(user.uuid),
    };
}

export async function getEmailAvailable(email: string): Promise<boolean> {
    const user = await AppDataSource.manager.findOne(UserModel, {
        where: {
            email: email,
        }
    });

    return user === null;
}

export async function getUserByEmail(email: string): Promise<[User, string, boolean]> {
    const model = await AppDataSource.manager.findOne(UserModel, {
        select: {
            id: true,
            uuid: true,
            email: true,
            password: true,
            require_password_change: true,
            insert_timestamp: true,
        },
        where: {
            email: email
        }
    });

    if (model === null) {
        throw new ServerError(404, 'User was not found');
    }

    const user: User = {
        id: model.uuid,
        email: model.email,
        settings: {
            defaultOrganization: model.settings.default_organization_uuid,
            canCreateInvite: model.settings.can_create_invite,
            language: model.settings.language,
            locale: model.settings.locale,
            timezone: model.settings.timezone,
            privateMode: model.settings.private_mode,
            defaultPreviewPending: model.settings.default_preview_pending,
            defaultSortingOrderAsc: model.settings.default_sorting_order_asc,
            extra: model.settings.extra,
        },
        organizations: await getOrganizationsForUser(model.uuid),
    };

    return [user, model.password, model.require_password_change];
}

export async function getUsersByOrganization(organizationId: string): Promise<OrgUser[]> {
    const relations = await AppDataSource.manager.find(OrganizationUserModel, {
        where: {
            organization_uuid: organizationId
        },
        relations: {
            user: true,
            role: true,
        },
        order: {
            insert_timestamp: 'DESC'
        }
    });

    const orgUsers: OrgUser[] = [];
    for (const model of relations) {
        orgUsers.push({
            id: model.user_uuid,
            email: model.user.email,
            role: model.role.name,
        });
    }

    return orgUsers;
}

export async function countUsersByRole(organizationId: string, roleId: string): Promise<number> {
    return AppDataSource.manager.count(OrganizationUserModel, {
        where: {
            organization_uuid: organizationId,
            role_uuid: roleId,
        }
    });
}

export async function updateUserPassword(user: User, newPassword: string, currentPassword: string | undefined): Promise<void> {
    const model = await AppDataSource.manager.findOne(UserModel, {
        select: {
            id: true,
            uuid: true,
            email: true,
            password: true,
            require_password_change: true,
            insert_timestamp: true,
        },
        where: {
            uuid: user.id,
        }
    });
    if (!model) {
        throw new ServerError(404, 'User not found');
    }

    // When password change is required the frontend will not send
    // the current password, so we only check it if the user changes
    // their password on their own behalf.
    if (!model.require_password_change) {
        if (!await bcrypt.compare(currentPassword ?? '', model.password)) {
            throw new ServerError(400, 'Current password is not correct');
        }
    }

    model.password = await bcrypt.hash(newPassword, 4);
    model.require_password_change = false;
    await AppDataSource.manager.save(model);
}

export async function updateUserSettings(user: User): Promise<boolean> {
    const model = new UserSettingsModel();
    model.user_uuid = user.id;
    model.default_organization_uuid = user.settings.defaultOrganization;
    model.language = user.settings.language;
    model.locale = user.settings.locale;
    model.timezone = user.settings.timezone;
    model.private_mode = user.settings.privateMode;
    model.default_preview_pending = user.settings.defaultPreviewPending;
    model.default_sorting_order_asc = user.settings.defaultSortingOrderAsc;
    model.extra = user.settings.extra;
    await AppDataSource.manager.save(model);

    return true;
}
