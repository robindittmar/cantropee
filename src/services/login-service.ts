import {Request, Response, NextFunction} from "express";
import {getConnection} from "../core/database";
import {SessionModel} from "../models/session-model";
import {ResultSetHeader} from "mysql2/index";
import {randomUUID} from "crypto";

interface Session {
    sessionId: string;
    validUntil: Date;
}

let sessionCache: {
    [sessionId: string]: Session;
} = {};

export const requireLogin = async (req: Request, res: Response, next: NextFunction) => {
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
    // Session outdated (only happens when cached session is returned)
    let now = new Date();
    if (session.validUntil < now) {
        delete sessionCache[sessionId];
        redirectToLogin(req, res);
        return;
    }

    let validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 1);
    session.validUntil = validUntil;
    if (!await updateSession(session)) {
        throw new Error('Could not update session timestamp');
    }

    next();
};

export async function login(password: string): Promise<{ success: boolean, sessionId: string }> {
    if (password == 'tom') {
        let validUntil = new Date();
        validUntil.setHours(validUntil.getHours() + 1);

        let session: Session = {
            sessionId: randomUUID(),
            validUntil,
        };
        if (await insertSession(session)) {
            return {
                success: true,
                sessionId: session.sessionId,
            };
        }
    }

    return {
        success: false,
        sessionId: '',
    };
}

function modelToSession(model: SessionModel): Session {
    return {
        sessionId: model.session_id,
        validUntil: model.valid_until,
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
        return sessionCache[sessionId];
    }

    const conn = await getConnection();
    const [getSessionResult] = await conn.query<SessionModel[]>(
        'SELECT * FROM `sessions`' +
        ' WHERE `session_id` = ?' +
        ' AND `valid_until` > NOW()',
        [sessionId]
    );
    conn.release();

    // No session
    if (getSessionResult.length < 1) {
        return undefined;
    }

    // ???
    if (getSessionResult[0] === undefined) {
        throw new Error('Well how did that happen?');
    }

    let session = modelToSession(getSessionResult[0]);
    sessionCache[sessionId] = session;

    return session;
}

async function insertSession(session: Session): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO `sessions`' +
        ' (`session_id`, `valid_until`)' +
        ' VALUES (?, ?)',
        [
            session.sessionId,
            session.validUntil,
        ]
    );
    conn.release();

    return result.affectedRows > 0;
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
