/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

module.exports = function(grunt) {

  // External libs.
  var uglifyjs = require('uglify-js'),
   	  gzip = require('gzip-js'),
  	  iconv = require('iconv-lite'),
	  path = require('path'),
	  findup = require('../lib/util/findup');
function readConfig(){
			var  configjs = findup(process.cwd(), 'config.js'),
				 configdir = path.join(__dirname,"../taskconfig/config.js");
			  //一层一层寻找配置信息configjs
			  if ( configjs ) {
					return grunt.file.readJSON(configjs);
			 //如果寻找不到，则使用根路径的配置信息
			  } else {
				return grunt.file.readJSON(configdir);  
	 		 }
	}
  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('minjs', 'Minify files with UglifyJS.', function() {
    var files = grunt.file.expandFiles(this.file.src),
		//destmtime = (fs.existsSync(this.file.dest) && new Date(+fs.statSync(this.file.dest).mtime).getTime()); 
		noNeedMin;
	//时间戳检查，如果没有合并的单个文件的时间戳小于或者等于合并的则不合并
/*	noNeedMin = files.every( function(filepath){
		if( !destmtime ) return false;
		var mtime = new Date(+fs.statSync(filepath).mtime).getTime();
		return !(destmtime < mtime);
	});
	if ( noNeedMin ) return;*/
    // Get banner, if specified. It would be nice if UglifyJS supported ignoring
    // all comments matching a certain pattern, like /*!...*/, but it doesn't.
    var banner = grunt.task.directive(files[0], function() { return null; });
    if (banner === null) {
      banner = '';
    } else {
      files.shift();
    }
	this.data.separator = this.data.separator || "";
    // Concat specified files. This should really be a single, pre-built (and
    // linted) file, but it supports any number of files.
    var max,config = readConfig(),
		ascii_only = false;
    max = files ? files.map(function(filepath) {
		if (config.encode && config.encode != "utf8"){
		   ascii_only = true;
		  return iconv.decode(grunt.file.read(filepath,true),config.encode);
		} else {
			return grunt.task.directive(filepath, grunt.file.read);
		}
    }).join(grunt.utils.normalizelf(this.data.separator)) : '';
	var uglifyConfig = grunt.config('uglify') || {};
		uglifyConfig.codegen = uglifyConfig.codegen || {};
	 uglifyConfig.codegen = grunt.utils._.defaults(uglifyConfig.codegen, {
      ascii_only: ascii_only
    });
    // Concat banner + minified source.
    var min = banner + grunt.helper('uglify', max, uglifyConfig);
    grunt.file.write(this.file.dest, min);

    // Fail task if errors were logged.
    if (this.errorCount) { return false; }

    // Otherwise, print a success message....
    grunt.log.writeln('File "' + this.file.dest + '" created.');
    // ...and report some size information.
    grunt.helper('min_max_info', min, max);
  });
};
