import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {updateUserPassword} from "../services/user-service";
import {ServerError} from "../core/server-error";

export const changePasswordRouter = express.Router();


changePasswordRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {password, confirmPassword} = req.body;

        if (!password) {
            throw new ServerError(400, 'field "password" is missing in request body');
        }
        if (!confirmPassword) {
            throw new ServerError(400, 'field "confirmPassword" is missing in request body');
        }

        if (password !== confirmPassword) {
            throw new ServerError(400, 'passwords do not match');
        }

        let success = await updateUserPassword(session.user, req.body.password);
        if (!success) {
            res.status(400);
        }

        res.send({success: success});
    } catch (err) {
        next(err);
    }
});
