var restify = require('restify'),
	socketio = require('socket.io'),
	_ = require('lodash'),
	Trimet = require('./trimet'),
	server = restify.createServer(),
	io = socketio(server),
	config = {};

	if (!process.env.TRIMET_API_KEY) {
		var config = require('./config');
	}

	var trimet = new Trimet({
		interval: 5000,
		apikey: process.env.TRIMET_API_KEY || config.TRIMET_API_KEY
	});



server.use(restify.CORS());
server.use(restify.queryParser());

server.get('/', function(req, res, next) {
	res.send('This is the api end point for PDXLiveBus App');
});

server.get('/findStops/:ll', function(req, res, next) {
	var search = {
		ll: req.params.ll,
		feet: req.params.radius || 2000,
		showRoutes: true
	};
	trimet.searchForStops(search, function(err, data) {
		if (!err) {
			res.json(data);
		}
	})
});

server.get('/vehicles', function(req, res, next) {
	res.json(trimet.getVehicles());
});

//Get all stop IDS
//Call the stupid STOP API to get every stop that people have registered for

io.set( 'origins', '*:*' );

io.on('connection', function(socket) {

//get all rooms
//check if empty
//then remove
	socket.on('registerRoom', function(room) {
		if (room[0] == 's') {
			trimet.registerStop(parseStop(room).stopId);
		}
		socket.join(room);
	});

	socket.on('leaveRoom', function(room) {
		if (room[0] == 's') {
			if (!io.sockets.clients(room).length) {
				trimet.unregisterStop(parseStop(room).stopId);
			}
		}
		socket.leave(room);
	});

	socket.on('disconnect', function() {

	});
});


trimet.listenForVehicles(function(data) {
	//If route we should send down the vehicle as an array not per-vehicle
	//Also be smart enough if they listen for a route + a vehicle in a route then don't send em both dummy
	_.each(data, function(vehicle, key) {
		io.to('v'+key).emit('vehicle', vehicle);
		io.to('r'+vehicle.routeNumber).emit('vehicle', vehicle);
	});
});

trimet.listenForStops(function(data) {
	_.each(data, function(stop, stopId) {
		_.each(stop, function(arrival, route) {
			io.to('s' + stopId + 'r' + route).emit('vehicleChange', arrival);
		});
	});
});


function parseStop(room) {
	var pieces = room.split('r'),
		stopId = pieces[0].slice(1),
		routeNumber = pieces[1];

	return {
		stopId: stopId,
		routeNumber: routeNumber
	};

}

server.listen(process.env.PORT || 8080, function() {});

