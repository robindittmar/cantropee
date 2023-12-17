import {AppDataSource} from "../core/database";
import {OrganizationUserModel} from "../models/organization-user-model";
import {OrganizationModel} from "../models/organization-model";
import {randomUUID} from "crypto";
import {RoleModel} from "../models/role-model";
import {CategoryModel} from "../models/category-model";


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

export async function createOrganization(userId: string, organization: Organization): Promise<string> {
    let orgId = randomUUID();

    await AppDataSource.manager.transaction(async t => {
        const org = new OrganizationModel();
        org.uuid = orgId;
        org.name = organization.name;
        org.currency = organization.currency;
        org.uses_taxes = organization.usesTaxes;
        org.preview_recurring_count = organization.previewRecurringCount;
        await t.save(org);

        const role = new RoleModel();
        role.uuid = randomUUID();
        role.organization_uuid = org.uuid;
        role.name = 'admin';
        role.privileges = ['read', 'write', 'admin'];
        await t.save(role);

        const orgUser = new OrganizationUserModel();
        orgUser.organization_uuid = org.uuid;
        orgUser.user_uuid = userId;
        orgUser.role_uuid = role.uuid;
        await t.save(orgUser);

        const category = new CategoryModel();
        category.organization_uuid = org.uuid;
        category.name = 'n/a';
        await t.save(category);
    });

    return orgId;
}

export async function addUserToOrganization(organizationId: string, userId: string, roleId: string): Promise<void> {
    const orgUser = new OrganizationUserModel();
    orgUser.organization_uuid = organizationId;
    orgUser.user_uuid = userId;
    orgUser.role_uuid = roleId;
    await AppDataSource.manager.save(orgUser);
}

export async function deleteOrganization(organizationId: string): Promise<void> {
    throw new Error('Not implemented yet; ' + organizationId);
}
