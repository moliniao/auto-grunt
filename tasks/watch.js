/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

module.exports = function(grunt) {

  // Nodejs libs.
  var fs = require('fs');
  var path = require('path');

  // ==========================================================================
  // TASKS
  // ==========================================================================

  // Keep track of last modified times of files, in case files are reported to
  // have changed incorrectly.
  var mtimes = {};
  function watchFileExt(){
	   var findup = require('../lib/util/findup'),
		  configjs = findup(process.cwd(), 'config.js'),
	  	  configdir = path.join(__dirname,"../taskconfig/config.js"),
		  taskConfig;
	  //一层一层寻找配置信息configjs
	  if ( configjs ) {
			taskConfig = grunt.file.readJSON(configjs);
	 //如果寻找不到，则使用根路径的配置信息
	  } else {
	  	taskConfig = grunt.file.readJSON(configdir);  
	 }
	  return taskConfig["watchFileExt"];
  }
  grunt.registerTask('watch', 'Run predefined tasks whenever watched files change.', function(target) {
    this.requiresConfig('watch');
    // Build an array of files/tasks objects.
	//从配置文件grunt.js中获取监控文件列表和对相应的监控文件做的监控操作。并格式化watch的任务配置，格式为watch:{"watchtask1":{"files":[],"tasks":"concat min"},"watchtask2":{"files":[],"tasks":"concat min"}}
    var watch = grunt.config('watch');
    var targets = target ? [target] : Object.keys(watch).filter(function(key) {
      return typeof watch[key] !== 'string' && !Array.isArray(watch[key]);
    });
	
    targets = targets.map(function(target) {
      // Fail if any required config properties have been omitted.
      target = ['watch', target];
      this.requiresConfig(target.concat('files'), target.concat('tasks'));
      return grunt.config(target);
    }, this);
  //使得任务可以没有名称（缺省）watch:{"files":[],"tasks":"concat min"}
    // Allow "basic" non-target format.
    if (typeof watch.files === 'string' || Array.isArray(watch.files)) {
      targets.push({files: watch.files, tasks: watch.tasks});
    }
    //grunt.log.write('Waiting...');

    // This task is asynchronous.
    var taskDone = this.async();
    // Get a list of files to be watched.需要监控的所有文件列表，集成为一个数组["watchtask1","watchtask2",...]
    var patterns = grunt.utils._.chain(targets).pluck('files').flatten().uniq().value();
	//扩展监控的所有文件路径为完整的路径，实际它也是监控列表，只是它是完整的文件路径而已
    var getFiles = grunt.file.expandFiles.bind(grunt.file, patterns);
    // The tasks to be run.
    var tasks = []; //grunt.config(tasksProp);
    // This task's name + optional args, in string format.
    var nameArgs = this.nameArgs;
    // An ID by which the setInterval can be canceled.
    var intervalId;
    // Files that are being watched.
    var watchedFiles = {};
    // File changes to be logged.
    var changedFiles = {};

    // Define an alternate fail "warn" behavior.
    grunt.fail.warnAlternate = function() {
      grunt.task.clearQueue({untilMarker: true}).run(nameArgs);
    };

    // Cleanup when files have changed. This is debounced to handle situations
    // where editors save multiple files "simultaneously" and should wait until
    // all the files are saved.
    var done = grunt.utils._.debounce(function() {
      // Clear the files-added setInterval.
      clearInterval(intervalId);
      // Ok!
      grunt.log.ok();
      var fileArray = Object.keys(changedFiles);
      fileArray.forEach(function(filepath) {
        // Log which file has changed, and how.
        grunt.log.ok('File "' + filepath + '" ' + changedFiles[filepath] + '.');
        // Clear the modified file's cached require data.
        grunt.file.clearRequireCache(filepath);
      });
      // Unwatch all watched files.
      Object.keys(watchedFiles).forEach(unWatchFile);
      // For each specified target, test to see if any files matching that
      // target's file patterns were modified.
      targets.forEach(function(target) {
        var files = grunt.file.expandFiles(target.files);
        var intersection = grunt.utils._.intersection(fileArray, files);
        // Enqueue specified tasks if a matching file was found.
        if (intersection.length > 0 && target.tasks) {
			intersection.forEach(function(file){
				if( watchFileExt().indexOf(path.extname(file).toLowerCase()) > -1) {
					grunt.task.changedTpl.push(file);
				}
			})
          grunt.task.run(target.tasks).mark();
        }
      });
      // Enqueue the watch task, so that it loops.
      grunt.task.run(nameArgs);
      // Continue task queue.
      taskDone();
    }, 250);

    // Handle file changes.
    function fileChanged(status, filepath) {
		//如果文件是删除或者新添加也算是changed
      // If file was deleted and then re-added, consider it changed.
      if (changedFiles[filepath] === 'deleted' && status === 'added') {
        status = 'changed';
      }
      // Keep track of changed status for later.
      changedFiles[filepath] = status;
      // Execute debounced done function.文件改变的处理函数
      done();
    }

    // Watch a file.
    function watchFile(filepath) {
      if (!watchedFiles[filepath]) {
        // Watch this file for changes. This probably won't scale to hundreds of
        // files.. but I bet someone will try it!
		//支持watch方法的，
		try{
			watchedFiles[filepath] = fs.watch(filepath, function(event) {
			  var mtime;
			  // Has the file been deleted?
			  var deleted = !path.existsSync(filepath);
			  //监控的文件已经被删除的情况，可以立即解除监控事件
			  if (deleted) {
				// If file was deleted, stop watching file.
				unWatchFile(filepath);
				// Remove from mtimes.
				delete mtimes[filepath];
			  } else {
				// Get last modified time of file.
				mtime = +fs.statSync(filepath).mtime;
				// If same as stored mtime, the file hasn't changed.文件没有发生变化的情况
				if (mtime === mtimes[filepath]) { return; }
				// Otherwise it has, store mtime for later use.
				mtimes[filepath] = mtime;
			  }
			  // Call "change" for this file, setting status appropriately (rename ->
			  // renamed, change -> changed).
			  fileChanged(deleted ? 'deleted' : event + 'd', filepath);
			});
		} 
		//不支持watch方法的
		catch(err){
			watchedFiles[filepath] = fs.watchFile(filepath, function(event) {
			  var mtime;
			  // Has the file been deleted?
			  var deleted = !path.existsSync(filepath);
			  //监控的文件已经被删除的情况，可以立即解除监控事件
			  if (deleted) {
				// If file was deleted, stop watching file.
				unWatchFile(filepath);
				// Remove from mtimes.
				delete mtimes[filepath];
			  } else {
				// Get last modified time of file.
				mtime = +fs.statSync(filepath).mtime;
				// If same as stored mtime, the file hasn't changed.文件没有发生变化的情况
				if (mtime === mtimes[filepath]) { return; }
				// Otherwise it has, store mtime for later use.
				mtimes[filepath] = mtime;
			  }
			  // Call "change" for this file, setting status appropriately (rename ->
			  // renamed, change -> changed).
			  fileChanged(deleted ? 'deleted' : event + 'd', filepath);
			});
		}
      }
    }
  //解除文件的修改监控事件
    // Unwatch a file.
    function unWatchFile(filepath) {
      if (watchedFiles[filepath]) {
        // Close watcher.
		try{
        	watchedFiles[filepath].close();
		} 
		catch(err){
			fs.unwatchFile(filepath);
		}
        // Remove from watched files.
        delete watchedFiles[filepath];
      }
    }
	//把所有的监控文件绑定修改时间作监控
    // Watch all currently existing files for changes.
    getFiles().forEach(watchFile);

    // Watch for files to be added.定时监控目录下时候有新添加的文件，如果没有在监控列表中也需要添加进去
    intervalId = setInterval(function() {
      // Files that have been added since last interval execution.
      var added = grunt.utils._.difference(getFiles(), Object.keys(watchedFiles));
      added.forEach(function(filepath) {
        // This file has been added.
        fileChanged('added', filepath);
        // Watch this file.
        watchFile(filepath);
      });
    }, 200);
  });

};