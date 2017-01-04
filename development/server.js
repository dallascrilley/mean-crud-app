// Base Setup
//========================

// Define user model
var User 				= require('./app/models/user');
// Use JWT to validate requests
var jwt 				= require('jsonwebtoken');

//Define JWT secret below
//========================
var superSecret = 'some_secret_here';

// Call the packages
var express 		= require('express') // call express
var app 				= express(); // define our app using express
var bodyParser 	= require('body-parser'); // get body-parser
var morgan 			= require('morgan'); // used to see requests
var mongoose 		= require('mongoose'); // for working w/ our database
var port 				= process.env.PORT || 8080; // set the port for our app

// Connect to db
// Environment variables not set up yet.

// ENTER MONGODB CONNECTION DETAILS BELOW
//========================

mongoose.connect('mongodb://some_db_here');

// App config
//========================

// Use body parser to grab POST info
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure app to use CORS
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
	next();
});

// Log requests to console

app.use(morgan('dev'));


//Routes
//========================

// Base routes
app.get('/', function(req, res) {
	res.send('Welcome to the home page');
});

// API express router instance
var apiRouter = express.Router();

//Authentication
apiRouter.post('/authenticate', function(req, res) {

	// Find the user
	// Explicitly select name, username and pw 

	User.findOne({
		username: req.body.username
	}).select('name username password').exec(function(err, user) {

		if (err) throw err;

		// Error: Invalid username (user not found in db)

		if (!user) {
			res.json({
				success: false,
				message: 'Authentication failed. Username or password does not exist.'
			});

		// Error: Invalid password

		} else if (user) {
			var validPassword = user.comparePassword(req.body.password);
			if (!validPassword) {
				res.json({
					success: false,
					message: 'Authentication failed. Username or password is invalid.'
				});
			} else {

			// Create a token on authentication success
			var token = jwt.sign({
				name: user.name,
				username: user.username
			}, superSecret, {
				expiresIn: '24h' // jwt set to expires in 24hours
			});

			// Return token as JSON
				res.json({
					success: true,
					message: 'Enjoy your token!',
					token: token
				});
			}
		}
	});
	});


// Middleware
//========================

//Token verification middleware
//Checks for token validity on each API route request
apiRouter.use(function(req, res, next) {
	
	//Check if a token param exists
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	// Decode the token. 
	if (token) {
		// Verify the secret and check expiration
		jwt.verify(token, superSecret, function(err, decoded) {
			if(err) {
				return res.status(403).send({
					success: false,
					message: 'Failed to authenticate token'
				});

				// All good? Let's save to the req for future routes
			} else {
				req.decoded = decoded;
				next();
		}
	});

	} else {
		// Return 403/access forbidden if no token is found
		return res.status(403).send({
			success: false,
			message: 'No token provided.'
		});
	}

// moved next statement to line 124 (within if/else token checks).
// they should only proceed if token is verified

});

// GET localhost:8080/api
// Base route for API... really only good for tests right now
apiRouter.get('/', function(req, res) {
	res.json({message: 'Hooray - api wussup'});
});


// GET localhost:8080/api/me
// API endpoint to get user info
apiRouter.get('/me', function(req, res) {
	res.send(req.decoded);
});


//More routes
//========================


// User routes
//========================

apiRouter.route('/users')

	// POST [http://localhost:8080/api/users]
	// Create a new user

	.post(function(req, res) {
		var user = new User();

		// Set user info
		user.name = req.body.name;
		user.username = req.body.username;
		user.password = req.body.password;

		//Save user
		user.save(function(err) {

			if(err) {
				//Error on dupe entry
				if(err.code == 11000)
					return res.json({success: false, message: 'A user with that username already exists.'});
				else
					return res.send(err);
			}

			res.json({  message:  'User created.'});
		});

	})



	// GET [http://localhost:8080/api/users]
	// Get a list of all users  
	.get(function(req, res) {

		User.find(function(err, users) {

			if (err) res.send(err);

			// Return user list as JSON
			res.json(users);
		});
	});


//User-ID specific / single-user routes
//========================

apiRouter.route('/users/:user_id')

	// GET [http://localhost:8080/api/users/:user_id]
	// Get user by id

	.get(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {
			if (err) res.send(err);

			// Return user as JSON
			res.json(user);
		});
	})

	// PUT http://localhost:8080/api/users/:user_id
	// Update single user by Unique ID

	.put(function(req, res) {

		User.findById(req.params.user_id, function(err, user) {

			if(err) res.send(err);

			//update user info only if new
			if (req.body.name) user.name = req.body.name;
			if (req.body.username) user.username = req.body.username;
			if (req.body.password) user.password = req.body.password;

			//save the user
			user.save(function(err) {
				if (err) res.send(err);

				//return response message
				res.json({ message: 'User updated'});
			});
		});
	})


	// DELETE http://localhost:8080/api/users/:user_id
	// Delete single user by unique id


	.delete(function(req, res) {
		User.remove({
				_id: req.params.user_id
		}, function(err, user) {
				if(err) return res.send(err);

				res.json({ message: 'Successfully deleted'});
		});

	});


// Register api routes with /api prefix
//========================

app.use('/api', apiRouter);


// Start web server
//========================

app.listen(port);
console.log('Listening on port ' + port);