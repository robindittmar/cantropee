import express from 'express';
import {login} from "../services/login-service";

export const loginRouter = express.Router();


loginRouter.get('/', async (_req, res) => {
    res.render('login', {title: 'cantropee'});
});

loginRouter.post('/', async (req, res) => {
    if (!('password' in req.body)) {
        throw new Error('password must be provided for login');
    }

    let redirectUri = '/';
    if (typeof (req.query['redirect']) === 'string') {
        redirectUri = req.query['redirect'];
    }

    let {success, sessionId} = await login(req.body['password']);
    if (success) {
        res.cookie('sid', sessionId);
        res.redirect(redirectUri);
    } else {
        res.status(403);
        res.redirect('/login');
    }
});
