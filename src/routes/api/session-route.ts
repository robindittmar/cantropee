import express from 'express';
import {getSessionFromReq, updateSession} from "../../services/session-service";

export const sessionRouter = express.Router();


sessionRouter.put('/organization', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        if (!('organizationId' in req.body)) {
            throw new Error('Must provide organizationId to update session');
        }
        const orgId = req.body.organizationId;
        let validOrg = false;

        for (const org of session.user.organizations) {
            if (orgId === org.id) {
                validOrg = true;
                break;
            }
        }

        if (validOrg) {
            session.organizationId = orgId;
            let result = await updateSession(session);
            if (!result) {
                res.status(404);
            }
            res.send();
        } else {
            res.status(404);
            res.send();
        }
    } catch (err) {
        next(err);
    }
});
