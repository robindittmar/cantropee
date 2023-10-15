import express from 'express';

export const indexRouter = express.Router();


indexRouter.get('/', async (_req, res) => {
    res.render('index', {title: 'cantropee'});
});

