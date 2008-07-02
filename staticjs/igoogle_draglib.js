/* Copyright 2006 Google Inc. All Rights Reserved.
 * @author Wei-Hwa Huang (weihwa.feedback@gmail.com)
 * @author Justin Mattson - only updateSource, and
 *   addOrUpdateSource methods
 * @author Aaron Boodman (original concept)
 *
 * A library for game-like dragging in Google Gadgets.
 * See: http://wiki.corp.google.com/twiki/bin/view/Main/RemoteModuleDrag
 */

///////////////////////////////////////////////
//  _IG_DragPosition
//
//  These functions gets the absolute (within an iFrame) position of the object.
//  They should work on most browsers.

function _IG_DragPosition_left(o) {
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

function _IG_DragPosition_right(o) {
  return _IG_DragPosition_left(o) + o.offsetWidth;
}

function _IG_DragPosition_top(o) {
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

function _IG_DragPosition_bottom(o) {
  return _IG_DragPosition_top(o) + o.offsetHeight;
}

/**
 * This is the Dragging object.
 *
 * This is a (heavily) modified form of dom-drag.js from
 * http://youngpup.net/2001/domdrag
 * The original is written by Aaron Boodman, who works at Google.
 *
 * Modfied such that it uses a "surrogate" item for dragging instead of
 * allowing dragging of the actual item.
 *
 * We also keep a list of "drag source"s (items where a drag can start)
 * and "drag target"s (items where a drag can end).
 *
 * @constructor
 */

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
  this.documentPreviousOnMouseMove_ = null;
  this.documentPreviousOnMouseUp_ = null;

 // other initialization lines

  this.makeCallbackFunctions();
}

/**
 * Sample mapper: doesn't move in the given dimension.
 * @param {integer} abs Absolute position
 * @param {integer} rel Relative position
 * @return {integer} correct position
 */
_IG_Drag.prototype.noMoveMapper = function(abs, rel) {
  return abs - rel;
};

// Callback functions

_IG_Drag.prototype.onDragStart = function(newSource) {};
_IG_Drag.prototype.onDragTargetHit = function(newTarget, lastTarget) {};
_IG_Drag.prototype.onDragTargetLost = function(lastTarget) {};
_IG_Drag.prototype.onDragEnd = function(source, target) {};
_IG_Drag.prototype.onDragClick = function(source) {};

/**
 * Creates a surrogate if it doesn't already exist.
 */
_IG_Drag.prototype.ensureSurrogateExists = function() {
  if (!this.surrogate) {
    this.surrogate = document.createElement('SPAN');
    this.surrogate.innerHTML = '';
    this.surrogate.style['position'] = 'absolute';
    this.surrogate.style['cursor'] = 'move';
    this.surrogate.style['left'] = this.surrogateInitialX + 'px';
    this.surrogate.style['top'] = this.surrogateInitialY + 'px';
    document.body.appendChild(this.surrogate);
  }
};

/**
 * The source already exists, so just update the surrogate
 * view for it.
 * @param {string} id The id of the DOM object we're operating on.
 * @param {Object} object Some kind of DOM object that we're operating on. If
 *     omitted the 'id' parameter will be used to try to retrieve the object.
 * @param {Object} view Some kind of DOM object to display while the source
 *     object is being dragged. If omitted, the object's default view will
 *     be displayed while the object is being dragged.
 * @return {boolean} True if the source could be added or updated, false if it
 *     could not be. This method should always succeed.
 */
_IG_Drag.prototype.addOrUpdateSource = function(id, object, view) {
  // we could inspect whether 'object' is an object or not here
  // to save the couple of lines of code, but this change
  // would not be backward compatible
  return this.addSource(id, object, view) ||
      this.updateSource(id, object, view);
};

/**
 * Add the given source.
 * @param {string} id The id of the DOM object we're operating on.
 * @param {Object} object Some kind of DOM object that we're operating on. If
 *     omitted the 'id' parameter will be used to try to retrieve the object.
 * @param {Object} view Some kind of DOM object to display while the source
 *     object is being dragged. If omitted, the object's default view will
 *     be displayed while the object is being dragged.
 * @return {boolean} True if the source could be added.
 *     This method should always succeed.
 */
_IG_Drag.prototype.addSource = function(id, object, view) {
  if (typeof(object) == 'undefined') {
    object = _gel(id);
  }
  if (typeof(this.source_[id]) != 'undefined') {
    // This source is already added; don't do anything.
    return false;
  }
  this.source_[id] = object;
  if (typeof(view) != 'undefined') {
    object._IG_DragSurrogateView = view;
  }
  this.sourcePreviousOnMouseDown_[id] = object.onmousedown;
  object.onmousedown = this.dragStart;
  this.sourcePreviousStyleCursor_[id] = object.style.cursor;
  object.style.cursor = (navigator.appName == 'Microsoft Internet Explorer') ?
                        'hand' :
                        'pointer';
  return true;
};

/**
 * The source already exists, so just update the surrogate
 * view for it.
 * @param {string} id The id of the DOM object we're operating on.
 * @param {Object} object Some kind of DOM object that we're operating on. If
 *     omitted the 'id' parameter will be used to try to retrieve the object.
 * @param {Object} view Some kind of DOM object to display while the source
 *     object is being dragged. If omitted, the object's default view will
 *     be displayed while the object is being dragged.
 * @return {boolean} True if the source could be updated, false if it could
 *     not, typically because we currently aren't aware of the object specified
 *     by the 'id' or 'object' parameters
 */
_IG_Drag.prototype.updateSource = function(id, object, view) {
  if (typeof(object) == 'undefined') {
    object = _gel(id);
  }
  if (typeof(this.source_[id]) == 'undefined') {
    // We don't know about this source, we can't update it
    return false;
  }
  if (typeof(view) != 'undefined') {
    object._IG_DragSurrogateView = view;
  }
};

/**
  * @type {_IG_Drag}
  *
  * Removes a given source.
  * @param {String} id ID of the source
  */
_IG_Drag.prototype.removeSource = function(id) {
  if (typeof(this.source_[id]) != 'undefined') {
    this.source_[id].onmousedown = this.sourcePreviousOnMouseDown_[id];
    if (typeof(this.source_[id].style) != 'undefined') {
      this.source_[id].style.cursor = this.sourcePreviousStyleCursor_[id];
    }
  }
  delete this.source_[id];
};

/**
  * @type {_IG_Drag}
  *
  * Removes all sources.
  */
_IG_Drag.prototype.removeAllSources = function() {
  for (var id in this.source_) {
    this.source_[id].onmousedown = this.sourcePreviousOnMouseDown_[id];
    if (typeof(this.source_[id].style) != 'undefined') {
      this.source_[id].style.cursor = this.sourcePreviousStyleCursor_[id];
    }
  }
  this.source_ = {};
};

/**
  * @type {_IG_Drag}
  *
  * Adds a target.
  *
  * @param {String} id ID of the target
  * @param {Object} object The target
  * @param {Integer} priority Priority of the target
  */
_IG_Drag.prototype.addTarget = function(id, object, priority) {
  if (typeof(object) == 'undefined') {
    object = _gel(id);
  }
  if (typeof(priority) == 'undefined') {
    priority = 0;
  }
  this.target_[id] = object;
  this.targetPriority_[id] = priority;
};

/**
  * @type {_IG_Drag}
  *
  * Removes a specified target.
  *
  * @param {String} id ID of the target
  */
_IG_Drag.prototype.removeTarget = function(id) {
  delete this.target_[id];
};

/**
  * @type {_IG_Drag}
  *
  * Removes all targets.
  */
_IG_Drag.prototype.removeAllTargets = function() {
  this.target_ = {};
};

/**
  * @type {_IG_Drag}
  *
  * Caches the targets.
  */
_IG_Drag.prototype.cacheTargets = function() {
  this.targetLeft_ = {};
  this.targetRight_ = {};
  this.targetTop_ = {};
  this.targetBottom_ = {};
  for (var id in this.target_) {
    this.targetLeft_[id] =
      _IG_DragPosition_left(this.target_[id]) - this.leftMargin;
    this.targetRight_[id] =
      _IG_DragPosition_right(this.target_[id]) + this.rightMargin;
    this.targetTop_[id] =
      _IG_DragPosition_top(this.target_[id]) - this.topMargin;
    this.targetBottom_[id] =
      _IG_DragPosition_bottom(this.target_[id]) + this.bottomMargin;
  }
};

/**
  * @type {_IG_Drag}
  *
  * Adds the necessary fields to the event object if they don't
  * exist (because of browser differences).
  *
  * @return {Object} the event
  * @param {Object} e the event
  */
_IG_Drag.prototype.fixE = function(e) {
  if (typeof e == 'undefined') e = window.event;
  if (typeof e.layerX == 'undefined') e.layerX = e.offsetX;
  if (typeof e.layerY == 'undefined') e.layerY = e.offsetY;
  return e;
};

/**
  * @type {_IG_Drag}
  *
  * Creates the callback functions.
  */
_IG_Drag.prototype.makeCallbackFunctions = function() {
  var cbthis = this;  // cbthis always points to the _IG_Drag object.

  this.dragStart = function(e) {
    if (cbthis.isDragging) {
      // we're in a weird state where we attempted to start again
      // before finishing the last one.
      cbthis.dragEnd();
    }
    cbthis.curSource = this;
    e = cbthis.fixE(e);
    cbthis.isDragging = true;
    cbthis.ensureSurrogateExists();
    var tp = typeof(cbthis.curSource._IG_DragSurrogateView);
    if (tp == 'undefined') {
      cbthis.surrogate.innerHTML = cbthis.curSource.innerHTML;
    } else if (tp == 'boolean' || tp == 'number' || tp == 'string') {
      cbthis.surrogate.innerHTML = cbthis.curSource._IG_DragSurrogateView;
    } else {
      // assume it's an object, remove all children and replace with this.
      while (cbthis.surrogate.firstChild) {
        cbthis.surrogate.removeChild(cbthis.surrogate.firstChild);
      }
      cbthis.surrogate.appendChild(cbthis.curSource._IG_DragSurrogateView);
    }
    cbthis.surrogateInitialX = _IG_DragPosition_left(cbthis.curSource) +
                                 cbthis.surrogateOffsetX;
    if (typeof(cbthis.curSource._IG_Drag_surrogateOffsetX) != 'undefined') {
      cbthis.surrogateInitialX += cbthis.curSource._IG_Drag_surrogateOffsetX;
    }
    cbthis.surrogateInitialY = _IG_DragPosition_top(cbthis.curSource) +
                                 cbthis.surrogateOffsetY;
    if (typeof(cbthis.curSource._IG_Drag_surrogateOffsetY) != 'undefined') {
      cbthis.surrogateInitialY += cbthis.curSource._IG_Drag_surrogateOffsetY;
    }
    cbthis.surrogate.style.left = cbthis.surrogateInitialX + 'px';
    cbthis.surrogate.style.top = cbthis.surrogateInitialY + 'px';
    cbthis.surrogate.lastMouseX = e.clientX;
    cbthis.surrogate.lastMouseY = e.clientY;

    cbthis.documentPreviousOnMouseMove_ = document.onmousemove;
    cbthis.documentPreviousOnMouseUp_ = document.onmouseup;
    document.onmousemove = cbthis.dragMove;
    document.onmouseup = cbthis.dragEnd;

    cbthis.isRightButton = false;
    if (e.which && e.which == 3) {
      cbthis.isRightButton = true;
    }
    if (typeof(e.button) != 'undefined' && e.button == 2) {
      cbthis.isRightButton = true;
    }

    cbthis.onDragStart(cbthis.curSource);
    cbthis.curTargetId = null;
    cbthis.onDragTargetLost(null);
    cbthis.hasDragged = false;
    cbthis.cacheTargets();
    return false;
  };

  this.dragMove = function(e) {
    cbthis.hasDragged = true;
    e = cbthis.fixE(e);

    // if no mouse button is depressed we should stop.
    if (e.which == 0) {
      return cbthis.dragEnd();
    }

    var ey = e.clientY;
    var ex = e.clientX;
    var y = parseInt(cbthis.surrogate.style.top, 10);
    var x = parseInt(cbthis.surrogate.style.left, 10);

    var nx = (cbthis.xMapper) ?
             cbthis.xMapper(x, x - cbthis.surrogateInitialX) :
             (x + (ex - cbthis.surrogate.lastMouseX));
    var ny = (cbthis.yMapper) ?
             cbthis.yMapper(y, y - cbthis.surrogateInitialY) :
             (y + (ey - cbthis.surrogate.lastMouseY));

    var cx = nx + (cbthis.surrogate.offsetWidth / 2);
    var cy = ny + (cbthis.surrogate.offsetHeight / 2);

    cbthis.surrogate.style['left'] = nx + 'px';
    cbthis.surrogate.style['top'] = ny + 'px';
    cbthis.surrogate.lastMouseX = ex;
    cbthis.surrogate.lastMouseY = ey;

    var targetId = null;
    for (var id in cbthis.target_) {
      if ((targetId != null) &&
          (cbthis.targetPriority_[id] < cbthis.targetPriority_[targetId])) {
        continue;
      }
      if ((cx >= cbthis.targetLeft_[id]) &&
          (cx <= cbthis.targetRight_[id]) &&
          (cy >= cbthis.targetTop_[id]) &&
          (cy <= cbthis.targetBottom_[id])) {
        targetId = id;
      }
    }

    if (cbthis.curTargetId != targetId) {
      // there has been a change.  Do something!
      if (targetId == null) {
        var lastTarget = cbthis.target_[cbthis.curTargetId];
        cbthis.curTargetId = null;
        cbthis.onDragTargetLost(lastTarget);
      } else if (cbthis.curTargetId == null) {
        cbthis.curTargetId = targetId;
        cbthis.onDragTargetHit(cbthis.target_[targetId], null);
      } else {
        var lastTarget = cbthis.target_[cbthis.curTargetId];
        cbthis.curTargetId = targetId;
        cbthis.onDragTargetHit(cbthis.target_[targetId], lastTarget);
      }
    }

    if (cbthis.documentPreviousOnMouseMove_ != null) {
      cbthis.documentPreviousOnMouseMove_();
    }

    return false;
  };

  this.dragEnd = function() {
    document.onmousemove = cbthis.documentPreviousOnMouseMove_;
    document.onmouseup = cbthis.documentPreviousOnMouseUp_;

    cbthis.surrogate.innerHTML = '';
    cbthis.isDragging = false;

    var hd = cbthis.hasDragged;
    cbthis.hasDragged = false;
    if (cbthis.curSource != null) {
      cbthis.onDragEnd(cbthis.curSource, cbthis.target_[cbthis.curTargetId]);
      if (!hd) {
        cbthis.onDragClick(cbthis.curSource);
      }
    }
    cbthis.curSource = null;

    if (cbthis.documentPreviousOnMouseUp_ != null) {
      cbthis.documentPreviousOnMouseUp_();
    }
    return false;
  };
};

