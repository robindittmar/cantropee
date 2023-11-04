import express from 'express';
import {deleteSession, getSessionFromReq} from "../services/session-service";

export const logoutRouter = express.Router();


logoutRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let result = await deleteSession(session);
        if (!result) {
            res.status(404);
        }
        res.cookie('sid', '', {
            secure: true,
            httpOnly: true,
        });
        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
