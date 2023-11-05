import {RowDataPacket} from 'mysql2/promise';

export interface UserModel extends RowDataPacket {
    id: number;
    uuid: string;
    email: string;
    password: string;
    require_password_change: number;
    default_organization_uuid: string;
    private_mode: number;
    default_preview_pending: number;
    default_sorting_order_asc: number;
    extra: object | null;
    insert_timestamp: Date;
}

export interface OrgUserModel extends RowDataPacket {
    uuid: string;
    email: string;
    role: string;
}
