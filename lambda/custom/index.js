'use strict';

const Alexa = require('alexa-sdk');
const request = require('request');
const APP_ID = "amzn1.ask.skill.e32de1a7-6c49-4842-a156-fec4a1415bc8";

const WELCOME_MESSAGE = 'Welcome to Blockfolio! Ask me about your crypto balances.';
const WELCOME_REPROMPT = 'You can say what\'s my balance.';
const HELP_MESSAGE = 'You can say what\'s my balance, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';


exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

var handlers = {
  'LaunchRequest': function () {
    this.response.speak(WELCOME_MESSAGE).listen(WELCOME_REPROMPT);
    this.emit(':responseReady');
  },

  'SessionEndedRequest' : function() {
    console.log('Session ended with reason: ' + this.event.request.reason);
  },

  'GetCurrentBalanceIntent' : function () {
    let speechOutput;

    getBalance().then((body) => {
      const data = JSON.parse(body);
      let balance = data.portfolio.portfolioValueFiat;
      speechOutput = `Your current balance is ${balance}`;
      this.response.speak(speechOutput);
      this.emit(':responseReady');
    }).catch((err) => {
      speechOutput = 'I\'m sorry. Blockfolio servers are currently down.';
      this.response.speak(speechOutput);
      this.emit(':responseReady');
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
                        "'Alexa, what's my current balance'");
  }
};

const getBalance = () => {
  const url = "https://api-v0.blockfolio.com/rest/get_all_positions/00c9c473b297e87ceab1b8627a3e54b0898804eb4aa72da310c0d444c62d5a44";

  return new Promise((resolve, reject) => {
    request.get(url, (error, res, body) => {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}
