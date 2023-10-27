import {getConnection} from "../core/database";
import * as bcrypt from 'bcrypt';
import {UserModel} from "../models/user-model";
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


export async function getUserById(id: string): Promise<User> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(U.id) AS id, email, password,' +
        '       BIN_TO_UUID(default_organization) AS default_organization,' +
        '       private_mode, default_preview_pending,' +
        '       default_sorting_order_asc, extra' +
        ' FROM cantropee.users U' +
        ' INNER JOIN cantropee.user_settings S ON U.id=S.user_id' +
        ' WHERE U.id = UUID_TO_BIN(?)',
        [id]
    );
    conn.release();

    if (dbUsers[0] === undefined) {
        throw new Error('What the fuck?');
    }

    let dbUser = dbUsers[0];
    return {
        id: dbUser.id,
        email: dbUser.email,
        settings: {
            defaultOrganization: dbUser.default_organization,
            privateMode: dbUser.private_mode !== 0,
            defaultPreviewPending: dbUser.default_preview_pending !== 0,
            defaultSortingOrderAsc: dbUser.default_sorting_order_asc !== 0,
            extra: dbUser.extra,
        },
        organizations: await getOrganizationsForUser(dbUser.id),
    };
}

export async function getUserByEmail(email: string): Promise<[User, string, boolean]> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(U.id) AS id, email, password, require_password_change,' +
        '       BIN_TO_UUID(default_organization) AS default_organization,' +
        '       private_mode, default_preview_pending,' +
        '       default_sorting_order_asc, extra' +
        ' FROM cantropee.users U' +
        ' INNER JOIN cantropee.user_settings S ON U.id=S.user_id' +
        ' WHERE U.email = ?',
        [email]
    );
    conn.release();

    if (dbUsers[0] === undefined) {
        throw new Error('User was not found');
    }

    let dbUser = dbUsers[0];
    const user = {
        id: dbUser.id,
        email: dbUser.email,
        settings: {
            defaultOrganization: dbUser.default_organization,
            privateMode: dbUser.private_mode !== 0,
            defaultPreviewPending: dbUser.default_preview_pending !== 0,
            defaultSortingOrderAsc: dbUser.default_sorting_order_asc !== 0,
            extra: dbUser.extra,
        },
        organizations: await getOrganizationsForUser(dbUser.id),
    };

    return [user, dbUser.password, dbUser.require_password_change !== 0];
}

export async function updateUserPassword(user: User, password: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(password, 4);

    const conn = await getConnection();
    const [update] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.users SET password=?, ' +
        '                           require_password_change=false' +
        ' WHERE id=UUID_TO_BIN(?)',
        [passwordHash, user.id]
    );
    conn.release();

    return update.affectedRows === 1;
}

export async function updateUserSettings(user: User): Promise<boolean> {
    try {
        const conn = await getConnection();
        const [result] = await conn.query<ResultSetHeader>(
            'UPDATE cantropee.user_settings SET default_organization=UUID_TO_BIN(?),' +
            '                                   private_mode=?,' +
            '                                   default_preview_pending=?,' +
            '                                   default_sorting_order_asc=?,' +
            '                                   extra=?' +
            ' WHERE user_id = UUID_TO_BIN(?)',
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
