import {AppDataSource} from "../core/database";
import {OrganizationUserModel} from "../models/organization-user-model";


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