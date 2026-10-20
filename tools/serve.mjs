import { makeServer } from './site.mjs';
import { createFormSubmitNotifier } from '../hosting/message-notifications.mjs';
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const notifyMessage = process.env.CONTACT_NOTIFY_EMAIL ? createFormSubmitNotifier({ recipient: process.env.CONTACT_NOTIFY_EMAIL }) : undefined;
const server=makeServer({ notifyMessage });
server.listen(port,host,()=>console.log(`itsme running at http://localhost:${port}`));
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(()=>process.exit(0)));
