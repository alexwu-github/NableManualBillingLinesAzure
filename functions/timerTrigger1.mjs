import { app } from '@azure/functions';
import { main } from '../main.mjs';

app.timer('timerTrigger1', {
  schedule: '*/5 * * * *',
  handler: async (myTimer, context) => {
    context.log('Timer function ran!');
    await main(context, myTimer);
  },
});
