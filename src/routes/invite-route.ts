import express from 'express';
import {createInvite, useInvite, validateInvite} from "../services/invite-service";
import {getSessionFromReq} from "../services/session-service";
import {ServerError} from "../core/server-error";
import {badRequest, badRequestMissingField} from "../core/response-helpers";
import {VALID_CURRENCIES} from "../core/currency";
import {validateEmail} from "../core/validate-helper";

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
            currency,
            useTaxes,
            email,
            password,
        } = req.body;

        if (!inviteId || typeof inviteId !== 'string') {
            badRequestMissingField(res, 'inviteId');
            return;
        }
        if (!organization || typeof organization !== 'string') {
            badRequestMissingField(res, 'organization');
            return;
        }
        if (!currency || typeof currency !== 'string') {
            badRequestMissingField(res, 'currency');
            return;
        }
        if (typeof useTaxes !== 'boolean') {
            badRequestMissingField(res, 'useTaxes');
            return;
        }
        if (!email || typeof email !== 'string') {
            badRequestMissingField(res, 'email');
            return;
        }
        if (!password || typeof password !== 'string') {
            badRequestMissingField(res, 'password');
            return;
        }

        if (!validateEmail(email)) {
            badRequest(res, `${email} is not a valid e-mail`);
        }
        if (!VALID_CURRENCIES.includes(currency)) {
            badRequest(res, `${currency} is not a valid currency`);
            return;
        }

        await useInvite(inviteId, organization, currency, useTaxes, email, password);
        res.send({success: true});
    } catch (err) {
        next(err);
    }
});
