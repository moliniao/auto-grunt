/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

(function(exports) {

  // Split strings on dot, but only if dot isn't preceded by a backslash. Since
  // JavaScript doesn't support lookbehinds, use a placeholder for "\.", split
  // on dot, then replace the placeholder character with a dot.
  function getParts(str) {
    return str.replace(/\\\./g, '\uffff').split('.').map(function(s) {
      return s.replace(/\uffff/g, '.');
    });
  }
	//深度获取对象中的属性值，parts是字符串以.相隔开
  // Get the value of a deeply-nested property exist in an object.
  exports.get = function(obj, parts, create) {
    if (typeof parts === 'string') {
      parts = getParts(parts);
    }

    var part;
    while (typeof obj === 'object' && obj && parts.length) {
      part = parts.shift();
      if (!(part in obj) && create) {
        obj[part] = {};
      }
      obj = obj[part];
    }

    return obj;
  };

  // Set a deeply-nested property in an object, creating intermediary objects
  // as we go.
  exports.set = function(obj, parts, value) {
    parts = getParts(parts);

    var prop = parts.pop();
    obj = exports.get(obj, parts, true);
    if (obj && typeof obj === 'object') {
      return (obj[prop] = value);
    }
  };

  // Does a deeply-nested property exist in an object?
  exports.exists = function(obj, parts) {
    parts = getParts(parts);

    var prop = parts.pop();
    obj = exports.get(obj, parts);

    return typeof obj === 'object' && obj && prop in obj;
  };

}(typeof exports === 'object' && exports || this));
