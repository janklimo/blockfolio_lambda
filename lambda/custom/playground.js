const axios = require('axios');

const getToken = (bearerToken) => {
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

const getBalance = (blockfolioToken) => {
  const url = `https://api-v0.blockfolio.com/rest/get_all_positions/${blockfolioToken}`;

  return new Promise((resolve, reject) => {
    axios.get(url)
      .then(response => {
        resolve(response.data.portfolio.fiatValue.toFixed());
      })
      .catch(error => {
        reject(error.response.status);
      });
  });
}

const getDailyProfit = (blockfolioToken) => {
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
}

let timeBeginning;
const token = "ba89d4b34d5d44f2149ed6475ad6d9c1a4a3232eb9e6bf290c8b2064a7a4d5a7"

getToken(token).then(blockfolioToken => {
  // getBalance(blockfolioToken)
  return getDailyProfit(blockfolioToken)
}).then(balance => {
  console.log(balance);
}).catch(err => {
  console.log(err);
})
