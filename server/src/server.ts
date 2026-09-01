import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
const version = process.env.APP_VERSION ?? 'v1';
createApp(version).listen(port, () => console.info(`App listening on port ${port}`));
