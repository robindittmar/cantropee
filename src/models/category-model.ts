import {RowDataPacket} from 'mysql2/promise';


export interface CategoryModel extends RowDataPacket {
    id: number;
    name: string;
    insert_timetamp: Date;
}