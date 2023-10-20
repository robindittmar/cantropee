import path from "path";
import dotenv from 'dotenv';
import logger from 'morgan';
import express from 'express';
import cookieParser from "cookie-parser";
import {requireLogin} from "./services/login-service";
import {initDatabaseConnection} from "./core/database";
import {indexRouter} from "./routes/index-route";
import {loginRouter} from "./routes/login-route";
import {transactionsRouter} from "./routes/api/transactions-route";
import {categoriesRouter} from "./routes/api/categories-route";


async function main() {
    let conf = dotenv.config();
    console.log(`$ initializing with ${JSON.stringify(conf.parsed)}`);

    initDatabaseConnection();

    const app = express();
    const port = parseInt(process.env['SERVER_PORT'] ?? '3000');
    const loggerFormat = process.env['NODE_ENV'] === 'production' ? 'short' : 'dev';

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    app.use(logger(loggerFormat));
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use(cookieParser());
    app.use(requireLogin);

    app.use('/public', express.static(path.join(__dirname, '../static/public')));
    app.use('/secure', express.static(path.join(__dirname, '../static/secure')));

    app.use('/', indexRouter);
    app.use('/login', loginRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/transactions', transactionsRouter);

    app.listen(port, () => {
        console.log(`$ server listening on http://localhost:${port}`);
    });
}

main()
    .catch(e => console.error(e));
