import {RowDataPacket} from 'mysql2/promise';

export interface OrganizationUsersModel extends RowDataPacket {
    organization_id: string;
    user_id: string;
    role: number;
    insert_timestamp: Date;
}
