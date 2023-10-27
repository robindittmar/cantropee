import {getConnection} from "../core/database";
import {SessionModel} from "../models/session-model";
import {getUserById, User} from "./user-service";
import {ResultSetHeader} from "mysql2";
import {Request} from "express";

export interface RequestWithSession extends Request {
    session?: Session;
}

export interface Session {
    sessionId: string;
    validUntil: Date;
    user: User;
    organizationId: string;
}

let sessionCache: {
    [sessionId: string]: Session;
} = {};

export const getSessionFromReq = (req: Request): Session => {
    const session = (req as RequestWithSession).session;
    if (!session) {
        throw new Error('Tried to get session in unsecure endpoint');
    }
    return session;
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
    if (sessionId in sessionCache) {
        const session = sessionCache[sessionId];
        if (session !== undefined && session.validUntil > new Date()) {
            return session;
        }
    }

    const conn = await getConnection();
    const [getSessionResult] = await conn.query<SessionModel[]>(
        'SELECT id, session_id, valid_until, BIN_TO_UUID(user_id) AS user_id,' +
        '       BIN_TO_UUID(organization_id) AS organization_id' +
        ' FROM cantropee.sessions' +
        ' WHERE session_id = ?' +
        ' AND valid_until > NOW()',
        [sessionId]
    );
    conn.release();

    // No session
    if (getSessionResult[0] === undefined) {
        return undefined;
    }
    const dbSession = getSessionResult[0];
    const session: Session = {
        sessionId: dbSession.session_id,
        validUntil: dbSession.valid_until,
        user: await getUserById(dbSession.user_id),
        organizationId: dbSession.organization_id,
    };
    sessionCache[sessionId] = session;

    return session;
}

export async function insertSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cantropee.sessions' +
        ' (session_id, valid_until, user_id, organization_id)' +
        ' VALUES (?,?,UUID_TO_BIN(?),UUID_TO_BIN(?))',
        [
            session.sessionId,
            session.validUntil,
            session.user.id,
            session.organizationId,
        ]
    );
    conn.release();

    let success = result.affectedRows > 0;
    if (success) {
        sessionCache[session.sessionId] = session;
    }

    return success;
}

export async function updateSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [updateSessionResult] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.sessions' +
        ' SET organization_id = ?' +
        ' WHERE session_id = ?',
        [
            session.organizationId,
            session.sessionId,
        ]
    );
    conn.release();

    let success = updateSessionResult.affectedRows > 0;
    if (success) {
        sessionCache[session.sessionId] = session;
    }

    return success;
}

export async function updateSessionCache(session: Session) {
    sessionCache[session.sessionId] = session;
}

export async function revalidateSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [updateSessionResult] = await conn.execute<ResultSetHeader>(
        'UPDATE cantropee.sessions' +
        ' SET valid_until = ?' +
        ' WHERE session_id = ?',
        [
            session.validUntil,
            session.sessionId,
        ]
    );
    conn.release();

    let success = updateSessionResult.affectedRows > 0;
    if (success) {
        sessionCache[session.sessionId] = session;
    }

    return success;
}

export async function deleteSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [updateSessionResult] = await conn.execute<ResultSetHeader>(
        'DELETE FROM cantropee.sessions WHERE session_id = ?',
        [session.sessionId]
    );
    conn.release();

    let success = updateSessionResult.affectedRows > 0;
    if (success) {
        delete sessionCache[session.sessionId];
    }

    return success
}
