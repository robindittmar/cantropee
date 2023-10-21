import {getConnection} from "../core/database";
import {UserModel} from "../models/user-model";
import {OrganizationUsersModel} from "../models/organization-users-model";

export interface User {
    id: string;
    email: string;
    default_organization: string;
    organizations: string[];
}

async function getOrganizationsForUser(userId: string): Promise<string[]> {
    let organizationIds: string[] = [];

    const conn = await getConnection();
    const [dbUserOrgs] = await conn.query<OrganizationUsersModel[]>(
        'SELECT BIN_TO_UUID(organization_id) AS organization_id, user_id, role' +
        ' FROM cantropee.organization_users' +
        ' WHERE user_id = UUID_TO_BIN(?)',
        [userId]
    );
    conn.release();

    for (const dbUserOrg of dbUserOrgs) {
        organizationIds.push(dbUserOrg.organization_id);
    }

    return organizationIds;
}

export async function getUserById(id: string): Promise<User> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(id) AS id, email, password, default_organization FROM cantropee.users WHERE id = UUID_TO_BIN(?)',
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
        default_organization: dbUser.default_organization,
        organizations: await getOrganizationsForUser(dbUser.id),
    };
}

export async function getUserByEmail(email: string): Promise<[User, string]> {
    const conn = await getConnection();
    const [dbUsers] = await conn.query<UserModel[]>(
        'SELECT BIN_TO_UUID(id) AS id, email, password, default_organization FROM cantropee.users WHERE email=?',
        [email]
    );
    conn.release();

    if (dbUsers[0] === undefined) {
        throw new Error('User was not found');
    }

    let dbUser = dbUsers[0];
    const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        default_organization: dbUser.default_organization,
        organizations: await getOrganizationsForUser(dbUser.id),
    };

    return [user, dbUser.password];
}
