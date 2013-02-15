"use strict";
var utils = require('../lib/core/utils');
var Tumblr = require('../lib/tumblr');
var settings = require('./settings');
var jsdom = require('jsdom');
var fs = require('fs');
var async = require('async');
var url = require('url');
var expect = require('chai').expect;

var request = utils.request;
var CookieJar = utils.CookieJar;
var urlEncode = utils.urlEncode;

var Storage = function () {};
Storage.prototype.put = function(token, secret, cb) {
	this[token] = secret;
	cb();
};

Storage.prototype.get = function(token, cb) {
	cb(null, this[token]);
};

describe('Tumblr', function () {
	it('should return', function (done) {
		var service = settings.services.tumblr;
		var tumblr = new Tumblr(service.appInfo, settings.callbackUrl);
		tumblr.setStorage(new Storage());

		var jar = new CookieJar();
		var authUrl;
		var savedUrl;

		async.waterfall([
			function (cb) {
				tumblr.createAuthRequestUrl({}, cb);
			},
			function (url, cb) {
				authUrl = url;
				request({
					url: url,
				}, cb);
			},
			function (res, body, cb) {
				var headers = jar.getCookies(res.headers);
				savedUrl = res.headers.location;
				request({
					url: savedUrl,
					headers: headers
				}, cb);
			},
			function (res, body, cb) {
				jar.getCookies(res.headers);
				jsdom.env(body, [], cb);

			},
			function (window, cb) {
				var params = {
					'user[email]': service.username,
					'user[password]': service.password,
					redirect_to: authUrl
				};
				var inputs = window.document.getElementsByTagName('input');

				for (var k = 0; k < inputs.length; k++) {
					var el = inputs[k];
					if (el.hasAttribute('name')) {
						switch (el.getAttributeNode('name').value) {
							case 'recaptcha_public_key':
								params.recaptcha_public_key = el.getAttributeNode('value').value;
								break;
							case 'recaptcha_response_field':
								params.recaptcha_response_field = el.getAttributeNode('placeholder').value;
								break;
							case 'http_referer':
								params.http_referer = el.getAttributeNode('value').value;
								break;
							case 'form_key':
								params.form_key = el.getAttributeNode('value').value;
								break;
							case 'hk':
								params.hk = el.getAttributeNode('value').value;
								break;
						}
					}
				}

				var headers = jar.getCookies(null, {
					'Referer': savedUrl,
					'Content-Type': 'application/x-www-form-urlencoded'
				});

				request({
					method: 'POST',
					url: url.parse(savedUrl).href.split('?')[0],
					headers: headers,
					body: urlEncode(params)
				}, cb);
			},
			function (res, body, cb) {
				var headers = jar.getCookies(res.headers, {});

				request({
					url: authUrl,
					headers: headers
				}, cb);
			},
			function (res, body, cb) {
				jsdom.env(body, [], cb);
			},
			function (window, cb) {
				var params = {
					allow: ''
				};

				var inputs = window.document.getElementsByTagName('input');
				for (var k = 0; k < inputs.length; k++) {
					var el = inputs[k];
					if (el.hasAttribute('name')) {
						switch (el.getAttributeNode('name').value) {
							case 'form_key':
								params.form_key = el.getAttributeNode('value').value;
								break;
							case 'oauth_token':
								params.oauth_token = el.getAttributeNode('value').value;
								break;
							case 'oauth_callback':
								params.oauth_callback = el.getAttributeNode('value').value;
								break;
						}
					}
				}

				var headers = jar.getCookies(null, {
					'Host': 'www.tumblr.com',
					'Origin': 'http://www.tumblr.com',
					'Referer': authUrl,
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.57 Safari/537.17',
					'Content-Type': 'application/x-www-form-urlencoded'
				});

				request({
					method: 'POST',
					url: authUrl,
					headers: headers,
					body: urlEncode(params)
				}, cb);
			},
			function (res, body, cb) {
				tumblr.exchangeAuthGrant(res.headers.location, {}, cb);
			}
		], function (err, result) {
			expect(result).to.exist;
			console.log(result);
			// fs.writeFile('bbb.html', arguments[2], function (){
			done(err);
			// });

		});
	});
});
