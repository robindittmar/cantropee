import express from 'express';
import {createInvite} from "../services/invite-service";

export const inviteRouter = express.Router();

inviteRouter.post('/', async (_req, res, _next) => {
    const invite = await createInvite();
    res.send(invite);
});

