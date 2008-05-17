// Copyright 2006 Google, Inc.
// Author: Wei-Hwa Huang

function _gel(thing) {
  return document.getElementById(thing);
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

// We also keep a list of "drag source"s (items where a drag can start)
// and "drag target"s (items where a drag can end).

function _IG_Drag() {

 // "public" read-and-write properties

  this.surrogateOffsetX = 1;
  this.surrogateOffsetY = 1;

  this.leftMargin = 2;
  this.rightMargin = 2;
  this.topMargin = 2;
  this.bottomMargin = 2;

  this.xMapper = null;
  this.yMapper = null;

 // "public" read-only properties (external calls should not change these)

  this.surrogateInitialX = 0;
  this.surrogateInitialY = 0;
  this.surrogate = null;
  this.curSource = null;
  this.curTargetId = null;
  this.isDragging = false;
  this.hasDragged = false;
  this.isRightButton = false;

 // "private" properties (external calls should not even look at these)

  this.source_ = {};       // maps string ids to source objects.
  this.sourcePreviousOnMouseDown_ = {};       // maps string ids to source
  this.sourcePreviousStyleCursor_ = {};       // maps string ids to source
  this.target_ = {};       // maps string ids to target objects.
  this.targetPriority_ = {};       // maps string ids to target priorities.
  this.documentPreviousOnMouseMove = null;
  this.documentPreviousOnMouseUp = null;

 // other initialization lines

  this.makeCallbackFunctions();
}

// Sample mappers

_IG_Drag.prototype.noMoveMapper = function (abs, rel) {
  return abs - rel;
}

// Callback functions
//  Note that these always pass the objects, not the ids.

_IG_Drag.prototype.onDragStart = function(newSource) {}
_IG_Drag.prototype.onDragTargetHit = function(newTarget, lastTarget) {}
_IG_Drag.prototype.onDragTargetLost = function(lastTarget) {}
_IG_Drag.prototype.onDragEnd = function(source, target) {}
_IG_Drag.prototype.onDragClick = function(source) {}

_IG_Drag.prototype.ensureSurrogateExists = function() {
  if (!this.surrogate) {
    this.surrogate = document.createElement("SPAN");
    this.surrogate.innerHTML = "";
    this.surrogate.style["position"] = "absolute";
    this.surrogate.style["cursor"] = "move";
    this.surrogate.style["left"] = this.surrogateInitialX + "px";
    this.surrogate.style["top"] = this.surrogateInitialY + "px";
    document.body.appendChild(this.surrogate);
  }
}

_IG_Drag.prototype.addSource = function(id, object, view) {
  if (typeof(object) == 'undefined') {
    object = _gel(id);
  }
  this.source_[id] = object;
  if (typeof(view) != 'undefined') {
    object._IG_DragSurrogateView = view;
  }
  this.sourcePreviousOnMouseDown_[id] = object.onmousedown;
  object.onmousedown  = this.dragStart;
  this.sourcePreviousStyleCursor_[id] = object.style.cursor;
  object.style.cursor = (navigator.appName == "Microsoft Internet Explorer") ? "hand" : "pointer";
  return true;
}

_IG_Drag.prototype.removeSource = function(id) {
  if (typeof(this.source_[id]) != 'undefined') {
    this.source_[id].onmousedown  = this.sourcePreviousOnMouseDown_[id];
    this.source_[id].style.cursor = this.sourcePreviousStyleCursor_[id];
  }
  delete this.source_[id];
}

_IG_Drag.prototype.removeAllSources = function() {
  for (id in this.source_) {
    this.source_[id].onmousedown  = this.sourcePreviousOnMouseDown_[id];
    this.source_[id].style.cursor = this.sourcePreviousStyleCursor_[id];
  }
  this.source_ = {};
}

_IG_Drag.prototype.addTarget = function(id, object, priority) {
  if (typeof(object) == 'undefined') {
    object = _gel(id);
  }
  if (typeof(priority) == 'undefined') {
    priority = 0;
  }
  this.target_[id] = object;
  this.targetPriority_[id] = priority;
}

_IG_Drag.prototype.removeTarget = function(id) {
  delete this.target_[id];
}

_IG_Drag.prototype.removeAllTargets = function() {
  this.target_ = {};
}

_IG_Drag.prototype.cacheTargets = function() {
  this.targetLeft_ = {};
  this.targetRight_ = {};
  this.targetTop_ = {};
  this.targetBottom_ = {};
  for (var id in this.target_) {
    this.targetLeft_[id]   = (Position_left(this.target_[id]) - this.leftMargin);
    this.targetRight_[id]  = (Position_right(this.target_[id]) + this.rightMargin);
    this.targetTop_[id]    = (Position_top(this.target_[id]) - this.topMargin);
    this.targetBottom_[id] = (Position_bottom(this.target_[id]) + this.bottomMargin);
  }
}

_IG_Drag.prototype.fixE = function(e) {
  if (typeof e == 'undefined') e = window.event;
  if (typeof e.layerX == 'undefined') e.layerX = e.offsetX;
  if (typeof e.layerY == 'undefined') e.layerY = e.offsetY;
  return e;
}

_IG_Drag.prototype.makeCallbackFunctions = function() {
  var callback_this = this;

  this.dragStart = function(e) {
    if (callback_this.isDragging) {
      callback_this.dragEnd();  // we're in a weird state where we attempted to start again before finishing the last one.
    }
    callback_this.curSource = this;
    e = callback_this.fixE(e);
    callback_this.isDragging = true;
    callback_this.ensureSurrogateExists();
    if (typeof(callback_this.curSource._IG_DragSurrogateView) != 'undefined') {
      callback_this.surrogate.innerHTML = callback_this.curSource._IG_DragSurrogateView;
    } else {
      callback_this.surrogate.innerHTML = callback_this.curSource.innerHTML;
    }
    callback_this.surrogateInitialX    = Position_left(callback_this.curSource) + callback_this.surrogateOffsetX;
    if (typeof(callback_this.curSource._IG_Drag_surrogateOffsetX) != 'undefined') {
      callback_this.surrogateInitialX += callback_this.curSource._IG_Drag_surrogateOffsetX;
    }
    callback_this.surrogateInitialY    = Position_top(callback_this.curSource) + callback_this.surrogateOffsetY;
    if (typeof(callback_this.curSource._IG_Drag_surrogateOffsetY) != 'undefined') {
      callback_this.surrogateInitialY += callback_this.curSource._IG_Drag_surrogateOffsetY;
    }
    callback_this.surrogate.style.left = callback_this.surrogateInitialX + "px";
    callback_this.surrogate.style.top = callback_this.surrogateInitialY + "px";
    callback_this.surrogate.lastMouseX    = e.clientX;
    callback_this.surrogate.lastMouseY    = e.clientY;

    callback_this.documentPreviousOnMouseMove = document.onmousemove;
    callback_this.documentPreviousOnMouseUp = document.onmouseup;
    document.onmousemove    = callback_this.dragMove;
    document.onmouseup   = callback_this.dragEnd;

    callback_this.isRightButton = false;
    if (e.which && e.which == 3) callback_this.isRightButton = true;
    if (typeof(e.button) != 'undefined' && e.button == 2) callback_this.isRightButton = true;

    callback_this.onDragStart(callback_this.curSource);
    callback_this.curTargetId = null;
    callback_this.onDragTargetLost(null);
    callback_this.hasDragged = false;
    callback_this.cacheTargets();
    return false;
  };

  this.dragMove = function(e) {
    callback_this.hasDragged = true;
    e = callback_this.fixE(e);

    // if no mouse button is depressed we should stop.
    if (e.which == 0) {
      return callback_this.dragEnd();
    }

    var ey    = e.clientY;
    var ex    = e.clientX;
    var y = parseInt(callback_this.surrogate.style.top);
    var x = parseInt(callback_this.surrogate.style.left);

    var nx = (callback_this.xMapper) ?
             callback_this.xMapper(x, x-callback_this.surrogateInitialX) :
             (x + (ex - callback_this.surrogate.lastMouseX));
    var ny = (callback_this.yMapper) ?
             callback_this.yMapper(y, y-callback_this.surrogateInitialY) :
             (y + (ey - callback_this.surrogate.lastMouseY));

    var cx = nx + (callback_this.surrogate.offsetWidth / 2);
    var cy = ny + (callback_this.surrogate.offsetHeight / 2);

    callback_this.surrogate.style["left"] = nx + "px";
    callback_this.surrogate.style["top"] = ny + "px";
    callback_this.surrogate.lastMouseX    = ex;
    callback_this.surrogate.lastMouseY    = ey;

    var targetId = null;
    for (var id in callback_this.target_) {
      if ((targetId != null)
       && (callback_this.targetPriority_[id] < callback_this.targetPriority_[targetId])) {
        continue;
      }
      if ((cx >= callback_this.targetLeft_[id])
       && (cx <= callback_this.targetRight_[id])
       && (cy >= callback_this.targetTop_[id])
       && (cy <= callback_this.targetBottom_[id])) {
        targetId = id;
      }
    }

    if (callback_this.curTargetId != targetId) {
      // there has been a change.  Do something!
      if (targetId == null) {
        var lastTarget = callback_this.target_[callback_this.curTargetId];
        callback_this.curTargetId = null;
        callback_this.onDragTargetLost(lastTarget);
      } else if (callback_this.curTargetId == null) {
        callback_this.curTargetId = targetId;
        callback_this.onDragTargetHit(callback_this.target_[targetId], null);
      } else {
        var lastTarget = callback_this.target_[callback_this.curTargetId];
        callback_this.curTargetId = targetId;
        callback_this.onDragTargetHit(callback_this.target_[targetId], lastTarget);
      }
    }

    if (callback_this.documentPreviousOnMouseMove != null) {
      callback_this.documentPreviousOnMouseMove();
    }
    
    return false;
  };

  this.dragEnd = function() {
    document.onmousemove = callback_this.documentPreviousOnMouseMove;
    document.onmouseup  = callback_this.documentPreviousOnMouseUp;

    callback_this.surrogate.innerHTML = "";
    callback_this.isDragging = false;

    var hd = callback_this.hasDragged;
    callback_this.hasDragged = false;
    if (callback_this.curSource != null) {
      callback_this.onDragEnd(callback_this.curSource, callback_this.target_[callback_this.curTargetId]);
      if (!hd) {
        callback_this.onDragClick(callback_this.curSource);
      }
    }
    callback_this.curSource = null;

    if (callback_this.documentPreviousOnMouseUp != null) {
      callback_this.documentPreviousOnMouseUp();
    }
    return false;
  };
}

