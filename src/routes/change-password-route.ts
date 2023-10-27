import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {updateUserPassword} from "../services/user-service";

export const changePasswordRouter = express.Router();


changePasswordRouter.get('/', async (_req, res, next) => {
    try {
        res.sendFile('views/change-password.html', {root: process.cwd()});
    } catch (err) {
        next(err);
    }
});

changePasswordRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        if (!('password' in req.body)) {
            throw new Error('password must be provided for changePassword');
        }
        if (!('confirm-password' in req.body)) {
            throw new Error('confirm-password must be provided for changePassword');
        }


        let redirectUri = '/';
        if (typeof (req.query['redirect']) === 'string') {
            redirectUri = req.query['redirect'];
        }

        let success = await updateUserPassword(session.user, req.body.password);

        if (success) {
            res.redirect(redirectUri);
        } else {
            res.status(400);
            res.send();
        }
    } catch (err) {
        next(err);
    }
});
