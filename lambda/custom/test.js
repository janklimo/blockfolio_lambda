'use strict'

let expect = require('chai').expect;
let lambdaToTest = require('./index');
let balances = require('../fixtures/balances.json');
let profitableDayData = require('../fixtures/profitable_day.json');
let tokenResponse = require('../fixtures/token.json');
const moxios = require('moxios');

class Context {
  constructor() {
    this.speechResponse = null;
    this.speechError = null;
  }

  succeed(rsp) {
    this.speechResponse = rsp;
    this.done();
  };

  fail(rsp) {
    this.speechError = rsp;
    this.done();
  };
}

let event = {
  session: {
    new: false,
    sessionId: 'session1234',
    attributes: {},
    user: {
      userId: 'usrid123',
      accessToken: 'alegittoken1234'
    },
    application: {
      applicationId: 'amzn1.ask.skill.e32de1a7-6c49-4842-a156-fec4a1415bc8'
    }
  },
  version: '1.0',
  request: {
    intent: {
      slots: {
        SlotName: {
          name: 'SlotName',
          value: 'slot value'
        }
      },
      name: 'intent name'
    },
    type: 'IntentRequest',
    requestId: 'request5678'
  }
};

let eventWithoutToken = {
  session: {
    new: false,
    sessionId: 'session1234',
    attributes: {},
    user: {
      userId: 'usrid123'
    },
    application: {
      applicationId: 'amzn1.ask.skill.e32de1a7-6c49-4842-a156-fec4a1415bc8'
    }
  },
  version: '1.0',
  request: {
    intent: {
      slots: {
        SlotName: {
          name: 'SlotName',
          value: 'slot value'
        }
      },
      name: 'intent name'
    },
    type: 'IntentRequest',
    requestId: 'request5678'
  }
};


const validRsp = (ctx, options) => {
  expect(ctx.speechError).to.be.null;
  expect(ctx.speechResponse.version).to.be.equal('1.0');
  expect(ctx.speechResponse.response).not.to.be.undefined;
  expect(ctx.speechResponse.response.outputSpeech).not.to.be.undefined;
  expect(ctx.speechResponse.response.outputSpeech.type).to.be.equal('SSML');
  expect(ctx.speechResponse.response.outputSpeech.ssml).not.to.be.undefined;
  expect(ctx.speechResponse.response.outputSpeech.ssml).to.match(/<speak>.*<\/speak>/);

  if(options.endSession) {
    expect(ctx.speechResponse.response.shouldEndSession).to.be.true;
    expect(ctx.speechResponse.response.reprompt).to.be.undefined;
  } else {
    expect(ctx.speechResponse.response.shouldEndSession).to.be.false;
    expect(ctx.speechResponse.response.reprompt.outputSpeech).to.be.not.undefined;
    expect(ctx.speechResponse.response.reprompt.outputSpeech.type).to.be.equal('SSML');
    expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/<speak>.*<\/speak>/);
  }
}

const validCard = (ctx, type, title, pattern) => {
  expect(ctx.speechResponse.response.card).not.to.be.undefined;

  if (type === 'Standard') {
    expect(ctx.speechResponse.response.card.title).not.to.be.undefined;
    expect(ctx.speechResponse.response.card.type).to.be.equal('Standard');
    expect(ctx.speechResponse.response.card.text).not.to.be.undefined;
    expect(ctx.speechResponse.response.card.image).not.to.be.undefined;
    expect(ctx.speechResponse.response.card.image.smallImageUrl).to
      .equal('https://s3-us-west-2.amazonaws.com/blockfolio/bf_108.png')
    expect(ctx.speechResponse.response.card.image.largeImageUrl).to
      .equal('https://s3-us-west-2.amazonaws.com/blockfolio/bf_512.png')
    expect(ctx.speechResponse.response.card.text).to.match(pattern);
    expect(ctx.speechResponse.response.card.title).to.eq(title);
  } else if (type === 'Simple') {
    expect(ctx.speechResponse.response.card.title).not.to.be.undefined;
    expect(ctx.speechResponse.response.card.type).to.be.equal('Simple');
    expect(ctx.speechResponse.response.card.content).not.to.be.undefined;
  } else if (type === 'LinkAccount') {
    expect(ctx.speechResponse.response.card.type).to.be.equal('LinkAccount');
  }
}

const stubAndReturn = (data, status) => {
  moxios.install()

  moxios.stubRequest("https://blockfolio-server.herokuapp.com/api/v1/credentials/me", {
    status: 200,
    responseText: tokenResponse
  });

  const blockfolioToken = tokenResponse.data.attributes.blockfolio_token;

  moxios.stubRequest(`https://api-v0.blockfolio.com/rest/get_all_positions/${blockfolioToken}`, {
    status: status,
    responseText: data
  });
}

