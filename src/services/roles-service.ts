import {getConnection} from "../core/database";
import {RoleModel} from "../models/role-model";
import {ResultSetHeader} from "mysql2";
import {ServerError} from "../core/server-error";
import {countUsersByRole} from "./user-service";

export interface UserRole {
    id: string;
    name: string;
    privileges: string[];
}

const modelToRole = (model: RoleModel): UserRole => {
    return {
        id: model.uuid,
        name: model.name,
        privileges: model.privileges,
    };
};

export async function getRoles(organizationId: string): Promise<UserRole[]> {
    const conn = await getConnection();
    const [rows] = await conn.query<RoleModel[]>(
        'SELECT id, BIN_TO_UUID(uuid) AS uuid, BIN_TO_UUID(organization_uuid) AS organization_uuid,' +
        '       insert_timestamp, name, privileges' +
        ' FROM cantropee.roles' +
        ' WHERE organization_uuid=UUID_TO_BIN(?)',
        [organizationId]
    );

    let roles: UserRole[] = [];
    for (const role of rows) {
        roles.push(modelToRole(role));
    }

    return roles;
}

export async function insertRole(organizationId: string, role: UserRole): Promise<number> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.roles' +
        ' (organization_uuid, name, privileges)' +
        ' VALUES (UUID_TO_BIN(?), ?, ?)',
        [organizationId, role.name, role.privileges]
    );

    return result.insertId;
}

export async function updateRole(organizationId: string, role: UserRole): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.roles' +
        ' SET name = ?, privileges = ?' +
        ' WHERE cantropee.roles.organization_uuid = UUID_TO_BIN(?) AND id = ?',
        [role.name, role.privileges, organizationId, role.id]
    );

    return result.affectedRows > 0;
}

export async function deleteRole(organizationId: string, roleId: string): Promise<boolean> {
    const count = await countUsersByRole(organizationId, roleId);
    if (count > 0) {
        throw new ServerError(500, 'Cannot delete role as there are users associated with it');
    }

    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM cantropee.roles WHERE organization_uuid = UUID_TO_BIN(?) AND uuid=UUID_TO_BIN(?)',
        [organizationId, roleId]
    );
    conn.release();

    return result.affectedRows > 0;
}

