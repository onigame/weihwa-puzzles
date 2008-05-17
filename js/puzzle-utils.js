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
//  This is the Dragging object.

// This is a (heavily) modified form of dom-drag.js from
// http://youngpup.net/2001/domdrag
// The original is written by Aaron Boodman, who works at Google.

// Modfied such that it uses a "basis" item for dragging instead of
// allowing dragging of the actual item.

// We also keep a list of "drag sources" (items where a drag can start)
// and "drag sinks" (items where a drag can end).

var Drag = {
  obj : null,
  basis : null,
  is_dragging : false,
  has_dragged : false,
  min_x : 15,
  min_y : 35,
  max_x : 20,
  max_y : 0,
  basis_offset_x : 0,
  basis_offset_y : 0,
  sources : new Hash(),
  sinks : new Hash(),
  sinks_x : new Hash(),
  sinks_y : new Hash(),

  dragging_started : function(o) {},
  hit_sink : function(o) {},
  lost_sink : function() {},
  dragging_ended : function(o) {},
  click_happened : function(o) {},

  xposition : function(o) {
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
  },
  yposition : function(o) {
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
  },

  set_basis : function(o) {
    Drag.basis = o;
    Drag.basis.style["position"] = "absolute";
    Drag.basis.style["cursor"] = "move";
    Drag.basis.style["left"] = "0px";
    Drag.basis.style["top"] = "0px";
  },

  add_source : function(id,o) {
    this.sources.set(id, o);
    o.onmousedown  = Drag.start;
  },

  remove_source : function(id) {
    if (this.sources.has(id))
      this.sources.get(id).onmousedown  = null;
    this.sources.remove(id);
  },

  add_sink : function(id, o) {
    Drag.sinks.set(id, o);
    Drag.sinks_x.set(id, Drag.xposition(o));
    Drag.sinks_y.set(id, Drag.yposition(o));
  },

  remove_sink : function(id) {
    Drag.sinks.remove(id);
    Drag.sinks_x.remove(id);
    Drag.sinks_y.remove(id);
  },

  clear_sinks : function(o) {
    Drag.sinks = new Hash();
    Drag.sinks_x = new Hash();
    Drag.sinks_y = new Hash();
  },

  start : function(e) {
    Drag.obj = this;
    e = Drag.fixE(e);
    Drag.is_dragging = true;
    if (typeof(this.basis_view) != 'undefined') {
      Drag.basis.innerHTML = this.basis_view();
    } else {
      Drag.basis.innerHTML = this.innerHTML;
    }
    Drag.basis.style["left"] = Drag.xposition(this) - Drag.basis_offset_x + "px";
    Drag.basis.style["top"] = Drag.yposition(this) - Drag.basis_offset_y + "px";
    Drag.basis.lastMouseX    = e.clientX;
    Drag.basis.lastMouseY    = e.clientY;
    document.onmousemove    = Drag.drag;
    document.onmouseup   = Drag.end;
    Drag.dragging_started(Drag.obj);
    Drag.lost_sink();
    Drag.has_dragged = false;
    return false;
  },

  drag : function(e) {
    Drag.has_dragged = true;
    e = Drag.fixE(e);
    if (e.which == 0) return Drag.end();
    var ey    = e.clientY;
    var ex    = e.clientX;
    var y = parseInt(Drag.basis.style.top);
    var x = parseInt(Drag.basis.style.left);
    var nx, ny;

    nx = x + (ex - Drag.basis.lastMouseX);
    ny = y + (ey - Drag.basis.lastMouseY);

    Drag.basis.style["left"] = nx + "px";
    Drag.basis.style["top"] = ny + "px";
    Drag.basis.lastMouseX    = ex;
    Drag.basis.lastMouseY    = ey;

    var over = null;
    for (var i = 0; i < Drag.sinks.size(); ++i) {
      var id = Drag.sinks.keys()[i];
      if ((nx >= Drag.sinks_x.get(id) - Drag.min_x) && (ny >= Drag.sinks_y.get(id) - Drag.min_y)
       && (nx <= Drag.sinks_x.get(id) + Drag.max_x) && (ny <= Drag.sinks_y.get(id) + Drag.max_y))
        over = Drag.sinks.get(id);
    }

    if (over != null)
      Drag.hit_sink(over);
    else
      Drag.lost_sink();

    return false;
  },
  end : function() {
    document.onmousemove = null;
    document.onmouseup  = null;
    Drag.basis.innerHTML = "";
    Drag.is_dragging = false;
    Drag.dragging_ended(Drag.obj);
    if (!Drag.has_dragged) {
      Drag.click_happened(Drag.obj);
    }
    Drag.obj = null;
  },
  fixE : function(e) {
    if (typeof e == 'undefined') e = window.event;
    if (typeof e.layerX == 'undefined') e.layerX = e.offsetX;
    if (typeof e.layerY == 'undefined') e.layerY = e.offsetY;
    return e;
  }
};

