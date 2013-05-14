"use strict";
/*global describe, it */
var utils = require('../lib/core/utils');
var Twitter = require('../lib/twitter');
var settings = require('./settings');
var jsdom = require('jsdom');
var async = require('async');
var expect = require('chai').expect;
var request = utils.request;
var urlEncode = utils.urlEncode;


var Storage = function () {};

Storage.prototype.put = function(token, secret, cb) {
    this[token] = secret;
    cb();
};

Storage.prototype.get = function(token, cb) {
    cb(null, this[token]);
};

describe('Twitter', function () {
    it('should return', function (done) {
        var service = settings.services.twitter,
            twitter = new Twitter(service.appInfo, settings.callbackUrl),
            authUrl = '';

        twitter.setStorage(new Storage());

        async.waterfall([
            function (cb) {
                twitter.createAuthRequestUrl({}, cb);
            },
            function (url, cb) {
                authUrl = url;
                request({
                    url: url
                }, cb);
            },
            function (res, body, cb) {
                jsdom.env(body, [], cb);
            },
            function (window, cb) {
                var body = urlEncode({
                    'session[username_or_email]': service.username,
                    'session[password]': service.password,
                    oauth_token: window.document.getElementById('oauth_token').getAttribute('value'),
                    authenticity_token: window.document.getElementsByName('authenticity_token').item(0).getAttribute('value')
                });
                console.log(body);
                request({
                    method: 'POST',
                    url: twitter.providerInfo.authUrl,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': body.length,
                        Referer: authUrl
                    },
                    body: body
                }, cb);
            },
            function (res, body, cb) {
                jsdom.env(body, [], cb);
            },
            function (window, cb) {
                var redirectUrl = window.document.getElementsByClassName('maintain-context').item(0).getAttribute('href');

                twitter.exchangeAuthGrant(redirectUrl, {}, cb);
            }
        ], function (err, result) {
            expect(result).to.exist;
            console.log(result);
            done(err);
        });
    });
});
