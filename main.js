'use strict';
import { getNableBillingLines } from './src/getNableBillingLines.js';

// import { app } from '@azure/functions';

// app.setup({
//   enableHttpStream: true,
// });

export const main = async (context, myTimer) => {
  getNableBillingLines(202409);
};

main();
