import {PoolConnection} from "mysql2/promise";
import {ResultSetHeader} from "mysql2";
import {getConnection} from "../core/database";


export async function housekeep() {
    console.time('$ housekeeping');
    const conn = await getConnection();
    try {
        await deleteOutdatedSessions(conn);
        await deleteDirtyBalances(conn);
        console.timeEnd('$ housekeeping');
    } catch (err) {
        console.timeEnd('$ housekeeping');
        console.error(err);
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
