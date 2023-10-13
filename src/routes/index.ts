import express from 'express';
import {getCurrentTotal} from "../services/transaction-service";

export const indexRouter = express.Router();


indexRouter.get('/', async (_req, res) => {
    let data = await getCurrentTotal();
    
    res.render('index', {title: 'cantropee', data});
});

