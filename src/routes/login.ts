import express from 'express';

export const loginRouter = express.Router();


loginRouter.get('/', async (_req, res) => {
    res.render('login', {title: 'cantropee'});
});

loginRouter.post('/', async (_req, res) => {
    console.log(_req.body);
    res.send({});
});