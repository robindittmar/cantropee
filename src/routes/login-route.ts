import express from 'express';
import {login} from "../services/login-service";
import {badRequest} from "../core/response-helpers";

export const loginRouter = express.Router();


loginRouter.post('/', async (req, res, next) => {
    try {
        const {email, password, permanentSession} = req.body;

        if (!email || typeof email !== 'string') {
            badRequest(res, 'email');
            return;
        }
        if (!password || typeof password !== 'string') {
            badRequest(res, 'password');
            return;
        }
        if (permanentSession && typeof permanentSession !== 'boolean') {
            badRequest(res, 'permanentSession');
            return;
        }

        let result = await login(email, password, permanentSession ?? false);
        if (result.success) {
            res.cookie('sid', result.sessionId, {
                secure: true,
                httpOnly: true,
                sameSite: 'strict',
            });
            res.send(result);
        } else {
            res.status(403);
            res.send({success: false});
        }
    } catch (err) {
        next(err);
    }
});
