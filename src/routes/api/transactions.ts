import express from 'express';
import {getCurrentBalance} from "../../services/transaction-service";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (_req, res) => {
    let result = await getCurrentBalance();
    res.send(result);
});

transactionsRouter.get('/balance', async (_req, _res) => {

});
