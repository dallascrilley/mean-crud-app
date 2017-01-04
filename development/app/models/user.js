// Grab packages for user model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

// User schema
var UserSchema 	= new Schema({
	name: String,
	username: { type: String, required: true, index: { unique: true }},
	password: { type: String, required: true, select: false }

});

// Hash pw before user is saved

UserSchema.pre('save', function(next) {
	var user = this;

	// Hash only if pw has changed or user is new
	if (!user.isModified('password')) return next();

	// Generate hash
	bcrypt.hash(user.password, null, null, function(err, hash) {
		if (err) return next(err);

		// Change pw to hashed pw
		user.password = hash;
		next();
	});

});

// Compare pw with db hash
UserSchema.methods.comparePassword = function(password) {
	var user = this;
	return bcrypt.compareSync(password, user.password);

};

// Return the model
module.exports = mongoose.model('User', UserSchema);