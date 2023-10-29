import {RowDataPacket} from 'mysql2/promise';

export interface CountAllResult extends RowDataPacket {
    count: number;
}

export interface BalanceModel extends RowDataPacket {
    id: number;
    organization_uuid: string;
    insert_timestamp: Date;
    effective_from: Date;
    effective_to: Date;
    value: number;
    vat19: number;
    vat7: number;
    pending_value: number;
    pending_vat19: number;
    pending_vat7: number;
    valid_until: Date;
    dirty: number;
}
