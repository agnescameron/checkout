const passport = require('@passport-next/passport')
const LocalStrategy = require('@passport-next/passport-local').Strategy
const crypto = require('crypto')
const Options = require('./options')()

const UsersModel = require('../models/users')
const PermissionsModel = require('../models/permissions')

const Authentication = {
	auth: function(app) {
		const users = new UsersModel()
		const permissions = new PermissionsModel()

		// Add support for local authentication
		passport.use(
			new LocalStrategy(function(email, password, done) {
			users.getByEmail(email, 'all')
				.then(user => {
					if (!user) {
						throw new Error('Invalid Login')
					}

					if (user.pw_attempts >= Options.get('password_tries')) {
						throw new Error('Account locked out')
					}

					if (!user.pw_salt) {
						throw new Error('Invalid login')
					}

					return new Promise((resolve, reject) => {
						// Hash the entered password with the users salt
						Authentication.hashPassword(password, user.pw_salt, user.pw_iterations, (hash) => {
							resolve({hash, user})
						})
					})
					// return done(null, false, {message: 'Incorrect username.'})
				})
				.then(({hash, user}) => {
					let persist = {
						pw_attempts: user.pw_attempts,
						successful: true,
						flash: {},
						user
					}
					if (hash == user.pw_hash) {
						if (user.pw_attempts > 0) {
						persist.flash = {
							message: `There has been ${user.pw_attempts} attempt(s) to login to your account since you last logged in`
						}
						persist.pw_attempts = 0
						}
					} else {
						persist.successful = false
						persist.pw_attempts++
						persist.flash = {
						message: 'Invalid login'
						}
					}
					return users.update(user.id, {
						pw_attempts: persist.pw_attempts
					})
					.then(id => {
						return persist
					})
				})
				.then(({successful, user, flash}) => {
					if (flash) {
						done(null, successful ? {id: user.id} : false, flash)
					} else {
						done(null, successful ? {id: user.id} : false)
					}
				})
				.catch(err => {
					done(null, false, {
						message: err
					})
				})
			})
		)

		// Passport.js serialise user function
		passport.serializeUser(function(data, done) {
			done(null, data)
		})

		passport.deserializeUser(function(data, done) {
			var id
			id = data.id
			users.query()
			.lookup(['printer', 'role', 'template'])
			.where([['id', id]]).retrieveSingle()
			.then(user => {
				if (user) {
					return permissions.getByRoleId(user.role_id).then(perms => {
						perms = perms.map(p => {
							return p.permission
						})
						if (data.km) {
							perms = perms.filter(p => {
								if (p == 'checkout_issue') return true
								if (p == 'items_return') return true
								if (p == 'items_broken') return true
								if (p == 'items_lost') return true
								if (p == 'items_sold') return true
								if (p == 'checkout_history') return true
								if (p == 'groups_override') return true
								if (p == 'users_create') return true
								if (p == 'print') return true
								return false
							})
						}
						user.permissions = perms
						return done(null, user)
					})
				} else {
					return done(null, false)
				}
			})
		})

		// Include support for passport and sessions
		app.use(passport.initialize())
		app.use(passport.session())
	},

	// Used to create a long salt for each individual user
	// returns a 256 byte / 512 character hex string
	generateSalt: function(callback) {
		crypto.randomBytes(256, function(ex, salt) {
			callback(salt.toString('hex'))
		})
	},

	// Hashes passwords through sha512 1000 times
	// returns a 512 byte / 1024 character hex string
	hashPassword: function(password, salt, iterations, callback) {
		crypto.pbkdf2(password, salt, iterations, 512, 'sha512', function(err, hash) {
			callback(hash.toString('hex'))
		})
	},

	// Utility function generates a salt and hash from a plain text password
	generatePassword: function(password, callback) {
		Authentication.generateSalt(function(salt) {
			Authentication.hashPassword(password, salt, parseInt(process.env.USER_PW_ITERATIONS, 10), function(hash) {
				callback({
					salt: salt,
					hash: hash,
					iterations: parseInt(process.env.USER_PW_ITERATIONS, 10)
				})
			})
		})
	},
	
	// Checks password meets requirements
	passwordRequirements: function(password) {
		if (! password)
			return 'No password entered'

		if (password.length < 8)
			return 'Password is less than 8 characters'

		if (password.match(/\d/g) === null)
			return 'Password does not contain any numbers'

		if (password.match(/[A-Z]/g) === null)
			return 'Password does not contain any uppercase characters'

		if (password.match(/[a-z]/g) === null)
			return 'Password does not contain any lowercase characters'

		return true
	},

	loggedIn: function(req) {
		// Is the user logged in?
		if (req.isAuthenticated() && req.user != undefined) {
			return true
		} else {
			return false
		}
	},
	isLoggedIn: function(req, res, next) {
		var status = Authentication.loggedIn(req)
		switch (status) {
			case true:
				return next()
			default:
			case false:
				req.flash('error', "Please login")
				res.redirect('/login')
				return
		}
	},
	userCan: function(user, permission) {
		if (typeof permission == 'object') {
			if (permission.or) {
				return permission.or.some(p => user.permissions.includes(p))
			} else if (permission.and) {
				return permission.and.every(p => user.permissions.includes(p))
			}
		} else {
			return user.permissions.includes(permission)
		}
	},
	_currentUserCheck: function(permission, req, res, next) {
		var status = Authentication.loggedIn(req)
		if (status) {
			var authorised = Authentication.userCan(req.user, permission)
			if (authorised) {
				return next()
			} else {
				res.status(403)
				res.render(__dirname + '/../views/403', {
					permission: permission,
					user_permissions: req.user.permissions
				})
			}
		} else {
			req.flash('error', "Please login")
			res.redirect('/login')
		}
	},
	currentUserCan: function(permission) {
		return function(req, res, next) {
			Authentication._currentUserCheck(permission, req, res, next)
		}
	},
	currentUserCanOrOptionOverride: function(permission, option) {
		return function(req, res, next) {
			// If option is true then show the page
			if (Options.getBoolean(option)) {
				return next()
			}

			// Otherwise check the permission
			Authentication._currentUserCheck(permission, req, res, next)
		}
	},
	APIuserCan: function(permission) {
		return function(req, res, next) {
			var status = Authentication.loggedIn(req)
			if (status) {
				var authorised = Authentication.userCan(req.user, permission)
				if (authorised) {
					return next()
				} else {
					res.json({status:'danger', message: 'Permission denied'})
				}
			} else {
				res.json({status:'danger', message: 'Please login'})
			}
		}
	}
}

module.exports = Authentication
