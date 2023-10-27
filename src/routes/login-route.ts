import express from 'express';
import {login} from "../services/login-service";

export const loginRouter = express.Router();


loginRouter.get('/', async (_req, res, next) => {
    try {
        res.sendFile('views/login.html', {root: process.cwd()});
    } catch (err) {
        next(err);
    }
});

loginRouter.post('/', async (req, res, next) => {
    try {
        if (!('email' in req.body)) {
            throw new Error('email must be provided for login');
        }
        if (!('password' in req.body)) {
            throw new Error('password must be provided for login');
        }

        let redirectUri = '/';
        if (typeof (req.query['redirect']) === 'string') {
            redirectUri = req.query['redirect'];
        }

        let {success, sessionId, changePassword} = await login(req.body['email'], req.body['password']);
        if (changePassword) {
            redirectUri = `/change-password?redirect=${redirectUri}`;
        }
        if (success) {
            res.cookie('sid', sessionId);
            res.redirect(redirectUri);
        } else {
            res.status(403);
            res.redirect('/login');
        }
    } catch (err) {
        next(err);
    }
});
