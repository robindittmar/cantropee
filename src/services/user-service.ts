import {getConnection} from "../core/database";
import * as bcrypt from 'bcrypt';
import {OrgUserModel, UserModel} from "../models/user-model";
import {ResultSetHeader} from "mysql2";
import {Organization, getOrganizationsForUser} from "./organization-service";

export interface User {
    id: string;
    email: string;
    settings: UserSettings;
    organizations: Organization[];
}

export interface UserSettings {
    defaultOrganization: string;
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
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(U.uuid) AS uuid, email, password,' +
        '       BIN_TO_UUID(default_organization_uuid) AS default_organization_uuid,' +
        '       private_mode, default_preview_pending,' +
        '       default_sorting_order_asc, extra' +
        ' FROM cantropee.users U' +
        ' INNER JOIN cantropee.user_settings S ON U.uuid=S.user_uuid' +
        ' WHERE U.uuid = UUID_TO_BIN(?)',
        [id]
    );
    conn.release();

    if (dbUsers[0] === undefined) {
        throw new Error('What the fuck?');
    }

    let dbUser = dbUsers[0];
    return {
        id: dbUser.uuid,
        email: dbUser.email,
        settings: {
            defaultOrganization: dbUser.default_organization_uuid,
            privateMode: dbUser.private_mode !== 0,
            defaultPreviewPending: dbUser.default_preview_pending !== 0,
            defaultSortingOrderAsc: dbUser.default_sorting_order_asc !== 0,
            extra: dbUser.extra,
        },
        organizations: await getOrganizationsForUser(dbUser.uuid),
    };
}

export async function getUserByEmail(email: string): Promise<[User, string, boolean]> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(U.uuid) AS uuid, email, password, require_password_change,' +
        '       BIN_TO_UUID(default_organization_uuid) AS default_organization_uuid,' +
        '       private_mode, default_preview_pending,' +
        '       default_sorting_order_asc, extra' +
        ' FROM cantropee.users U' +
        ' INNER JOIN cantropee.user_settings S ON U.uuid=S.user_uuid' +
        ' WHERE U.email = ?',
        [email]
    );
    conn.release();

    if (dbUsers[0] === undefined) {
        throw new Error('User was not found');
    }

    let dbUser = dbUsers[0];
    const user: User = {
        id: dbUser.uuid,
        email: dbUser.email,
        settings: {
            defaultOrganization: dbUser.default_organization_uuid,
            privateMode: dbUser.private_mode !== 0,
            defaultPreviewPending: dbUser.default_preview_pending !== 0,
            defaultSortingOrderAsc: dbUser.default_sorting_order_asc !== 0,
            extra: dbUser.extra,
        },
        organizations: await getOrganizationsForUser(dbUser.uuid),
    };

    return [user, dbUser.password, dbUser.require_password_change !== 0];
}

export async function getUsersByOrganization(organizationId: string): Promise<OrgUser[]> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<OrgUserModel[]>(
        'SELECT BIN_TO_UUID(U.uuid) AS uuid, U.email AS email, R.name AS role' +
        ' FROM cantropee.organization_users OU' +
        ' INNER JOIN cantropee.users U ON OU.user_uuid=U.uuid' +
        ' INNER JOIN cantropee.roles R ON OU.role_uuid=R.uuid' +
        ' WHERE OU.organization_uuid = UUID_TO_BIN(?)' +
        ' ORDER BY OU.insert_timestamp DESC, OU.user_uuid',
        [organizationId]
    );
    conn.release();

    const orgUsers: OrgUser[] = [];
    for (const dbUser of dbUsers) {
        orgUsers.push({
            id: dbUser.uuid,
            email: dbUser.email,
            role: dbUser.role,
        });
    }

    return orgUsers;
}

export async function updateUserPassword(user: User, password: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(password, 4);

    const conn = await getConnection();
    const [update] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.users SET password=?, require_password_change=false' +
        ' WHERE uuid=UUID_TO_BIN(?)',
        [passwordHash, user.id]
    );
    conn.release();

    return update.affectedRows === 1;
}

export async function updateUserSettings(user: User): Promise<boolean> {
    try {
        const conn = await getConnection();
        const [result] = await conn.query<ResultSetHeader>(
            'UPDATE cantropee.user_settings SET default_organization_uuid=UUID_TO_BIN(?),' +
            '                                   private_mode=?,' +
            '                                   default_preview_pending=?,' +
            '                                   default_sorting_order_asc=?,' +
            '                                   extra=?' +
            ' WHERE user_uuid = UUID_TO_BIN(?)',
            [
                user.settings.defaultOrganization,
                user.settings.privateMode,
                user.settings.defaultPreviewPending,
                user.settings.defaultSortingOrderAsc,
                user.settings.extra,
                user.id,
            ]
        );

        return result.affectedRows === 1;
    } catch {
        return false;
    }
}