const validateAccountIsLinked = (ctx, intent) => {
  describe('when the account is not linked', function(){
    before((done) => {
      eventWithoutToken.request.type = intent;
      eventWithoutToken.request.intent = {};
      eventWithoutToken.session.attributes = {};
      ctx.done = done;
      lambdaToTest.handler(eventWithoutToken, ctx);
    });

    it('valid response', () => {
      validRsp(ctx,{ endSession: true });
    });

    it('valid outputSpeech', () => {
      expect(ctx.speechResponse.response.outputSpeech.ssml).to
      .match(/Please link.*I\'ve sent/);
    });

    it('prompts the user with a LinkAccount card', function() {
      validCard(ctx, 'LinkAccount');
    });
  });
}

describe('All intents', () => {
  let ctx = new Context();

  afterEach(() => {
    moxios.uninstall()
  });

  describe('Test LaunchRequest', () => {
    validateAccountIsLinked(ctx, 'LaunchRequest')

    describe('with a valid token', function(){
      before((done) => {
        event.request.type = 'LaunchRequest';
        event.request.intent = {};
        event.session.attributes = {};
        ctx.done = done;
        lambdaToTest.handler(event, ctx);
      });

      it('valid response', () => {
        validRsp(ctx,{ endSession: false });
      });

      it('valid outputSpeech', () => {
        expect(ctx.speechResponse.response.outputSpeech.ssml).to.match(/Welcome/);
      });

      it('valid repromptSpeech', () => {
        expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml)
          .to.match(/Try asking \"What\'s my balance\?\"/);
      });

      it('emits the right card', () => {
        validCard(ctx, 'Standard', 'Welcome', /Welcome.*\nTry asking \"What\'s/);
      });
    });
  });

  describe('Test GetCurrentBalanceIntent', () => {
    validateAccountIsLinked(ctx, 'GetCurrentBalanceIntent')

    describe('with a valid token', function(){
      before((done) => {
        event.request.intent = {};
        event.session.attributes = {};
        event.request.type = 'IntentRequest';
        event.request.intent.name = 'GetCurrentBalanceIntent';
        ctx.done = done;
        stubAndReturn(balances, 200)
        lambdaToTest.handler(event, ctx);
      });

      it('valid response', (done) => {
        moxios.wait(() => {
          validRsp(ctx,{ endSession: true });
          done()
        });
      });

      it('valid outputSpeech with rounded portfolio value', (done) => {
        moxios.wait(() => {
          expect(ctx.speechResponse.response.outputSpeech.ssml)
            .to.match(/current balance is \$28592\./);
          done()
        });
      });

      it('emits the right card', () => {
        validCard(ctx, 'Standard', 'Your current balance',
                  /current balance is \$28592\./);
      });
    });
  });

  describe('Test GetDailyProfitIntent', () => {
    validateAccountIsLinked(ctx, 'GetDailyProfitIntent')

    describe('with a valid token', function(){
      describe('Profitable day', () => {
        before((done) => {
          event.request.intent = {};
          event.session.attributes = {};
          event.request.type = 'IntentRequest';
          event.request.intent.name = 'GetDailyProfitIntent';
          ctx.done = done;
          stubAndReturn(profitableDayData, 200)
          lambdaToTest.handler(event, ctx);
        });

        it('valid response', (done) => {
          moxios.wait(() => {
            validRsp(ctx,{ endSession: true });
            done()
          });
        });

        it('valid outputSpeech with rounded profit value', (done) => {
          moxios.wait(() => {
            expect(ctx.speechResponse.response.outputSpeech.ssml)
              .to.match(/Today you made \$9269\./);
            done()
          });
        });

        it('emits the right card', () => {
          validCard(ctx, 'Standard', 'Your daily profit',
                    /Today you made \$9269\./);
        });
      });

      describe('A bad day', () => {
        before((done) => {
          event.request.intent = {};
          event.session.attributes = {};
          event.request.type = 'IntentRequest';
          event.request.intent.name = 'GetDailyProfitIntent';
          ctx.done = done;
          stubAndReturn(balances, 200)
          lambdaToTest.handler(event, ctx);
        });

        it('valid response', (done) => {
          moxios.wait(() => {
            validRsp(ctx,{ endSession: true });
            done()
          });
        });

        it('valid outputSpeech with rounded loss value', (done) => {
          moxios.wait(() => {
            expect(ctx.speechResponse.response.outputSpeech.ssml)
              .to.match(/Today you lost \$548\./);
            done()
          });
        });

        it('emits the right card', () => {
          validCard(ctx, 'Standard', 'Your daily profit', /Today you lost \$548\./);
        });
      });
    });
  });

  describe('Blockfolio servers are down', () => {
    before((done) => {
      event.request.intent = {};
      event.session.attributes = {};
      event.request.type = 'IntentRequest';
      event.request.intent.name = 'GetDailyProfitIntent';
      ctx.done = done
      stubAndReturn('dummy', 503)
      lambdaToTest.handler(event, ctx)
    });

    it('valid response', (done) => {
      moxios.wait(() => {
        validRsp(ctx,{ endSession: true });
        done()
      });
    });

    it('valid outputSpeech', (done) => {
      moxios.wait(() => {
        expect(ctx.speechResponse.response.outputSpeech.ssml)
          .to.match(/currently down/);
        done()
      });
    });
  });
});
