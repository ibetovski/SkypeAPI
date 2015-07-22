/* 
    I'm messy alright?

    At least it works. (Most of the time)
*/

var EventEmitter2 = require('eventemitter2').EventEmitter2,
    request = require('request').defaults({
        jar: true
    }),
    pakjson = require('./package.json'),
    logger = require('./logger.js'),
    cheerio = require('cheerio'),
    deasync = require('deasync'),
    uuid = require('node-uuid'),
    chalk = require('chalk'),
    fs = require('fs');

var that = null;

var EventEmitter = new EventEmitter2({
    wildcard: true,
    delimiter: ':'
});

var auth = {
    token: null,
    regToken: null,
    endpointId: null
};

var URL = {
    login: 'https://login.skype.com/login?client_id=578134&redirect_uri=https%3A%2F%2Fweb.skype.com',
    ping: 'https://web.skype.com/api/v1/session-ping',
    subscriptions: 'https://client-s.gateway.messenger.live.com/v1/users/ME/endpoints/SELF/subscriptions',
    msgService: 'https://client-s.gateway.messenger.live.com/v1/users/ME/endpoints/%s/presenceDocs/messagingService',
    tokenAuth: 'https://api.asm.skype.com/v1/skypetokenauth',
    endpoints: 'https://client-s.gateway.messenger.live.com/v1/users/ME/endpoints',
    poll: 'https://client-s.gateway.messenger.live.com/v1/users/ME/endpoints/SELF/subscriptions/0/poll',
    chat: 'https://client-s.gateway.messenger.live.com/v1/users/ME/conversations/%s/messages',
    self: 'https://api.skype.com/users/self/profile',
    contacts: 'https://contacts.skype.com/contacts/v1/users/%s/contacts'
};

var subscriptionsObject = {
    channelType: 'httpLongPoll',
    interestedResources: [
        '/v1/users/ME/conversations/ALL/properties',
        '/v1/users/ME/conversations/ALL/messages',
        '/v1/users/ME/contacts/ALL',
        '/v1/threads/ALL'
    ],
    template: 'raw'
};

var registrationObject = {
    id: 'messagingService',
    type: 'EndpointPresenceDoc',
    selfLink: 'uri',
    privateInfo: {
        epname: 'SkypeAPI'
    },
    publicInfo: {
        capabilities: 'video|audio',
        type: 1,
        skypeNameVersion: '908/1.5.116/swx-skype.com',
        nodeInfo: 'xx',
        version: '908/1.5.116'
    }
};

var SkypeAPI = function (dataObject) {
    logger.info('Version', chalk.magenta(pakjson.version), 'running!');
    deasync.sleep(500);
    logger.warn('UNSTABLE BUILD! METHODS MAY CHANGE/STOP WORKING AT ANY TIME!');
    deasync.sleep(500);
    if (!dataObject) {
        logger.fatal('You must pass your authentication data into the SkypeAPI object correctly');
    } else {
        if (!dataObject.username) {
            logger.fatal('Missing login e-mail');
        }
        if (!dataObject.password) {
            logger.fatal('Missing login password');
        }
    }

    that = this;

    performLogin(dataObject);
};


function performLogin(dataObject) {
    var loggingIn = true;
    request(URL.login, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            logger.debug('Received login information');
            $ = cheerio.load(body);
            var etmVal, pieVal;
            $('#etm').val() ? etmVal = $('#etm').val() : logger.fatal('etm error');
            $('#pie').val() ? pieVal = $('#pie').val() : logger.fatal('pie error');

            var postData = {
                username: dataObject.username,
                password: dataObject.password,
                js_time: Date.now(),
                pie: pieVal,
                etm: etmVal
            }

            request.post({
                url: URL.login,
                form: postData
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    logger.debug('Successfully posted auth data')
                    $ = cheerio.load(body);
                    $('input[name=skypetoken]').val() ? auth.token = $('input[name=skypetoken]').val() : logger.fatal('authToken failure');
                    loggingIn = false;
                }
            })
        }
    });
    while (loggingIn) {
        deasync.sleep(100);
    }
    getRegToken();
    sessionKeepAlive();
    setInterval(function () {
        sessionKeepAlive()
    }, 30000);
};

function sessionKeepAlive() {
    try {
        var sessionUUID = uuid.v4();
        logger.debug(chalk.blue('[KEEPALIVE]'), 'Sent');
        request.post({
            url: URL.ping,
            form: {
                sessionId: sessionUUID
            },
            headers: {
                'X-Skypetoken': auth.token
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                logger.debug(chalk.blue('[KEEPALIVE]'), 'Received');
            } else {
                logger.error(error);
            }
        })
    } catch (e) {
        logger.error(e);
    }
};

