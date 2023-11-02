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

        const org = session.user.organizations.find(o => o.id === orgId);
        if (org) {
            session.organization = org;
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
