import {randomUUID} from "crypto";
import * as bcrypt from 'bcrypt';
import {getUserByEmail} from "./user-service";
import {Session, insertSession} from "./session-service";


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
                organizationId: user.settings.defaultOrganization ?? user.organizations[0]?.id ?? ''
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