function getRegToken() {
    request.post({
        url: URL.tokenAuth,
        form: {
            skypetoken: auth.token
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 204) {
            logger.debug('Got ASM cookie');
            request.post({
                url: URL.endpoints,
                form: '{}',
                headers: {
                    'Authentication': 'skypetoken=' + auth.token
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 201) {
                    response.headers['set-registrationtoken'].split(';')[0] ? auth.regToken = response.headers['set-registrationtoken'].split(';')[0] : logger.fatal('RegToken failure');
                    logger.debug('Got RegToken');
                    response.headers['set-registrationtoken'].split('endpointId=')[1] ? auth.endpointId = response.headers['set-registrationtoken'].split('endpointId=')[1] : logger.fatal('endpointId failure');
                    logger.debug('Got endpointId');
                    subscribe();
                } else {
                    logger.error(error);
                }
            });
        } else {
            logger.error(error);
        }
    });
};

function subscribe() {
    request.post({
        url: URL.subscriptions,
        form: JSON.stringify(subscriptionsObject),
        headers: {
            RegistrationToken: auth.regToken,
            'Content-Type': 'application/json'
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            logger.debug('Subscribed to endpoints');
            request.put({
                url: URL.msgService.replace('%s', auth.endpointId),
                form: JSON.stringify(registrationObject),
                headers: {
                    RegistrationToken: auth.regToken,
                    'Content-Type': 'application/json'
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    logger.debug('Registered message service');
                    pollEndpoint();
                } else {
                    logger.error(error);
                }
            })
        } else {
            logger.error(error);
        }
    })
}

function pollEndpoint() {
    setTimeout(function () {
        request.post({
            url: URL.poll,
            headers: {
                RegistrationToken: auth.regToken,
                'Content-Type': 'application/json'
            },
            form: []
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    var pollEvent = JSON.parse(body);
                    for (var i = 0; i < Object.keys(pollEvent['eventMessages']).length; i++) {
                        formatEvent(pollEvent['eventMessages'][i]);
                    }
                } catch (error) {}
            }
            pollEndpoint();
        });
    }, 1000);
}

function formatEvent(e) {
    switch (e.resourceType) {
    case 'NewMessage':
        if (e.resource.messagetype === 'Text' || e.resource.messagetype === 'RichText') {
            e.resource.channel = e.resource.conversationLink.split('/')[e.resource.conversationLink.split('/').length - 1]
            that.emit('Chat', e.resource);
        } else if (e.resource.messagetype === 'Control/LiveState') {
            that.emit('LiveState', e.resource);
        }
        break;
    case 'EndpointPresence':
    case 'UserPresence':
    case 'ConversationUpdate':
    case 'ThreadUpdate':
        that.emit(e.resourceType, e.resource);
        break;
    default:
        logger.error(chalk.red('[UNKNOWN EVENT]'), e);
        break;
    }
};

function sendMessage(channel, message) {
    var messageObject = {
        content: message.toString(),
        messagetype: 'RichText',
        contenttype: 'text',
        clientmessageid: Date.now()
    }
    request.post({
        url: URL.chat.replace('%s', channel),
        headers: {
            RegistrationToken: auth.regToken,
            'Content-Type': 'application/json; charset=utf-8'
        },
        form: JSON.stringify(messageObject)
    }, function (error, response, body) {
        if (error) {
            logger.error(error);
        }
    });
}

SkypeAPI.prototype.sendMessage = function (id, message) {
    sendMessage(id, message);
};

SkypeAPI.prototype.getSelf = function (callback) {
    request({
        url: URL.self,
        headers: {
            'X-Skypetoken': auth.token
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self = JSON.parse(body);
        }
    });
    return self;
};

SkypeAPI.prototype.addListener = function () {
    EventEmitter.addListener.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.on = function () {
    EventEmitter.on.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.onAny = function () {
    EventEmitter.onAny.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.offAny = function () {
    EventEmitter.offAny.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.once = function () {
    EventEmitter.once.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.many = function () {
    EventEmitter.many.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.removeListener = function () {
    EventEmitter.removeListener.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.off = function () {
    EventEmitter.off.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.removeAllListeners = function () {
    EventEmitter.removeAllListeners.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.setMaxListeners = function () {
    EventEmitter.setMaxListeners.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.listeners = function () {
    EventEmitter.listeners.apply(EventEmitter, arguments);
    return this;
};

SkypeAPI.prototype.emit = function () {
    EventEmitter.emit.apply(EventEmitter, arguments);
    return this;
};



module.exports = SkypeAPI;