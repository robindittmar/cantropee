import 'reflect-metadata';
import dotenv from 'dotenv';

const conf = dotenv.config();

import logger from 'morgan';
import express, {Request, Response, NextFunction} from 'express';
import cookieParser from "cookie-parser";
import {ServerError} from "./core/server-error";
import {validateSession} from "./services/session-service";
import {AppDataSource} from "./core/database";
import {housekeep} from "./services/housekeep-service";
import {loginRouter} from "./routes/login-route";
import {logoutRouter} from "./routes/logout-route";
import {changePasswordRouter} from "./routes/change-password-route";
import {organizationRouter} from "./routes/organization-route";
import {transactionsRouter} from "./routes/transactions-route";
import {recurringTransactionsRouter} from "./routes/recurring-transactions-route";
import {categoriesRouter} from "./routes/categories-route";
import {rolesRouter} from "./routes/roles-route";
import {usersRouter} from "./routes/users-route";
import {exportRouter} from "./routes/export-route";
import {sessionRouter} from "./routes/session-route";
import {inviteRouter} from "./routes/invite-route";


async function main() {
    console.log(`$ initializing with ${JSON.stringify(conf.parsed)}`);

    await AppDataSource.initialize();
    await housekeep();

    const app = express();
    const port = parseInt(process.env['SERVER_PORT'] ?? '3000');
    const loggerFormat = process.env['NODE_ENV'] === 'production' ? 'short' : 'dev';

    app.use(logger(loggerFormat));
    app.use(express.json());
    app.use(cookieParser());
    app.use(validateSession);

    app.use('/api/login', loginRouter);
    app.use('/api/logout', logoutRouter);
    app.use('/api/change-password', changePasswordRouter);
    app.use('/api/organization', organizationRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/transactions', transactionsRouter);
    app.use('/api/recurring', recurringTransactionsRouter);
    app.use('/api/roles', rolesRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/session', sessionRouter);
    app.use('/api/export', exportRouter);
    app.use('/api/invite', inviteRouter);

    app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            return next(err);
        }

        console.error(err);
        if (err instanceof ServerError) {
            let serverError = err as ServerError;
            res.status(serverError.statusCode).send({
                success: false,
                code: serverError.statusCode,
                message: serverError.message,
            });
        } else {
            res.status(500).send({
                success: false,
                code: 500,
                message: 'Internal Server Error',
            });
        }
    });

    app.listen(port, () => {
        console.log(`$ server listening on http://localhost:${port}`);
    });
}

main()
    .catch(e => console.error(e));
