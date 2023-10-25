import {RowDataPacket} from 'mysql2/promise';

export interface CountAllResult extends RowDataPacket {
    count: number;
}

export interface TransactionModel extends RowDataPacket {
    id: string;
    organization_id: string;
    insert_timestamp: Date;
    effective_timestamp: Date;
    active: number;
    ref_id: string | undefined;
    category_id: number;
    value: number;
    value19: number | undefined;
    value7: number | undefined;
    vat19: number | undefined;
    vat7: number | undefined;
    note: string | undefined;
}
