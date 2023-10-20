import {RowDataPacket} from 'mysql2/promise';


export interface CountAllResult extends RowDataPacket {
    count: number;
}

export interface TransactionModel extends RowDataPacket {
    id: number;
    insert_timestamp: Date;
    effective_timestamp: Date;
    active: boolean;
    ref_id: number | undefined;
    category_id: number;
    value: number;
    value19: number | undefined;
    value7: number | undefined;
    vat19: number | undefined;
    vat7: number | undefined;
}
