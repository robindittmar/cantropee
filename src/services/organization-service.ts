import {getConnection} from "../core/database";
import {OrganizationModel} from "../models/organization-model";


export interface Organization {
    id: string;
    name: string;
    currency: string;
}

export async function getOrganizationsForUser(userId: string): Promise<Organization[]> {
    let organizations: Organization[] = [];

    const conn = await getConnection();
    const [dbUserOrgs] = await conn.query<OrganizationModel[]>(
        'SELECT BIN_TO_UUID(O.uuid) AS uuid, O.name AS name, O.currency AS currency, O.insert_timestamp AS insert_timestamp' +
        ' FROM cantropee.organization_users OU' +
        ' INNER JOIN cantropee.organizations O ON OU.organization_uuid=O.uuid' +
        ' WHERE user_uuid = UUID_TO_BIN(?)',
        [userId]
    );
    conn.release();

    for (const dbUserOrg of dbUserOrgs) {
        organizations.push({
            id: dbUserOrg.uuid,
            name: dbUserOrg.name,
            currency: dbUserOrg.currency,
        });
    }

    return organizations;
}