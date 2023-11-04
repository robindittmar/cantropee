import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {updateUserPassword} from "../services/user-service";

export const changePasswordRouter = express.Router();


changePasswordRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {password, confirmPassword} = req.body;

        if (!password) {
            throw new Error('password must be provided for change-password');
        }
        if (!confirmPassword) {
            throw new Error('confirmPassword must be provided for change-password');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
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
