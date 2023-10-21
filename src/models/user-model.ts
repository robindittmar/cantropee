import {RowDataPacket} from 'mysql2/promise';

export interface UserModel extends RowDataPacket {
    id: string;
    email: string;
    password: string;
    default_organization: string;
    insert_timestamp: Date;
}
