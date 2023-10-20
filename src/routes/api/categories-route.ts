import express from 'express';
import {getCategories} from "../../services/categories-service";

export const categoriesRouter = express.Router();


categoriesRouter.get('/', async (_req, res) => {
    const categories = await getCategories();
    res.send(categories);
});

