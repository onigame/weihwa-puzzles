// Copyright 2006 Google, Inc.
// Author: Wei-Hwa Huang

function _gel(thing) {
  return document.getElementById(thing);
}
 
///////////////////////////////////////////////
//  A basic hashtable and set implementation.

function Hash() {
  this._items = new Array();
  this._keys = new Array();

  for (var i = 0; i < arguments.length; i += 2) {
    this._items[arguments[i]] = arguments[i + 1];
    this._keys.push(arguments[i]);
  }

  this.remove = function(key) {
    for (var i=0; i<this._keys.length; ++i) {
      var temp = null;
      if (key == this._keys[i]) {
        temp = this._items[key];
        delete (this._items[key]);
        this._keys.splice(i, 1);
      }
      return temp;
    }
    return null;
  }
  this.length = function(key) {
    return this._keys.length;
  }
  this.size = this.length;
  this.get = function(key) {
    return this._items[key];
  }
  this.set = function(key, value) {
    if (this._items[key] == null) {
      this._keys.push(key);
    }
    this._items[key] = value;
    return value;
  }
  this.has = function(key) {
    return (this._items[key] != null);
  }
  this.keys = function() {
    return this._keys;
  }
}

function Set() {
  this.items = new Array();
  this.size = 0;
  for (var i = 0; i < arguments.length; i ++) {
    this.items[arguments[i]] = 1;
    this.size++;
  }
  this.remove = function(key) {
    var temp;
    if (typeof(this.items[key]) != 'undefined') {
      this.size--;
      temp = this.items[key];
      delete (this.items[key]);
    }
    return temp;
  }
  this.add = function(key) {
    if (typeof(this.items[key]) == 'undefined') {
      this.size++;
    }
    this.items[key] = 1;
    return key;
  }
  this.has = function(key) {
    return (typeof(this.items[key]) != 'undefined');
  }
}

function Multiset() {
  this.items = new Array();
  this.size = 0;
  this.remove = function(key) {
    var temp;
    if (typeof(this.items[key]) != 'undefined') {
      this.size--;
      this.items[key]--;
      if (this.items[key] == 0) {
        temp = 0;
        delete (this.items[key]);
      } else {
        temp = this.items[key];
      }
    } else {
      temp = -1;
    }
    return temp;
  }
  this.add = function(key) {
    if (typeof(this.items[key]) == 'undefined') {
      this.items[key] = 0;
    }
    this.items[key]++;
    this.size++;
    return this.items[key];
  }
  for (var i = 0; i < arguments.length; i ++) {
    this.add(arguments[i]);
  }
  this.has = function(key) {
    return (typeof(this.items[key]) != 'undefined');
  }
  this.count = function(key) {
    return (this.items[key]);
  }
  this.has_dupes = function() {
    for (var x in this.items) {
      if (this.items[x] != 1) return true;
    }
    return false;
  }
}

///////////////////////////////////////////////
//  Position
//
//  These functions gets the absolute (within an iFrame) position of the object.
//  They should work on most browsers.

function Position_left(o) {
  var answer = 0;
  if (o.offsetParent) {
    while (o.offsetParent) {
      answer += o.offsetLeft;
      o = o.offsetParent;
    }
  } else if (o.x) {
    answer = o.x;
  }
  return answer;
}

function Position_right(o) {
  return (Position_left(o) + o.offsetWidth);
}

function Position_top(o) {
  var answer = 0;
  if (o.offsetParent) {
    while (o.offsetParent) {
      answer += o.offsetTop;
      o = o.offsetParent;
    }
  } else if (o.y) {
    answer = o.y;
  }
  return answer;
}

function Position_bottom(o) {
  return (Position_top(o) + o.offsetHeight);
}

///////////////////////////////////////////////
//  This is the Dragging object.

// This is a (heavily) modified form of dom-drag.js from
// http://youngpup.net/2001/domdrag
// The original is written by Aaron Boodman, who works at Google.

// Modfied such that it uses a "surrogate" item for dragging instead of
// allowing dragging of the actual item.

// We also keep a list of "drag sources" (items where a drag can start)
// and "drag sinks" (items where a drag can end).

