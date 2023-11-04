import {NextFunction, Request, Response} from "express";
import {ResultSetHeader} from "mysql2";
import {getConnection} from "../core/database";
import {SessionModel} from "../models/session-model";
import {User, getUserById} from "./user-service";
import {Organization} from "./organization-service";

export interface RequestWithSession extends Request {
    session?: Session;
}

export interface Session {
    sessionId: string;
    validUntil: Date;
    user: User;
    organization: Organization;
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

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/login') {
        next();
        return;
    }

    // No session cookie present
    if (!('sid' in req.cookies)) {
        unauthorized(res);
        return;
    }

    let sessionId = req.cookies['sid'];
    let session = await getSession(sessionId);
    // No session found
    if (session === undefined) {
        unauthorized(res);
        return;
    }

    let validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 1);
    if ((validUntil.getTime() - session.validUntil.getTime()) > 900000/*only after 15 mins*/) {
        session.validUntil = validUntil;
        if (!await revalidateSession(session)) {
            throw new Error('Could not update session timestamp');
        }
    }

    (req as RequestWithSession).session = session;
    next();
};

export async function getSession(sessionId: string): Promise<Session | undefined> {
    if (sessionId in sessionCache) {
        const session = sessionCache[sessionId];
        if (session !== undefined && session.validUntil > new Date()) {
            return session;
        }
    }

    const conn = await getConnection();
    const [getSessionResult] = await conn.query<SessionModel[]>(
        'SELECT id, session_id, valid_until, BIN_TO_UUID(user_uuid) AS user_uuid,' +
        '       BIN_TO_UUID(organization_uuid) AS organization_uuid' +
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
    let user = await getUserById(dbSession.user_uuid);
    let org = user.organizations.find((o) => o.id === dbSession.organization_uuid) ?? user.organizations[0];
    if (!org) {
        throw new Error('User has no organization');
    }

    const session: Session = {
        sessionId: dbSession.session_id,
        validUntil: dbSession.valid_until,
        user: await getUserById(dbSession.user_uuid),
        organization: org,
    };
    updateSessionCache(session);

    return session;
}

export async function insertSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cantropee.sessions' +
        ' (session_id, valid_until, user_uuid, organization_uuid)' +
        ' VALUES (?,?,UUID_TO_BIN(?),UUID_TO_BIN(?))',
        [
            session.sessionId,
            session.validUntil,
            session.user.id,
            session.organization.id,
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
        ' SET organization_uuid = UUID_TO_BIN(?)' +
        ' WHERE session_id = ?',
        [
            session.organization.id,
            session.sessionId,
        ]
    );
    conn.release();

    let success = updateSessionResult.affectedRows > 0;
    if (success) {
        updateSessionCache(session);
    }

    return success;
}

export function updateSessionCache(session: Session) {
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

    return success;
}

function unauthorized(res: Response) {
    res.status(401);
    res.send({message: 'Unauthorized'});
}
