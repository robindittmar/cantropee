import {RowDataPacket} from 'mysql2/promise';

export interface RecurringTransactionModel extends RowDataPacket {
    id: number;
    uuid: string;
    organization_uuid: string;
    insert_timestamp: Date;
    active: number;
    timezone: string;
    execution_policy: number;
    execution_policy_data: object | undefined;
    first_execution: Date;
    next_execution: Date;
    last_execution: Date | undefined;
    category_id: number;
    value: number;
    value19: number | undefined;
    value7: number | undefined;
    vat19: number | undefined;
    vat7: number | undefined;
    note: string | undefined;
}
