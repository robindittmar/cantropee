import express from 'express';
import {getCategories} from "../services/categories-service";
import {getSessionFromReq} from "../services/session-service";

export const categoriesRouter = express.Router();


categoriesRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const categories = await getCategories(session.organization.id);
        res.send(categories);
    } catch (err) {
        next(err);
    }
});

