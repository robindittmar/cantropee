import express from 'express';
import {getSessionFromReq} from "../services/session-service";
import {updateUserPassword} from "../services/user-service";
import {badRequestMissingField} from "../core/response-helpers";

export const changePasswordRouter = express.Router();


changePasswordRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {currentPassword, newPassword} = req.body;
        if (!newPassword || typeof newPassword !== 'string') {
            badRequestMissingField(res, 'newPassword');
            return;
        }

        await updateUserPassword(session.user, newPassword, currentPassword);
        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
