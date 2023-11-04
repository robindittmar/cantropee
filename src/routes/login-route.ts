import express from 'express';
import {login} from "../services/login-service";

export const loginRouter = express.Router();


loginRouter.post('/', async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email) {
            throw new Error('email must be provided for login');
        }
        if (!password) {
            throw new Error('password must be provided for login');
        }

        let result = await login(req.body['email'], req.body['password']);
        if (result.success) {
            res.cookie('sid', result.sessionId, {
                secure: true,
                httpOnly: true,
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
