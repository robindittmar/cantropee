import {RowDataPacket} from 'mysql2/promise';

export interface OrganizationModel extends RowDataPacket {
    id: number;
    uuid: string;
    name: string;
    currency: string;
    uses_taxes: number;
    preview_recurring_count: number;
    insert_timestamp: Date;
    privileges: string[];
}
