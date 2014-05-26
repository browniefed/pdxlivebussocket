var restify = require('restify'),
	socketio = require('socket.io'),
	Trimet = require('./trimet'),
	server = restify.createServer(),
	io = socketio.listen(server),
	trimet = new Trimet({
		interval: 5000,
		apikey: process.env.TRIMET_API_KEY
	})


server.use(restify.CORS());
server.use(restify.queryParser());

server.get('/', function(req, res, next) {
	res.send('This is the api end point for PDXLiveBus App');
});

io.on('connection', function(socket) {

	//No vehicles need to be sent initially.
	//The app should register its own stuff then our cycles should handle it all

	socket.on('register_route', function(route) {
		if (trimet.hasRoute(route)) {
			socket.join(route);
		}
	});

	socket.on('remove_route', function(route) {
		socket.leave(route);
	});

	socket.on('register_vehicle', function(vehicle) {
		if (trimet.hasVehicle(vehicle)) {
			socket.join('v' + vehicle);
		}
	});

	socket.on('remove_vehicle', function(vehicle) {
		socket.leave('v' + vehicle);

	});

	socket.on('disconnect', function() {

	});
});






server.listen(process.env.PORT || 8080, function() {});

