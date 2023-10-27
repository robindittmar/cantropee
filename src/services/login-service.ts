import {Request, Response, NextFunction} from "express";
import {randomUUID} from "crypto";
import * as bcrypt from 'bcrypt';
import {getUserByEmail} from "./user-service";
import {Session, RequestWithSession, getSession, insertSession, revalidateSession} from "./session-service";


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
    if (!await revalidateSession(session)) {
        throw new Error('Could not update session timestamp');
    }

    (req as RequestWithSession).session = session;
    next();
};


export async function login(email: string, password: string): Promise<{
    success: boolean,
    sessionId: string,
    changePassword: boolean
}> {
    try {
        const [user, hash, changePassword] = await getUserByEmail(email);

        if (await bcrypt.compare(password, hash)) {
            let validUntil = new Date();
            validUntil.setHours(validUntil.getHours() + 1);

            let session: Session = {
                sessionId: randomUUID() + randomUUID() + randomUUID() + randomUUID(),
                validUntil,
                user,
                organizationId: user.settings.defaultOrganization ?? user.organizations[0] ?? ''
            };
            if (await insertSession(session)) {
                return {
                    success: true,
                    sessionId: session.sessionId,
                    changePassword: changePassword,
                };
            }
        }
    } catch (err) {
        console.error(err);
    }

    return {
        success: false,
        sessionId: '',
        changePassword: false,
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

