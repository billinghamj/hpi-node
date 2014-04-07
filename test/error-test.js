
var hpi = require('../index'),
	fs = require('fs'),
	assert = require('assert');


describe('error response handling', function(){
	
	it("should error on HTTP status 500", function(done){
		fs.readFile( "./test/resources/error.soap.xml", "utf8", function( err, body ){
			hpi.handleResponse( 500, body, {}, function( err ){
				assert.ok(err);
				done();
			});
		});
	});
	
	it("should error on HTTP status 400", function(done){
		fs.readFile( "./test/resources/error.soap.xml", "utf8", function( err, body ){
			hpi.handleResponse( 400, body, {}, function( err ){
				assert.ok(err);
				done();
			});
		});
	});
	
	it("should error on HTTP status 200 with an Error body", function(done){
		fs.readFile( "./test/resources/error-vrm-invalid.soap.xml", "utf8", function( err, body ){
			hpi.handleResponse( 200, body, {}, function( err ){
				assert.ok(err);
				done();
			});
		});
	});
	
	it("should handle missing VRMs", function(done){
		fs.readFile( "./test/resources/warn-reg-not-found.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( err, result ){
				assert.ok(err);
				assert.equal( err.message, "Warning: 0 ABI recs returned - error from Vehicle search" );
				done();
			});
		});
	});
	
	it("should handle invalid VRMs", function(done){
		fs.readFile( "./test/resources/error-vrm-invalid.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( err, result ){
				assert.ok(err);
				assert.equal( err.message, "VRM is invalid" );
				done();
			});
		});
	});
	
	it("should handle multiple validity problems", function(done){
		fs.readFile( "./test/resources/error-vrm-vin-invalid.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( err, result ){
				assert.ok(err);
				assert.equal( err.message, "VRM is invalid" );
				done();
			});
		});
	});
});
