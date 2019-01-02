var __home = __dirname + "/../..";
var __src = __home + '/src';
var __js = __src + '/js';

var	express = require( 'express' ),
	app = express();

var auth = require( __js + '/authentication' );

const Courses = require('../../src/models/courses.js');
const Years = require('../../src/models/years.js');
const Departments = require('../../src/models/departments.js');

app.set( 'views', __dirname + '/views' );

app.get( '/', auth.isLoggedIn, function ( req, res ) {
	Departments.get( function( err, departments ) {
		Courses.get( function( err, courses ) {
			Years.get( function( err, years ) {
				res.render( 'index', {
					departments: departments,
					courses: courses,
					years: years
				} );
			} );
		} );
	} );
} );

module.exports = function( config ) { return app; };
