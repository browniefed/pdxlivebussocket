var	request = require('request'),
	_ = require('lodash');

var Trimet = function(config) {
	this.config = config;
	this._vehicles = {};
	this._routes = {};

	this._baseUrl = 'http://developer.trimet.org/';
	this._api = {
		vehicles: 'beta/v2/vehicles',
		routes: 'ws/V1/routeConfig',
		stops: 'ws/V1/stops'
	}
}


Trimet.prototype.hasVehicle = function(vehicleId) {
	return this._vehicles[vehicleId];
}

Trimet.prototype.hasRoute = function(routeId) {
	return this._routes[routeId];
}

Trimet.prototype.vehiclesInRoute = function(routeId) {
	return _.filter(this._vehicles, function(vehicle) {
		return vehicle.route == routeId
	});
}

Trimet.prototype.listenForVehicles = function(cb) {
	this.cb = cb;
	clearInterval(this.interval);
	this.interval = setInterval(this._updateVehicles.bind(this), this.config.interval || 5000);
}


Trimet.prototype.searchForStops = function(search, cb) {
	this._findNearbyStops(search, cb);
}

Trimet.prototype.getVehicles = function() {
	return this._vehicles;
}

Trimet.prototype._getUrlWithParams = function(api, queryParams) {
	var params = '';
	Object.keys(queryParams).forEach(function(key) {
		params += '&' + key + '=' + queryParams[key];
	})
	return this._getBaseUrl(api) + params;
}
Trimet.prototype._getBaseUrl = function(api) {
	return this._baseUrl + this._api[api] + '?appID=' + this.config.apikey;
}

Trimet.prototype._getVehicleUrl = function(queryParams) {
	return this._getUrlWithParams('vehicles', queryParams)
}

Trimet.prototype._getRoutesUrl = function(queryParams) {
	return this._getUrlWithParams('routes', queryParams);
}

Trimet.prototype._getStopsUrl = function(queryParams) {
	return this._getUrlWithParams('stops', queryParams);
}

Trimet.prototype._updateVehicles = function() {
	var vehicleUrl = this._getVehicleUrl({
		showNonRevenue: true,
		showStale: true
	});

	request({
		url: vehicleUrl,
		json: true
	}, function(err, response, body) {
		if (err || !body) {
			//Classic node
			return;
		}
		_.extend(this._vehicles, _.indexBy(_.map(body.resultSet.vehicle || [], function(vehicle) {
			return _.pick(vehicle, 'direction', 'type', 'signMessageLong', 'longitude', 'vehicleID', 'routeNumber', 'bearing', 'latitude', 'delay');
		}), 'vehicleID'));

		this.cb && this.cb(this._vehicles);

	}.bind(this));

}

Trimet.prototype._getRoutes = function() {
	var routeUrl = this._getRoutesUrl({
		dirs: true,
		json: true,
		stops: true
	});

	request({
		url: routeUrl,
		json: true
	}, function(err, response, body) {
		if (err) {
			return;
		}

		_.each(body.resultSet.vehicle, function(route) {
			this.routes[route.route] = route;
		}.bind(this));
	})
}

Trimet.prototype._findNearbyStops = function(config, cb) {
	config.json = true;
	var stopUrl = this._getStopsUrl(config);

	request({
		url: stopUrl,
		json: true,
	}, function(err, response, body) {
		if (err) {
			cb(err, null);
		}

		cb(null, body.resultSet.location || []);
	})
}




exports = module.exports = Trimet;