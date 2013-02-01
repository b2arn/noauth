"use strict";
var http = require('http');
var https = require('https');
var url = require('url');


var request = function (options, cb) {
	var parsedUrl = url.parse(options.url);
	var protocol = parsedUrl.protocol === 'http:' ? http : https;
	var body = [];

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


module.exports = {
	request: request
};
