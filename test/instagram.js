"use strict";
var utils = require('../lib/core/utils');
var Instagram = require('../lib/instagram');
var settings = require('./settings');
var async = require('async');
var url = require('url');
var expect = require('chai').expect;

var request = utils.request;
var CookieJar = utils.CookieJar;
var urlEncode = utils.urlEncode;

describe('Instagram', function () {
	it('should return', function (done) {
		var service = settings.services.instagram;
		var instagram = new Instagram(service.appInfo, settings.callbackUrl);

		var savedUrl;
		var authUrl;
		var cookie;

		var jar = new CookieJar();

		async.waterfall([
				function (cb) {
					instagram.createAuthRequestUrl({}, cb);
				},
				function (url, cb) {
					console.log(url);
					authUrl = url;
					request({
						url: url
					}, cb);
				},
				function (res, body, cb) {
					console.log(arguments);
					savedUrl = res.headers.location;
					request({
						url: savedUrl
					}, cb);
				},
				function (res, body, cb) {
					console.log(arguments);
					var headers = jar.getCookies(res.headers, {
						'Referer': savedUrl,
						'Content-Type': 'application/x-www-form-urlencoded'
					});

					request({
						method: 'POST',
						url: savedUrl,
						headers: headers,
						body: urlEncode({
							csrfmiddlewaretoken: jar.jar.csrftoken,
							username: service.username,
							password: service.password
						})
					}, cb);
				},
				function (res, body, cb) {
					var headers = jar.getCookies(res.headers, {
						'Referer': res.req._headers.referer,
					});

					request({
						url: res.headers.location,
						headers: headers
					}, cb);
				},
				function (res, body, cb) {
					var headers = jar.getCookies(res.headers, {
						'Referer': authUrl,
						'Content-Type': 'application/x-www-form-urlencoded',
					});

					request({
						method: 'POST',
						url: authUrl,
						headers: headers,
						body: urlEncode({
							csrfmiddlewaretoken: jar.jar.csrftoken,
							allow: 'Authorize'
						}),
					}, cb);
				},
				function (res, body, cb) {
					instagram.exchangeAuthGrant(res.headers.location, {}, cb);
				}
			], function (err, result) {
				expect(result).to.exist;
				console.log(result);
				done(err);
		});
	});
});


