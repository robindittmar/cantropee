import {randomUUID} from "crypto";
import * as bcrypt from 'bcrypt';
import {getUserByEmail} from "./user-service";
import {Session, insertSession} from "./session-service";


export async function login(email: string, password: string, permanentSession: boolean = false): Promise<{
    success: boolean,
    sessionId: string,
    changePassword: boolean
}> {
    try {
        const [user, hash, changePassword] = await getUserByEmail(email);

        if (await bcrypt.compare(password, hash)) {
            let validUntil = new Date();
            if (permanentSession) {
                validUntil.setFullYear(validUntil.getFullYear() + 1);
            } else {
                validUntil.setHours(validUntil.getHours() + 1);
            }

            let org = user.organizations.find((o) => o.id === user.settings.defaultOrganization) ?? user.organizations[0];
            if (!org) {
                throw new Error('User has no organization');
            }

            let session: Session = {
                sessionId: randomUUID() + randomUUID() + randomUUID() + randomUUID(),
                validUntil,
                user,
                organization: org,
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



