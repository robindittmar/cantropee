import express from 'express';
import {deleteSession, getSessionFromReq} from "../services/session-service";

export const logoutRouter = express.Router();


logoutRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let success = await deleteSession(session);
        if (!success) {
            res.status(404);
        }
        res.cookie('sid', '', {
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
        });
        res.send({success: success});
    } catch (err) {
        next(err);
    }
});
