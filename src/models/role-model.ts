import {RowDataPacket} from 'mysql2/promise';

export interface RoleModel extends RowDataPacket {
    id: number;
    uuid: string;
    organization_uuid: string;
    insert_timestamp: Date;
    name: string
    privileges: string[];
}
