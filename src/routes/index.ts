import express from 'express';
import {getCurrentBalance} from "../services/transaction-service";

export const indexRouter = express.Router();


indexRouter.get('/', async (_req, res) => {
    let data = await getCurrentBalance();

    res.render('index', {title: 'cantropee', data});
});

