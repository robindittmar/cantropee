import {PoolConnection} from "mysql2/promise";
import {ResultSetHeader} from "mysql2";
import {getConnection} from "../core/database";


export async function housekeep() {
    console.log('$ running housekeeping tasks...');
    const conn = await getConnection();
    try {
        await deleteOutdatedSessions(conn);
        await deleteDirtyBalances(conn);
        console.log('$ housekeeping done');
    } finally {
        conn.release();
    }
}

async function deleteOutdatedSessions(conn: PoolConnection): Promise<boolean> {
    const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM cantropee.sessions WHERE valid_until < NOW()'
    );
    return result.warningStatus === 0;
}

async function deleteDirtyBalances(conn: PoolConnection): Promise<boolean> {
    const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM cantropee.balance WHERE dirty=true OR valid_until < NOW()'
    );
    return result.warningStatus === 0;
}
