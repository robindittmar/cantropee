import express from 'express';
import {getSessionFromReq, updateSessionCache} from "../../services/session-service";
import {updateUserSettings} from "../../services/user-service";

export const usersRouter = express.Router();


usersRouter.get('/me', async (req, res) => {
    const session = getSessionFromReq(req);
    let user = {
        ...session.user,
        currentOrganizationId: session.organizationId
    };

    res.send(user);
});

usersRouter.post('/me/settings', async (req, res) => {
    const session = getSessionFromReq(req);

    const oldSettings = session.user.settings;
    session.user.settings = req.body;

    if (await updateUserSettings(session.user)) {
        updateSessionCache(session);

        res.status(200);
        res.send();
    } else {
        session.user.settings = oldSettings;

        // 400 or 500 actually
        res.status(400);
        res.send();
    }
});
