import {NextFunction, Request, Response} from "express";
import {AppDataSource} from "../core/database";
import {SessionModel} from "../models/session-model";
import {User, getUserById} from "./user-service";
import {Organization} from "./organization-service";
import {unauthorized} from "../core/response-helpers";
import {MoreThan} from "typeorm";
import {randomUUID} from "crypto";

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
        throw new Error('Tried to get session from within unsecure endpoint');
    }
    return session;
}

export const makeSessionId = (): string => {
    const uuidNoDashes = () => {
        return randomUUID().replace(/-/, '');
    };

    return uuidNoDashes() + uuidNoDashes() + uuidNoDashes() + uuidNoDashes();
};

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/login' || req.path === '/api/invite/use' || req.path === '/api/invite/validate') {
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

    // Only revalidate session when it will run out within 4 hours.
    const now = new Date();
    const minutesLeft = ((session.validUntil.getTime() - now.getTime()) / 60000);
    if (minutesLeft < 240) {
        // TODO: Permanent sessions should actually be increased by 1 year
        let validUntil = now;
        validUntil.setDate(validUntil.getDate() + 1);

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

    const sess = await AppDataSource.manager.findOne(SessionModel, {
        where: {
            session_id: sessionId,
            valid_until: MoreThan(new Date())
        }
    });

    // No session
    if (sess === null) {
        return undefined;
    }
    let user = await getUserById(sess.user_uuid);
    let org = user.organizations.find((o) => o.id === sess.organization_uuid) ?? user.organizations[0];
    if (!org) {
        throw new Error('User has no organization');
    }

    const session: Session = {
        sessionId: sess.session_id,
        validUntil: sess.valid_until,
        user: user,
        organization: org,
    };
    updateSessionCache(session);

    return session;
}

export async function insertSession(session: Session): Promise<boolean> {
    const model = new SessionModel();
    model.session_id = session.sessionId;
    model.valid_until = session.validUntil;
    model.user_uuid = session.user.id;
    model.organization_uuid = session.organization.id;
    await AppDataSource.manager.save(model);

    updateSessionCache(session);
    return true;
}

export async function updateSession(session: Session): Promise<boolean> {
    const model = new SessionModel();
    model.session_id = session.sessionId;
    model.organization_uuid = session.organization.id;
    await AppDataSource.manager.save(model);

    updateSessionCache(session);
    return true;
}

export function updateSessionCache(session: Session) {
    sessionCache[session.sessionId] = session;
}

export async function revalidateSession(session: Session): Promise<boolean> {
    const model = new SessionModel();
    model.session_id = session.sessionId;
    model.valid_until = session.validUntil;
    await AppDataSource.manager.save(model);

    updateSessionCache(session);
    return true;
}

export async function deleteSession(session: Session): Promise<boolean> {
    const model = new SessionModel();
    model.session_id = session.sessionId;
    await AppDataSource.manager.remove(model);

    delete sessionCache[session.sessionId];
    return true;
}
