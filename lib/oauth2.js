"use strict";
var url = require('url');
var request = require('request');
var async = require('async');


var parseBody = function (body, type) {
	switch (type) {
		case 'json':
			return JSON.parse(body);
		case 'url':
			return url.parse('?' + body, true).query;
	}
};

var OAuth = function () {};

OAuth.prototype.redirect = function (res, storage, i, cb) {
	storage.getRow(i, function (err, row) {
		var params = {
			response_type: 'code',
			client_id: row.clientId,
			redirect_uri: row.callbackUrl,
			state: i,
			scope: row.scope
		};

		var redirectUrl = url.resolve(row.authUrl, url.format({query: params}));
		res.redirect(redirectUrl);
		cb();
	});
};

OAuth.prototype.callback = function (res, storage, type, cb) {
	var query = url.parse(res.url, true).query;
	if ('error' in query) {
		cb(new Error(query.error));
	} else {
		var code = query.code;
		var i = parseInt(query.state, 10);
		async.waterfall([
				function (cb) {
					storage.getRow(i, cb);
				},
				function (row, cb) {
					var params = {
						code: code,
						client_id: row.clientId,
						client_secret: row.clientSecret,
						redirect_uri: row.callbackUrl,
						grant_type: 'authorization_code'
					};

					request({
						url: row.tokenUrl,
						method: 'POST',
						headers: {'Content-Type': 'application/x-www-form-urlencoded'},
						body: Object.keys(params).map(function (key) {
							return key + '=' + params[key];
						}).join('&')
					}, function (err, response, body) {
						cb(err, parseBody(body, type));
					});
				}
			],
			function (err, result) {
				cb(err, result);
			}
		);
	}
};


module.exports = OAuth;
