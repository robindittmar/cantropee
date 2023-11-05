import express from 'express';
import {getSessionFromReq, updateSessionCache} from "../services/session-service";
import {updateUserSettings} from "../services/user-service";
import {ServerError} from "../core/server-error";

export const usersRouter = express.Router();


usersRouter.get('/me', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);
        let user = {
            ...session.user,
            currentOrganization: session.organization
        };

        res.send(user);
    } catch (err) {
        next(err);
    }
});

usersRouter.post('/me/settings', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const oldSettings = session.user.settings;
        session.user.settings = req.body;

        if (await updateUserSettings(session.user)) {
            updateSessionCache(session);

            res.status(200);
            res.send();
        } else {
            session.user.settings = oldSettings;

            throw new ServerError(500, 'Could not save settings');
        }
    } catch (err) {
        next(err);
    }
});
