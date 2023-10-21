import {RowDataPacket} from 'mysql2/promise';

export interface SessionModel extends RowDataPacket {
    id: number;
    insert_timestamp: Date;
    valid_until: Date;
    session_id: string;
    user_id: string;
    organization_id: string;
}
