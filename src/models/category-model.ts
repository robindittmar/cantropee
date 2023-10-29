import {RowDataPacket} from 'mysql2/promise';

export interface CategoryModel extends RowDataPacket {
    id: number;
    organization_uuid: string;
    name: string;
    insert_timestamp: Date;
}
