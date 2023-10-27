import express from 'express';
import {deleteSession, getSessionFromReq} from "../services/session-service";

export const logoutRouter = express.Router();


logoutRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        let result = await deleteSession(session);
        if (!result) {
            res.status(404);
        }
        res.cookie('sid', '');
        res.redirect('/login');
    } catch (err) {
        next(err);
    }
});
