import {AppDataSource} from "../core/database";
import {RoleModel} from "../models/role-model";
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
    const rows = await AppDataSource.manager.find(RoleModel, {
        where: {
            organization_uuid: organizationId,
        }
    });

    let roles: UserRole[] = [];
    for (const role of rows) {
        roles.push(modelToRole(role));
    }

    return roles;
}

export async function insertRole(organizationId: string, role: UserRole): Promise<number> {
    const model = new RoleModel();
    model.organization_uuid = organizationId;
    model.name = role.name;
    model.privileges = role.privileges;
    await AppDataSource.manager.save(model);

    return model.id;
}

export async function updateRole(organizationId: string, role: UserRole): Promise<boolean> {
    const model = new RoleModel();
    model.uuid = role.id;
    model.organization_uuid = organizationId;
    model.name = role.name;
    model.privileges = role.privileges;
    await AppDataSource.manager.save(model);

    return true;
}

export async function deleteRole(organizationId: string, roleId: string): Promise<boolean> {
    const count = await countUsersByRole(organizationId, roleId);
    if (count > 0) {
        throw new ServerError(500, 'Cannot delete role as there are users associated with it');
    }

    const model = new RoleModel();
    model.uuid = roleId;
    model.organization_uuid = organizationId;
    await AppDataSource.manager.remove(model);

    return true;
}

