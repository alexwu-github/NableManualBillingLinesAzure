'use strict';

import axios from 'axios';
import {
  BASE_API_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  CLIENT_USERNAME,
  PASSWORD,
  API_SECRET,
} from './Utils/variables.js';

// Initialize the access token empty string
let accessToken = null;

//Get Access Token
export const getAccessToken = async () => {
  // If the access token is already set, return
  if (accessToken) {
    return accessToken;
  }
  // Make a POST request to get the access token
  try {
    const params = new URLSearchParams({
      grant_type: 'password',
      username: CLIENT_USERNAME,
      password: PASSWORD,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'api',
    });
    const response = await axios.post(`${BASE_API_URL}/connect/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${API_SECRET}`,
      },
    });
    if (!response.data.access_token) {
      throw new Error('Access token not found in response data');
    }
    accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error(`Error getting access token: ${error}`, error);
  }
};
