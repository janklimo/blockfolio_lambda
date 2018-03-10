'use strict';

const axios = require('axios');

const getBlockfolioToken = bearerToken => {
  const url = "https://blockfolio-server.herokuapp.com/api/v1/credentials/me";

  return new Promise((resolve, reject) => {
    axios.get(url, { headers: { 'Authorization': `Bearer ${bearerToken}` } })
      .then(response => {
        resolve(response.data.data.attributes.blockfolio_token);
      })
      .catch(error => {
        reject(error.response.status);
      });
  });
}

exports.getBalance = bearerToken => {
  return getBlockfolioToken(bearerToken).then(blockfolioToken => {
    const url = `https://api-v0.blockfolio.com/rest/get_all_positions/${blockfolioToken}`;

    return new Promise((resolve, reject) => {
      axios.get(url)
        .then(response => {
          resolve(response.data.portfolio.fiatValue.toFixed());
        }).catch(error => {
          reject(error.response.status);
        });
    });
  });
}

exports.getDailyProfit = bearerToken => {
  return getBlockfolioToken(bearerToken).then(blockfolioToken => {
    const url = `https://api-v0.blockfolio.com/rest/get_all_positions/${blockfolioToken}`;

    return new Promise((resolve, reject) => {
      axios.get(url)
        .then(response => {
          resolve(response.data.portfolio.twentyFourHourChangeFiat.toFixed());
        })
        .catch(error => {
          reject(error.response.status);
        });
    });
  });
}
