import express from 'express';
import {createInvite, useInvite, validateInvite} from "../services/invite-service";
import {getSessionFromReq} from "../services/session-service";
import {ServerError} from "../core/server-error";

export const inviteRouter = express.Router();

inviteRouter.post('/', async (req, res, _next) => {
    const session = getSessionFromReq(req);

    if (!session.user.settings.canCreateInvite) {
        throw new ServerError(403, 'User not allowed to create invites');
    }

    const invite = await createInvite(session.user.id);
    res.send(invite);
});

inviteRouter.post('/validate', async (req, res, next) => {
    try {
        const {inviteId} = req.body;
        if (!inviteId || typeof inviteId !== 'string') {
            throw new ServerError(400, 'inviteId parameter is not string');
        }

        const valid = await validateInvite(inviteId);
        res.send({valid});
    } catch (err) {
        next(err);
    }
});

inviteRouter.post('/use', async (req, res, next) => {
    try {
        const {
            inviteId,
            organization,
            useTaxes,
            email,
            password,
        } = req.body;

        console.log(req.body);
        console.log(useTaxes);

        if (!inviteId || typeof inviteId !== 'string') {
            throw new ServerError(400, 'inviteId parameter is not string');
        }
        if (!organization || typeof organization !== 'string') {
            throw new ServerError(400, 'organization parameter is not string');
        }
        if (!useTaxes || typeof useTaxes !== 'boolean') {
            throw new ServerError(400, 'useTaxes parameter is not boolean');
        }
        if (!email || typeof email !== 'string') {
            throw new ServerError(400, 'email parameter is not string');
        }
        if (!password || typeof password !== 'string') {
            throw new ServerError(400, 'password is not string');
        }

        await useInvite(inviteId, organization, useTaxes, email, password);
        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
