'use strict';

import { get } from '@azure/functions/types/app';

// import { app } from '@azure/functions';

// app.setup({
//   enableHttpStream: true,
// });

export const main = async (context, myTimer) => {
  getNableBillingLines();
};
