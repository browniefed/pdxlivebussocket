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

server.get('/findStops/:ll/:radius', function(req, res, next) {
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

io.set( 'origins', '*:*' );

io.on('connection', function(socket) {

	socket.on('registerRoom', function(route) {
		socket.join(route);
	});

	socket.on('leaveRoom', function(route) {
		socket.leave(route);
	});

	socket.on('disconnect', function() {

	});
});


// trimet.listenForVehicles(function(data) {
// 	//If route we should send down the vehicle as an array not per-vehicle
// 	//Also be smart enough if they listen for a route + a vehicle in a route then don't send em both dummy
// 	_.each(data, function(vehicle, key) {
// 		io.to('v'+key).emit('vehicle', vehicle);
// 		io.to('r'+vehicle.routeNumber).emit('vehicle', vehicle);
// 	});
// })



server.listen(process.env.PORT || 8080, function() {});

