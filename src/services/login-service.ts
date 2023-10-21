import {Request, Response, NextFunction} from "express";
import {getConnection} from "../core/database";
import {SessionModel} from "../models/session-model";
import {ResultSetHeader} from "mysql2/index";
import {randomUUID} from "crypto";
import * as bcrypt from 'bcrypt';
import {getUserByEmail, getUserById, User} from "./user-service";

interface RequestWithSession extends Request {
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

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
    // No login required
    const excludePaths = ['/login', '/public'];
    for (const path of excludePaths) {
        if (req.path.startsWith(path)) {
            next();
            return;
        }
    }

    // No session cookie present
    if (!('sid' in req.cookies)) {
        redirectToLogin(req, res);
        return;
    }

    let sessionId = req.cookies['sid'];
    let session = await getSession(sessionId);
    // No session found
    if (session === undefined) {
        redirectToLogin(req, res);
        return;
    }

    let validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 1);
    session.validUntil = validUntil;
    if (!await updateSession(session)) {
        throw new Error('Could not update session timestamp');
    }

    (req as RequestWithSession).session = session;
    next();
};

export const getSessionFromReq = (req: Request): Session => {
    const session = (req as RequestWithSession).session;
    if (!session) {
        throw new Error('Tried to get session in unsecure endpoint');
    }
    return session;
}

export async function login(email: string, password: string): Promise<{ success: boolean, sessionId: string }> {
    // set password: const passwordHash = await bcrypt.hash(password, 4);

    try {
        const [user, hash] = await getUserByEmail(email);

        if (await bcrypt.compare(password, hash)) {
            let validUntil = new Date();
            validUntil.setHours(validUntil.getHours() + 1);

            let session: Session = {
                sessionId: randomUUID() + randomUUID() + randomUUID() + randomUUID(),
                validUntil,
                user,
                organizationId: user.organizations[0] ?? ''
            };
            if (await insertSession(user.default_organization ?? user.organizations[0] ?? '', session)) {
                return {
                    success: true,
                    sessionId: session.sessionId,
                };
            }
        }
    } catch (err) {
        console.error(err);
    }

    return {
        success: false,
        sessionId: '',
    };
}

function redirectToLogin(req: Request, res: Response) {
    const excludePaths = ['/api', '/secure'];
    for (const path of excludePaths) {
        if (req.path.startsWith(path)) {
            res.status(403);
            res.send();
            return;
        }
    }

    res.redirect(`/login?redirect=${encodeURI(req.path)}`);
}

async function getSession(sessionId: string): Promise<Session | undefined> {
    if (sessionId in sessionCache) {
        const session = sessionCache[sessionId];
        if (session !== undefined && session.validUntil > new Date()) {
            return session;
        }
    }

    const conn = await getConnection();
    const [getSessionResult] = await conn.query<SessionModel[]>(
        'SELECT id, session_id, valid_until, BIN_TO_UUID(user_id) AS user_id, BIN_TO_UUID(organization_id) AS organization_id FROM cantropee.sessions' +
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

async function insertSession(organizationId: string, session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cantropee.sessions' +
        ' (session_id, valid_until, user_id, organization_id)' +
        ' VALUES (?,?,UUID_TO_BIN(?),UUID_TO_BIN(?))',
        [
            session.sessionId,
            session.validUntil,
            session.user.id,
            organizationId,
        ]
    );
    conn.release();

    let success = result.affectedRows > 0;
    if (success) {
        sessionCache[session.sessionId] = session;
    }

    return success;
}

async function updateSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [updateSessionResult] = await conn.execute<ResultSetHeader>(
        'UPDATE `sessions`' +
        ' SET `valid_until` = ?' +
        ' WHERE `session_id` = ?',
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
