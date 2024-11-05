'use strict';
import axios from 'axios';
import {
  BASE_API_URL,
  NABLE_API_KEY,
  NABLE_DIST_ID,
  NABLE_SERVICE_ID,
} from './Utils/variables.js';
import { getAccessToken } from './getCloudmoreToken.js';
//Först skapar vi en funktion som hämtar alla fakturalinjer från Nable
//Därefter loopar igenom alla fakturonummer och hämtar detaljer för varje faktura
//Kolla efter DistributorInternalSfdcAccountId om inte är null, använd "ContractId" för nästa API reqeust.
//Ny request mot cloudmore för att hämta alla organisationer för att matcha ClientId
//Uppdatera manualbilling för organisationen

//1. Hämta alla fakturalinjer från Nable
export const getNableBillingLines = async (billingDate) => {
  try {
    const nableInvoicesRes = await axios.post(
      `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/Invoices/${NABLE_DIST_ID}/${billingDate}`,
      {},
      {
        headers: {
          'x-api-key': `${NABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const nableInvoices = nableInvoicesRes.data[0]?.Invoices;

    //2) Därefter loopar igenom alla fakturonummer och hämtar detaljer för varje faktura
    for (const nableInvoice of nableInvoices) {
      const nableInvoiceId = nableInvoice.InvoiceId;
      const detailRes = await axios.post(
        `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/InvoiceDetails/${NABLE_DIST_ID}/${nableInvoiceId}`,
        {},
        {
          headers: {
            'x-api-key': `${NABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const nableInvoiceDetailsContracts = detailRes.data?.Contracts;

      //Acessing the DistributorInternalSfdcAccountId and use the id for api call
      for (const contract of nableInvoiceDetailsContracts) {
        const resellerId = contract.DistributorInternalSfdcAccountId;
        const nableMspId = contract.ContractId;
        // console.log('this is Organization ID', clientId);

        // If no reseller id, skip to next contract
        if (!resellerId) {
          continue;
        }

        // Fetch clients for reseller to enable fetching client details
        const nableClientRes = await axios.post(
          `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/UsageDetailsDevices/${NABLE_DIST_ID}/${billingDate}/${nableMspId}`,
          {},
          {
            headers: {
              'x-api-key': `${NABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const nableOrganizationClientsContract = nableClientRes.data;
        const nableBpAccountId = `${nableOrganizationClientsContract.BpAccountId}`;
        const nableOrganizationClients =
          nableOrganizationClientsContract?.Clients;

        console.log(nableOrganizationClients);
        console.log(nableClientRes.data);

        // Store found nable subscription id that belongs to bp account id in invoice
        let foundCommittedChargesNableSubId = null;

        // Create map for easier lookup of nable organization clients
        const clientMap = new Map();
        for (const client of nableOrganizationClients) {
          clientMap.set(client.ClientId.toString(), client);
        }

        // Fetch CL access token
        const accessToken = await getAccessToken();

        // Fetch CL organizations for reseller to enable fetching organization details
        const clOrganizationRes = await axios.get(
          `${BASE_API_URL}/api/resellers/${resellerId}/organizations`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const clOrganizations = clOrganizationRes.data;

        // Loop through CL orgs to fetch details and process data
        for (const clOrganization of clOrganizations) {
          const clOrgDetailRes = await axios.get(
            `${BASE_API_URL}/api/resellers/${resellerId}/Organizations/${clOrganization.id}`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          const customProperties = clOrgDetailRes.data.customProperties;

          // Find custom properties for nable subscription id, bp account id and client id
          let nableSubId, clNableBpAccountId, nableClientId;
          for (const customProperty of customProperties) {
            switch (customProperty.name) {
              case 'Nable_subscription_id':
                nableSubId = customProperty.value;
                break;
              case 'Nable_BpAccountId':
                clNableBpAccountId = customProperty.value;
                break;
              case 'Nable_Client_Id':
                nableClientId = customProperty.value;
                break;
            }
            if (nableSubId && clNableBpAccountId && nableClientId) {
              break;
            }
          }

          // If nable subscription id and bp account id match
          if (
            clNableBpAccountId &&
            nableBpAccountId &&
            clNableBpAccountId === nableBpAccountId
          ) {
            foundCommittedChargesNableSubId = nableSubId;
          }

          // If no nable subscription id or client id, skip to next organization
          if (!nableClientId || !nableSubId) {
            continue;
          }

          const clientMatch = clientMap.get(nableClientId);

          console.log('this is the client match', clientMatch);
          console.log('this is the nableClientId', nableClientId);
          console.log('this is the nableSubId', nableSubId);

          if (clientMatch) {
            //Uppdatera manualbilling för organisationen
            for (const device of clientMatch.Devices) {
              for (const service of device.TotalByService) {
                const body = {
                  // billingDate: new Date().toISOString(),
                  billingDate: '2024-11-04',
                  serviceId: NABLE_SERVICE_ID,
                  subscriptionId: nableSubId,
                  quantity: service.Quantity,
                  costPrice: service.Price,
                  salesPrice: service.Price,
                  note: service.BillingServiceName,
                };
                console.log('this is the body', body);

                // await manualBillingLines(resellerId, clOrganization.id, body);
              }
            }
          }
        }

        if (!foundCommittedChargesNableSubId) {
          continue;
        }
        for (const committedCharge of nableOrganizationClientsContract.CommittedCharges) {
          const body = {
            billingDate: '2024-11-04',
            serviceId: NABLE_SERVICE_ID,
            subscriptionId: foundCommittedChargesNableSubId,
            quantity: committedCharge.Quantity,
            costPrice: committedCharge.Price,
            salesPrice: committedCharge.Price,
            note: committedCharge.BillingServiceName,
          };
          console.log('this is the committedCharge body', body);

          // await manualBillingLines(resellerId, clOrganization.id, body);
        }
      }
    }
  } catch (error) {
    console.log('Error in getNableBillingLines:', error);
  }
};

const manualBillingLines = async (resellerId, organizationId, body) => {
  const accessToken = await getAccessToken();
  const result = await axios.post(
    `${BASE_API_URL}/api/resellers/${resellerId}/organizations/${organizationId}/manualbilling`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  console.log('this is the result', result);
};

getNableBillingLines(202410);
