import express from 'express';
import {getSessionFromReq, updateSession} from "../services/session-service";
import {ServerError} from "../core/server-error";

export const sessionRouter = express.Router();


sessionRouter.put('/organization', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {orgId} = req.body;
        if (!orgId) {
            throw new ServerError(400, 'Field "organizationId" is missing from request body');
        }

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
