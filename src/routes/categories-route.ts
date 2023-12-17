import express from 'express';
import {deleteCategory, getCategories, insertCategory, updateCategory} from "../services/categories-service";
import {getSessionFromReq} from "../services/session-service";
import {badRequestMissingField, serverError} from "../core/response-helpers";

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

categoriesRouter.post('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {name} = req.body;
        if (!name) {
            badRequestMissingField(res, 'name');
            return;
        }

        const category = {
            id: 0,
            name: name,
        };
        category.id = await insertCategory(session.organization.id, category);

        res.send({
            success: true,
            category: category,
        });
    } catch (err) {
        next(err);
    }
});

categoriesRouter.put('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {id, name} = req.body;
        if (!id) {
            badRequestMissingField(res, 'id');
            return;
        }
        if (!name) {
            badRequestMissingField(res, 'name');
            return;
        }

        const category = {
            id: id,
            name: name,
        };
        if (!await updateCategory(session.organization.id, category)) {
            serverError(res, 'Could not update category');
            return;
        }

        res.send({
            success: true,
            category: category,
        });
    } catch (err) {
        next(err);
    }
});

categoriesRouter.delete('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const {id} = req.body;
        if (!id) {
            badRequestMissingField(res, 'id');
            return;
        }

        const category = {
            id: id,
            name: '',
        };
        if (!await deleteCategory(session.organization.id, category.id)) {
            serverError(res, 'Could not delete category');
            return;
        }

        res.send({
            success: true,
        });
    } catch (err) {
        next(err);
    }
});
