import express from 'express';
import {getSessionFromReq} from "../../services/session-service";
import {getAllTransactions} from "../../services/transaction-service";
import * as fs from "fs/promises";

export const exportRouter = express.Router();


exportRouter.get('/', async (req, res, next) => {
    try {
        const session = getSessionFromReq(req);

        const transactions = await getAllTransactions(session.organizationId);
        const filename = `export-${new Date().toISOString()}-${session.organizationId}.json`;

        await fs.writeFile(`./static/${filename}`, JSON.stringify(transactions));
        res.download(`./static/${filename}`);
    } catch (err) {
        next(err);
    }
});

