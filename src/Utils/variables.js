import dotenv from 'dotenv';

if (process.env.ENVIRONMENT !== 'production') {
  dotenv.config();
}

//Cloudmore
export const BASE_API_URL = process.env.BASEAPIURL;
export const SELLER_ID = process.env.SELLERID;
export const CLIENT_ID = process.env.CLIENT_ID;
export const CLIENT_SECRET = process.env.CLIENT_SECRET;
export const CLIENT_USERNAME = process.env.CLIENT_USERNAME;
export const PASSWORD = process.env.PASSWORD;
export const API_SECRET = process.env.APISECRET;

//Usecure
export const USECURE_API_URL = process.env.USECURE_API_URL;
export const USECURE_API_KEY = process.env.USECURE_API_KEY;

//NABLE
export const NABLE_API_KEY = process.env.NABLE_API_KEY;
export const NABLE_SERVICE_ID = process.env.NABLE_SERVICE_ID;
export const NABLE_DIST_ID = process.env.NABLE_DIST_ID;
export const NABLE_API_URL = process.env.NABLE_API_URL;

//USER
export const CM_PASSWORD_WEBHOOK = process.env.CM_PASSWORD_WEBHOOK;
