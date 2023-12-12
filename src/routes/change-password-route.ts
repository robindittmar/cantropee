import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {updateUserPassword} from "../services/user-service";
import {ServerError} from "../core/server-error";

export const changePasswordRouter = express.Router();


changePasswordRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {password} = req.body;
        if (!password || typeof password !== 'string') {
            throw new ServerError(400, 'field "password" is missing or not a string');
        }

        let success = await updateUserPassword(session.user, password);
        if (!success) {
            res.status(400);
        }

        res.send({success: success});
    } catch (err) {
        next(err);
    }
});
