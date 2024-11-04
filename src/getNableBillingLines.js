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
    const res = await axios.post(
      `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/Invoices/${NABLE_DIST_ID}/${billingDate}`,
      {},
      {
        headers: {
          'x-api-key': `${NABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const invoiceList = res.data[0];

    //2) Därefter loopar igenom alla fakturonummer och hämtar detaljer för varje faktura
    //For loop invoiceId
    for (const invoiceId of invoiceList.Invoices) {
      const detailRes = await axios.post(
        `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/InvoiceDetails/${NABLE_DIST_ID}/${invoiceId.InvoiceId}`,
        {},
        {
          headers: {
            'x-api-key': `${NABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const invoiceDetails = detailRes.data;
      //Acessing the DistributorInternalSfdcAccountId and use the id for api call
      for (const contract of invoiceDetails.Contracts) {
        const resellerId = contract.DistributorInternalSfdcAccountId;
        const nableMspId = contract.ContractId;
        // console.log('this is Organization ID', clientId);
        if (resellerId !== null) {
          //new api call here!!!
          const clientRes = await axios.post(
            `https://prod-nableboomi.n-able.com:443/ws/rest/V2/Channel_UP_API/UsageDetailsDevices/${NABLE_DIST_ID}/${billingDate}/${nableMspId}`,
            {},
            {
              headers: {
                'x-api-key': `${NABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const organizationClients = clientRes.data?.Clients;
          console.log(organizationClients);
          console.log(clientRes.data);

          //Ny request mot cloudmore för att hämta alla organisationer för att matcha ClientId
          const accessToken = await getAccessToken();
          const getOrganization = await axios.get(
            `${BASE_API_URL}/api/resellers/${resellerId}/organizations`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          //Loopar igenom alla orgar för att hämta custom properties
          const organizations = getOrganization.data;
          for (const organization of organizations) {
            const resOrg = await axios.get(
              `${BASE_API_URL}/api/resellers/${resellerId}/Organizations/${organization.id}`,
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            const customProperties = resOrg.data.customProperties;
            const nableSubId = customProperties.find(
              (customProperty) =>
                customProperty.name === 'Nable_subscription_id'
            );
            const nableClientId = customProperties.find(
              (customProperty) => customProperty.name === 'Nable_Client_Id'
            );
            if (!!nableSubId && !!nableClientId) {
              const clientMatch = clientRes.data.Clients.find(
                (client) => client.ClientId.toString() === nableClientId.value
              );
              console.log('this is the client match', clientMatch);
              console.log('this is the nableClientId', nableClientId);
              console.log('this is the nableSubId', nableSubId);
              if (clientMatch) {
                //Uppdatera manualbilling för organisationen
                for (const device of clientMatch.Devices) {
                  for (const service of device.TotalByService) {
                    const body = {
                      // billingDate: new Date().toISOString(),
                      billingDate: '2024-10-28',
                      serviceId: NABLE_SERVICE_ID,
                      subscriptionId: nableSubId.value,
                      quantity: service.Quantity,
                      costPrice: service.Price,
                      salesPrice: service.Price,
                      note: service.BillingServiceName,
                    };
                    console.log('this is the body', body);
                    // const result = await axios.post(
                    //   `${BASE_API_URL}/api/resellers/${resellerId}/organizations/${organization.id}/manualbilling`,
                    //   body,
                    //   {
                    //     headers: {
                    //       'Content-Type': 'application/json',
                    //       Authorization: `Bearer ${accessToken}`,
                    //     },
                    //   }
                    // );
                    // console.log('this is the result', result);
                    if (!!clientRes.data.CommittedCharges) {
                      const body = {
                        billingDate: '2024-10-28',
                        serviceId: NABLE_SERVICE_ID,
                        subscriptionId: nableSubId.value,
                        quantity: clientRes.data.CommittedCharges.Quantity,
                        costPrice: clientRes.data.CommittedCharges.Price,
                        salesPrice:
                          clientRes.data.CommittedCharges.service.Price,
                        note: clientRes.data.CommittedCharges
                          .BillingServiceName,
                      };
                      console.log('this is the body2', body);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('Error in getNableBillingLines:', error);
  }
};
getNableBillingLines(202409);
