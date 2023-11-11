import {RowDataPacket} from 'mysql2/promise';

export interface OrganizationModel extends RowDataPacket {
    id: number;
    uuid: string;
    name: string;
    currency: string;
    uses_taxes: number;
    insert_timestamp: Date;
    privileges: string[];
}
