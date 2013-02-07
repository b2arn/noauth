"use strict";
var http = require('http');
var https = require('https');
var url = require('url');


var request = function (options, cb) {
	var parsedUrl = url.parse(options.url);
	var protocol = parsedUrl.protocol === 'http:' ? http : https;
	var body = [];

	if (options.method === 'POST') {
		if (!options.headers) {
			options.headers = {};
		}

		options.headers['Content-Length'] = options.body ? options.body.length : 0;
	}

	var req = protocol.request({
		method: options.method,
		hostname: parsedUrl.hostname,
		path: parsedUrl.path,
		headers: options.headers
	}, function (res) {
		res.on('data', function (chunk) {
			body.push(chunk);
		});
		res.on('error', function (e) {
			cb(e, res);
		});
		res.on('end', function () {
			cb(null, res, Buffer.concat(body).toString());
		});
	});

	req.on('error', function (e) {
		cb(e);
	});

	req.end(options.body);
};

var CookieJar = function () {
	this.jar = {};
};

CookieJar.prototype.getCookies = function (resHeaders, reqHeaders) {
	var self = this;
	if (resHeaders['set-cookie']) {
		resHeaders['set-cookie'].forEach(function (el) {
			var t = el.split(';')[0].split('=');
			self.jar[t[0]] = t[1];
		});
	}
	var cookies = '';
	for (var cookie in this.jar) {
		cookies += cookie + '=' + this.jar[cookie] + '; ';
	}
	if (cookies) {
		if (!reqHeaders) {
			reqHeaders = {};
		}
		reqHeaders.Cookie = cookies;
	}
	return reqHeaders;
};

/*var getCookies = function (res, headers, jar) {
	if (res.headers['set-cookie']) {
		res.headers['set-cookie'].forEach(function (el) {
			var t = el.split(';')[0].split('=');
			jar[t[0]] = t[1];
		});
	}
	var cookies = '';
	for (var cookie in jar) {
		cookies += cookie + '=' + jar[cookie] + '; ';
	}
	if (cookies) {
		if (!headers) {
			headers = {};
		}
		headers.Cookie = cookies;
	}
	return headers;
};*/

var urlEncode = function (o) {
	return url.format({query: o}).substr(1);
};


module.exports = {
	request: request,
	// getCookies: getCookies,
	urlEncode: urlEncode
};
