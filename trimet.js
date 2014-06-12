var	request = require('request'),
	_ = require('lodash');

var Trimet = function(config) {
	this.config = config;
	this._vehicles = {};
	this._routes = {};
	this._registeredStops = [];
	this._baseUrl = 'http://developer.trimet.org/';
	this._api = {
		vehicles: 'beta/v2/vehicles',
		routes: 'ws/V1/routeConfig',
		stops: 'ws/V1/stops',
		arrivals: 'ws/v2/arrivals'
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

Trimet.prototype.listenForStops = function(cb) {
	this.stopCb = cb;
	clearInterval(this.stopInterval);
	this.stopInterval = setInterval(this._updateRegisteredStops.bind(this), this.config.interval || 5000);
}

Trimet.prototype.searchForStops = function(search, cb) {
	this._findNearbyStops(search, cb);
}

Trimet.prototype.getVehicles = function() {
	return this._vehicles;
}

Trimet.prototype.getCurrentVehicleStop = function(vehicleId) {
	return this.getVehicles()[vehicleId].lastLocID;
}

Trimet.prototype.getStopsRegistered = function() {
	return this._registeredStops.join(',');
}

Trimet.prototype.registerStop = function(stopId) {
	if (this._registeredStops.indexOf(stopId) === -1) {
		this._registeredStops.push(stopId);
	}
}

Trimet.prototype.unregisterStop = function(stopId) {
	var stopIndex = this._registeredStops.indexOf(stopId);
	if (stopIndex !== -1) {
		this._registeredStops.splice(stopIndex, 1);
	}
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
Trimet.prototype._getArrivalsUrl = function(queryParams) {
	return this._getUrlWithParams('arrivals', queryParams);
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

Trimet.prototype._updateRegisteredStops = function() {
	var stops = {
		locIDs: this.getStopsRegistered(),
		showPosition: true
	};

	this._getVehiclesToStops(stops, function(data) {
		var buildPositions = {},
			currentArrival;

		_.each(data.arrivals, function(arrival) {
			buildPositions[arrival.locid] = buildPositions[arrival.locid] || {};

			buildPositions[arrival.locid][arrival.route] = arrival;
			currentArrival = buildPositions[arrival.locid][arrival.route];

			currentArrival.currentStop = this.getCurrentVehicleStop(arrival.vehicleID);
			currentArrival.lat = currentArrival.buildPositions.lat;
			currentArrival.lng = currentArrival.buildPositions.lng;
			delete currentArrival.buildPositions;
		}, this);

		this.stopCb(buildPositions);

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
			return cb(err, null);
		}

		cb(null, body.resultSet.location || []);
	})
}

Trimet.prototype._getVehiclesToStops = function(config, cb) {
	config.json = true;

	var arrivalsUrl = this._getArrivalsUrl(config);
	request({
		url: arrivalsUrl,
		json: true
	}, function(err, response, body) {
		if (err) {
			return cb(err, null);
		}
		cb(null, body.resultSet);
	})
}



exports = module.exports = Trimet;