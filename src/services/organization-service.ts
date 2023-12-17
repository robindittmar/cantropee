import {AppDataSource} from "../core/database";
import {OrganizationUserModel} from "../models/organization-user-model";
import {OrganizationModel} from "../models/organization-model";
import {randomUUID} from "crypto";
import {RoleModel} from "../models/role-model";
import {CategoryModel} from "../models/category-model";
import {EntityManager} from "typeorm";


export interface Organization {
    id: string;
    name: string;
    currency: string;
    usesTaxes: boolean;
    previewRecurringCount: number;
    privileges: string[];
}

export async function getOrganizationsForUser(userId: string): Promise<Organization[]> {
    let organizations: Organization[] = [];

    const result = await AppDataSource.manager.find(OrganizationUserModel, {
        relations: {
            organization: true,
            role: true,
        },
        where: {
            user_uuid: userId,
        },
    });

    for (const model of result) {
        organizations.push({
            id: model.organization.uuid,
            name: model.organization.name,
            currency: model.organization.currency,
            usesTaxes: model.organization.uses_taxes,
            previewRecurringCount: model.organization.preview_recurring_count,
            privileges: model.role.privileges,
        });
    }

    return organizations;
}

export async function createOrganization(manager: EntityManager, organization: Organization): Promise<{
    organizationId: string;
    adminRoleId: string;
}> {
    const org = new OrganizationModel();
    org.uuid = randomUUID();
    org.name = organization.name;
    org.currency = organization.currency;
    org.uses_taxes = organization.usesTaxes;
    org.preview_recurring_count = organization.previewRecurringCount;
    await manager.save(org);

    const newRole = async (name: string, priv: string[]) => {
        const role = new RoleModel();
        role.uuid = randomUUID();
        role.organization_uuid = org.uuid;
        role.name = name;
        role.privileges = priv;
        await manager.save(role);

        return role.uuid;
    };
    const adminRoleId = await newRole('admin', ['read', 'write', 'admin']);
    await newRole('user', ['read', 'write']);
    await newRole('read-only', ['read']);

    const category = new CategoryModel();
    category.organization_uuid = org.uuid;
    category.name = 'n/a';
    await manager.save(category);

    return {organizationId: org.uuid, adminRoleId: adminRoleId};
}

export async function addUserToOrganization(manager: EntityManager, organizationId: string, userId: string, roleId: string): Promise<void> {
    const orgUser = new OrganizationUserModel();
    orgUser.organization_uuid = organizationId;
    orgUser.user_uuid = userId;
    orgUser.role_uuid = roleId;
    await manager.save(orgUser);
}

export async function deleteOrganization(organizationId: string): Promise<void> {
    throw new Error('Not implemented yet; ' + organizationId);
}
