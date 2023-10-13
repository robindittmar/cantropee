import express from 'express';
import {getCurrentTotal} from "../../services/transaction-service";

export const transactionsRouter = express.Router();


transactionsRouter.get('/', async (_req, res) => {
    let result = await getCurrentTotal();
    res.send(result);
});

