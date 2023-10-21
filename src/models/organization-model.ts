import {RowDataPacket} from 'mysql2/promise';

export interface OrganizationModel extends RowDataPacket {
    id: string;
    name: string;
    insert_timestamp: Date;
}