var Drag = {
  surrogate : null,
  surrogate_initial_x : 0,
  surrogate_initial_y : 0,
  surrogate_offset_x : 1,
  surrogate_offset_y : 1,

  left_margin : 2,
  right_margin : 2,
  top_margin : 2,
  bottom_margin : 2,

  cur_source : null,
  cur_sink : null,
  is_dragging : false,
  has_dragged : false,

  x_mapper : null,
  y_mapper : null,

  no_move_mapper : function(abs_value, rel_value) {
    return abs_value - rel_value;
  },

  sources : new Hash(),
  source_views : new Hash(),
  sinks : new Hash(),

  dragging_started : function(o) {},
  hit_sink : function(o) {},
  lost_sink : function() {},
  dragging_ended : function(o) {},
  click_happened : function(o) {},

  set_surrogate : function(o) {
    Drag.surrogate = o;
    Drag.surrogate.innerHTML = "";
    Drag.surrogate.style["position"] = "absolute";
    Drag.surrogate.style["cursor"] = "move";
    Drag.surrogate_initial_x = 0;
    Drag.surrogate_initial_y = 0;
    Drag.surrogate.style["left"] = Drag.surrogate_initial_x + "px";
    Drag.surrogate.style["top"] = Drag.surrogate_initial_y + "px";
  },

  add_source : function(id, o, view) {
    Drag.sources.set(id, o);
    if (typeof(o) == 'undefined') {
      o = _gel(id);
    }
    if (typeof(view) != 'undefined') {
      o.Drag_surrogate_view = view;
    }
    o.onmousedown  = Drag.start;
    o.style.cursor = (navigator.appName == "Microsoft Internet Explorer") ? "hand" : "pointer";
    return true;
  },

  remove_source : function(id) {
    if (Drag.sources.has(id)) {
      Drag.sources.get(id).onmousedown  = null;
      Drag.sources.get(id).style.cursor = null;
    }
    Drag.sources.remove(id);
  },

  remove_all_sources : function() {
    for (index in this.sources.keys()) {
      Drag.sources.get(this.sources.keys()[index]).onmousedown  = null;
      Drag.sources.get(this.sources.keys()[index]).style.cursor = null;
    }
    Drag.sources = new Hash();
  },

  add_sink : function(id, o) {
    if (typeof(o) == 'undefined') {
      o = _gel(id);
    }
    Drag.sinks.set(id, o);
  },

  remove_sink : function(id) {
    Drag.sinks.remove(id);
  },

  remove_all_sinks : function() {
    Drag.sinks = new Hash();
  },

  cache_sinks : function() {
    Drag.sinks_left = new Hash();
    Drag.sinks_right = new Hash();
    Drag.sinks_top = new Hash();
    Drag.sinks_bottom = new Hash();
    for (var i = 0; i < Drag.sinks.size(); ++i) {
      var id = Drag.sinks.keys()[i];
      Drag.sinks_left.set(id, Position_left(Drag.sinks.get(id)) - Drag.left_margin);
      Drag.sinks_right.set(id, Position_right(Drag.sinks.get(id)) + Drag.right_margin);
      Drag.sinks_top.set(id, Position_top(Drag.sinks.get(id)) - Drag.top_margin);
      Drag.sinks_bottom.set(id, Position_bottom(Drag.sinks.get(id)) + Drag.bottom_margin);
    }
  },

  start : function(e) {
    Drag.cur_source = this;
    e = Drag.fixE(e);
    Drag.is_dragging = true;
    if (typeof(this.Drag_surrogate_view) != 'undefined') {
      Drag.surrogate.innerHTML = this.Drag_surrogate_view;
    } else {
      Drag.surrogate.innerHTML = this.innerHTML;
    }
    Drag.surrogate_initial_x    = Position_left(this) + Drag.surrogate_offset_x;
    Drag.surrogate_initial_y    = Position_top(this) + Drag.surrogate_offset_y;
    Drag.surrogate.style["left"] = Drag.surrogate_initial_x + "px";
    Drag.surrogate.style["top"] = Drag.surrogate_initial_y + "px";
    Drag.surrogate.lastMouseX    = e.clientX;
    Drag.surrogate.lastMouseY    = e.clientY;
    document.onmousemove    = Drag.drag;
    document.onmouseup   = Drag.end;
    Drag.dragging_started(Drag.cur_source);
    Drag.cur_sink = null;
    Drag.lost_sink();
    Drag.has_dragged = false;
    Drag.cache_sinks();
    return false;
  },

  drag : function(e) {
    Drag.has_dragged = true;
    e = Drag.fixE(e);
    if (e.which == 0) return Drag.end();
    var ey    = e.clientY;
    var ex    = e.clientX;
    var y = parseInt(Drag.surrogate.style.top);
    var x = parseInt(Drag.surrogate.style.left);
    var nx, ny, cx, cy;

    nx = x + (ex - Drag.surrogate.lastMouseX);
    ny = y + (ey - Drag.surrogate.lastMouseY);

    if (Drag.x_mapper) {
      nx = Drag.x_mapper(x, x-Drag.surrogate_initial_x);
    }
    if (Drag.y_mapper) {
      ny = Drag.y_mapper(y, y-Drag.surrogate_initial_y);
    }

    cx = nx + (Drag.surrogate.offsetWidth / 2);
    cy = ny + (Drag.surrogate.offsetHeight / 2);

    Drag.surrogate.style["left"] = nx + "px";
    Drag.surrogate.style["top"] = ny + "px";
    Drag.surrogate.lastMouseX    = ex;
    Drag.surrogate.lastMouseY    = ey;

    var over = null;
    for (var i = 0; i < Drag.sinks.size(); ++i) {
      var id = Drag.sinks.keys()[i];
      if ((cx >= Drag.sinks_left.get(id))
       && (cx <= Drag.sinks_right.get(id))
       && (cy >= Drag.sinks_top.get(id))
       && (cy <= Drag.sinks_bottom.get(id))) {
        over = Drag.sinks.get(id);
      }
    }

    if (Drag.cur_sink != over) {
      Drag.cur_sink = over;
      if (over != null) {
        Drag.hit_sink(over);
      } else {
        Drag.lost_sink();
      }
    }
  },

  end : function() {
    document.onmousemove = null;
    document.onmouseup  = null;
    Drag.surrogate.innerHTML = "";
    Drag.is_dragging = false;
    var hd = Drag.has_dragged;
    Drag.has_dragged = false;
    Drag.dragging_ended(Drag.cur_source, Drag.cur_sink);
    if (!hd) {
      Drag.click_happened(Drag.cur_source);
    }
    Drag.cur_source = null;
  },

  fixE : function(e) {
    if (typeof e == 'undefined') e = window.event;
    if (typeof e.layerX == 'undefined') e.layerX = e.offsetX;
    if (typeof e.layerY == 'undefined') e.layerY = e.offsetY;
    return e;
  }
};

