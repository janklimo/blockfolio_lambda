'use strict';

const Alexa = require('alexa-sdk');
const axios = require('axios');

const APP_ID = "amzn1.ask.skill.e32de1a7-6c49-4842-a156-fec4a1415bc8";

const WELCOME_MESSAGE = 'Welcome to Blockfolio! Ask me about your crypto balances.';
const WELCOME_REPROMPT = "Try asking \"What\'s my balance?\" or \"How much did I make today?\".";
const HELP_MESSAGE = "You can try asking \"What\'s my balance\", or you can say exit... What can I help you with?";
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const LINKING_PROMPT = 'Welcome to Blockfolio! Please link your account ' +
  'to use this Skill. I\'ve sent the details to your Alexa App.'

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

var handlers = {
  'LaunchRequest': function () {
    const accessToken = this.event.session.user.accessToken;
    if (accessToken !== undefined) {
      this.emit(':askWithCard', WELCOME_MESSAGE, WELCOME_REPROMPT, 'Welcome',
                `${WELCOME_MESSAGE}\n${WELCOME_REPROMPT}`, imageObject);
    } else {
      this.emit(':tellWithLinkAccountCard', LINKING_PROMPT);
    }
  },

  'SessionEndedRequest' : function() {
    console.log('Session ended with reason: ' + this.event.request.reason);
  },

  'GetCurrentBalanceIntent' : function () {
    let speechOutput;

    const bearerToken = this.event.session.user.accessToken;
    if (bearerToken === undefined) {
      this.emit(':tellWithLinkAccountCard', LINKING_PROMPT);
      return;
    }

    getBalance(bearerToken).then(data => {
      let balance = data.portfolio.fiatValue.toFixed();
      speechOutput = `Your current balance is $${balance}.`;
      this.response.speak(speechOutput);
      this.emit(':responseReady');
    }).catch((err) => {
      handleServersDown(this);
    });
  },

  'GetDailyProfitIntent' : function () {
    let speechOutput;

    const bearerToken = this.event.session.user.accessToken;
    if (bearerToken === undefined) {
      this.emit(':tellWithLinkAccountCard', LINKING_PROMPT);
      return;
    }

    getBalance(bearerToken).then(data => {
      const profit = data.portfolio.twentyFourHourChangeFiat.toFixed();

      if (profit >= 0) {
        speechOutput = `Today you made $${profit}.`;
      } else {
        speechOutput = `Today you lost $${Math.abs(profit)}.`;
      }

      this.response.speak(speechOutput);
      this.emit(':responseReady');
    }).catch(err => {
      handleServersDown(this);
    });
  },

  'AMAZON.StopIntent': function () {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },

  'AMAZON.HelpIntent': function () {
    this.response.speak(HELP_MESSAGE).listen(HELP_REPROMPT);
    this.emit(':responseReady');
  },

  'AMAZON.CancelIntent' : function() {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },

  'Unhandled' : function() {
    this.response.speak("Sorry, I didn't get that. You can try: " +
                        "'Alexa, ask Blockfolio what's my current balance'");
  }
};

const handleServersDown = (self) => {
  let speechOutput = 'I\'m sorry. Blockfolio servers are currently down.';
  self.response.speak(speechOutput);
  self.emit(':responseReady');
}

const imageObject = {
  smallImageUrl: "https://s3-us-west-2.amazonaws.com/blockfolio/bf_108.png",
  largeImageUrl: "https://s3-us-west-2.amazonaws.com/blockfolio/bf_512.png"
}

const getBalance = (bearerToken) => {
  return getToken(bearerToken).then(body => {
    const url = `https://api-v0.blockfolio.com/rest/get_all_positions/${body}`;

    return new Promise((resolve, reject) => {
      axios.get(url)
        .then(response => {
          resolve(response.data);
        })
        .catch(error => {
          reject(error.response.status);
        });
    });
  }).catch(err => {
    reject(err)
  });
};

const getToken = (bearerToken) => {
  const url = "https://blockfolio-server.herokuapp.com/api/v1/credentials/me";

  return new Promise((resolve, reject) => {
    axios.get(url, { headers: { 'Authorization': 'Bearer WOOOOOAH' } })
      .then(response => {
        resolve(response.data);
      })
      .catch(error => {
        reject(error.response.status);
      });
  });
}
