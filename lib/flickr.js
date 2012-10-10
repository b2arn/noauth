"use strict";
var inherits = require('util').inherits;
var  OAuth1 = require('./core/oauth1a');


var Flickr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Flickr, OAuth1);

Flickr.prototype.providerInfo = {
	requestUrl: 'http://www.flickr.com/services/oauth/request_token',
	authUrl: 'http://www.flickr.com/services/oauth/authorize',
	accessUrl: 'http://www.flickr.com/services/oauth/access_token'
};

Flickr.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};


module.exports = Flickr;
