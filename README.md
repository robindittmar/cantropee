# cantropee

cantropee is a finance web application for managing multiple virtual accounts.

The `cantropee` component in this repository is the backend used by the `cantropee-frontend` component, providing an
HTTP api using [Node.js](https://nodejs.org) and [express](https://expressjs.com/).

## Running

### Local

```shell
npm install
npx tsc
node ./dist/server.js
```

### In production

The intended way to run this api is using [Docker](https://www.docker.com/).

Build using

```shell
docker build -t cantropee .
```

And run using

```shell
doc-ker run -d \
  --name cantropee \
  --restart unless-stopped \
  cantropee
```
