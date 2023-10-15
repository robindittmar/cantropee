import express from 'express';
import {getCurrentBalance, getTransactions} from "../../services/transaction-service";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (req, res) => {
    let {start, count} = req.query;
    if (typeof start !== 'string') {
        throw new Error('start must be string');
    }
    if (typeof count !== 'string') {
        throw new Error('offset must be string');
    }

    let startInt = parseInt(start);
    let offsetInt = parseInt(count);

    let result = await getTransactions(new Date(1970, 1, 1), startInt, offsetInt);
    res.send(result);
});

transactionsRouter.get('/balance', async (_req, res) => {
    let result = await getCurrentBalance();
    res.send(result);
});
