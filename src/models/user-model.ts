import {RowDataPacket} from 'mysql2/promise';

export interface UserModel extends RowDataPacket {
    id: string;
    email: string;
    password: string;
    default_organization: string;
    private_mode: number;
    default_preview_pending: number;
    default_sorting_order_asc: number;
    extra: object | null;
    insert_timestamp: Date;
}
