import express from 'express';
import {login} from "../services/login-service";
import {ServerError} from "../core/server-error";

export const loginRouter = express.Router();


loginRouter.post('/', async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email) {
            throw new ServerError(400, 'field "email" is missing in request body');
        }
        if (!password) {
            throw new ServerError(400, 'field "password" is missing in request body');
        }

        let result = await login(email, password);
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
