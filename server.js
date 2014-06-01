var restify = require('restify'),
	socketio = require('socket.io'),
	_ = require('lodash'),
	Trimet = require('./trimet'),
	server = restify.createServer(),
	io = socketio(server),
	trimet = new Trimet({
		interval: 5000,
		apikey: process.env.TRIMET_API_KEY
	})


server.use(restify.CORS());
server.use(restify.queryParser());

server.get('/', function(req, res, next) {
	res.send('This is the api end point for PDXLiveBus App');
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


trimet.listenForBuses(function(data) {
	//If route we should send down the vehicle as an array not per-vehicle
	_.each(data, function(vehicle, key) {
		io.to('v'+key).emit('vehicle', vehicle);
		io.to('r'+vehicle.routeNumber).emit('vehicle', vehicle);
	});
})



server.listen(process.env.PORT || 8080, function() {});

