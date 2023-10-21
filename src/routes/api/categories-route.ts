import express from 'express';
import {getCategories} from "../../services/categories-service";
import {getSessionFromReq} from "../../services/login-service";

export const categoriesRouter = express.Router();


categoriesRouter.get('/', async (req, res) => {
    const session = getSessionFromReq(req);

    const categories = await getCategories(session.organizationId);
    res.send(categories);
});

