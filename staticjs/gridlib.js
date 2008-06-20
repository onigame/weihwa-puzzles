/* Copyright 2006 Google Inc.  All Rights Reserved.
 * @author Wei-Hwa Huang (whuang@google.com)
 *
 * A library for a grid that supports draggin using the draglib library.
 * See: http://wiki.corp.google.com/twiki/bin/view/Main/RemoteModuleGrid
 *
 * Note: to use this, you must first load the drag object from
 * igoogle_draglib.js.
 *
 */

/**
  * @constructor
  */
function _IG_Grid(object, name, height, width) {

  this.dataObject = arguments[0];
  // requires the following methods:
  //   _IGG_getNormalView(index)
  //     returns the HTML content of the cell when the user is not dragging.
  //   _IGG_isDragSource(index)
  //     boolean, tells whether is source.
  //   _IGG_isDragTarget(index, sourceIndex)
  //     boolean, tells whether is target.
  //
  // these functions are not required, but if they do not exist,
  // _IGG_getNormalView(index) will be called instead:
  //   _IGG_getSurrogateView(index)
  //     returns the surrogate view when index is being dragged
  //   _IGG_getSourceView(source, target)
  //     returns the HTML content of the cell when it is the source
  //     and the user is dragging.
  //   _IGG_getTargetView(target, source)
  //     returns the HTML content of the cell when it is the target
  //     and the user is dragging.
  //   _IGG_getPossibleTargetView(potential_target, source)
  //     returns the HTML content of the cell when it is a
  //     possible target (but not the target) and the user is dragging.
  //   _IGG_getDragView(index, source)
  //     returns the HTML content of the cell when it is not a
  //     potential target nor the source and the user is dragging.
  //
  // these functions are not required, but will be called if they exist
  // and the conditions apply:
  //   _IGG_handleClick(source)
  //     implements the necessary changes when the user has clicked the source.
  //   _IGG_handleDragStart(source)
  //     implements the necessary changes when the user has started dragging.
  //   _IGG_handleDrag(source, target)
  //     implements the necessary changes when the user has
  //     dragged source to target.
  //     Note: We expect this function to call the refresh of
  //     source and target if it is necessary.
  //   _IGG_handleOnDragStart(object)
  //   _IGG_handleOnDragTargetHit(object)
  //   _IGG_handleOnDragTargetLost()
  //   _IGG_handleOnDragEnd(object, object)
  //   _IGG_handleOnDragClick(object)
  //     called when the Grid can't handle the Drag request because the
  //     relevant index is not in the table.
  //
  // the following callback methods will be created:
  //   _IGG_refreshCell(index)
  //   _IGG_refreshAll()

  this.name = arguments[1];
  this.height = arguments[2];
  this.width = arguments[3];
  this.maxIndex = this.height * this.width - 1;

  this.table = null;
  this.cells = new Array();

  this.source = -1;
  this.target = -1;

  this.dragHandler = new _IG_Drag();

  // callback functions.

  var callback_this = this;

  this.dataObject._IGG_refreshCell = function (index) {
    callback_this.refreshCell(index);
  }

  this.dataObject._IGG_refreshAll = function () {
    callback_this.refreshAll();
  }

  // subroutines.
  this.refreshCell = IG_Grid_refreshCell;
  this.refreshAll = IG_Grid_refreshAll;
  this.addDragSource = IG_Grid_addDragSource;
  this.removeDragSource = IG_Grid_removeDragSource;
  this.refreshDragSources = IG_Grid_refreshDragSources;
  this.refreshDragTargets = IG_Grid_refreshDragTargets;
  this.refreshDragNonTargets = IG_Grid_refreshDragNonTargets;
  this.calculateDragTargets = IG_Grid_calculateDragTargets;
  this.getCellName = IG_Grid_getCellName;
  this.getCellTDID = IG_Grid_getCellTDID;
  this.getCellIndexFromName = IG_Grid_getCellIndexFromName;
  this.getCellValue = IG_Grid_getCellValue;
  this.getTable = IG_Grid_getTable;
  this.getCell = IG_Grid_getCell;
  this.makeNewTable = IG_Grid_makeNewTable;
  this.handleOnDragStart = IG_Grid_handleOnDragStart;
  this.handleOnDragEnd = IG_Grid_handleOnDragEnd;
  this.handleOnDragTargetHit = IG_Grid_handleOnDragTargetHit;
  this.handleOnDragTargetLost = IG_Grid_handleOnDragTargetLost;
  this.handleOnDragClick = IG_Grid_handleOnDragClick;
  this.setXMapper = IG_Grid_setXMapper;
  this.setYMapper = IG_Grid_setYMapper;
  this.isRightButton = IG_Grid_isRightButton;
  this.initDragging = IG_Grid_initDragging;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_refreshCell(index) {
  if (index < 0) return; if (index > this.maxIndex) return;
  if (typeof(this.cells[index]) == 'undefined' || this.cells[index] == null) {
    return;
  }
  this.cells[index].innerHTML = this.getCellValue(index);
  if (this.dataObject._IGG_isDragSource(index)) {
    this.addDragSource(index);
  }
}

function IG_Grid_refreshAll() {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (typeof(this.cells[i]) == 'undefined' || this.cells[i] == null) {
      continue;
    }
    this.refreshCell(i);
  }
  this.refreshDragSources();
  this.refreshDragTargets(this.source);
}

function IG_Grid_addDragSource(index) {
  if (index < 0 || index > this.maxIndex) return;
  if (typeof(this.cells[index]) == 'undefined' || this.cells[index] == null) {
    return;
  }
  var name = this.getCellName(index);
  var surrogate_view = null;
  if (typeof(this.dataObject._IGG_getSurrogateView) == 'undefined'
      || this.dataObject._IGG_getSurrogateView == null) {
    surrogate_view = this.dataObject._IGG_getNormalView(index);
  } else {
    surrogate_view = this.dataObject._IGG_getSurrogateView(index);
  }
  this.dragHandler.addOrUpdateSource(name, _gel(name), surrogate_view);
}

function IG_Grid_removeDragSource(index) {
  if (index < 0 || index > this.maxIndex) return;
  if (typeof(this.cells[index]) == 'undefined' || this.cells[index] == null)
    return;
  var name = this.getCellName(index);
  this.dragHandler.removeSource(name);
}

function IG_Grid_refreshDragSources() {
  this.dragHandler.removeAllSources();
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (typeof(this.cells[i]) == 'undefined' || this.cells[i] == null) {
      continue;
    }
    if (this.dataObject._IGG_isDragSource(i)) {
      var name = this.getCellName(i);
      var surrogate_view = null;
      if (typeof(this.dataObject._IGG_getSurrogateView) == 'undefined'
          || this.dataObject._IGG_getSurrogateView == null) {
        surrogate_view = this.dataObject._IGG_getNormalView(i);
      } else {
        surrogate_view = this.dataObject._IGG_getSurrogateView(i);
      }
      this.dragHandler.addOrUpdateSource(name, _gel(name), surrogate_view);
    }
  }
}

function IG_Grid_refreshDragTargets(sourceIndex) {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (typeof(this.cells[i]) == 'undefined' || this.cells[i] == null) {
      continue;
    }
    if (this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      this.refreshCell(i);
    }
  }
}

function IG_Grid_refreshDragNonTargets(sourceIndex) {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (typeof(this.cells[i]) == 'undefined' || this.cells[i] == null) continue;
    if (!this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      this.refreshCell(i);
    }
  }
}

function IG_Grid_calculateDragTargets(sourceIndex) {
  this.dragHandler.removeAllTargets();
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (typeof(this.cells[i]) == 'undefined' || this.cells[i] == null) continue;
    if (this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      var name = this.getCellName(i);
      this.dragHandler.addTarget(name, _gel(name), 0);
    }
  }
}

function IG_Grid_getCellName(index) {
  return ('cell_' + this.name + '_' + index + '___MODULE_ID__');
}

function IG_Grid_getCellTDID(index) {
  return ('celltd_' + this.name + '_' + index + '___MODULE_ID__');
}

function IG_Grid_getCellIndexFromName(id) {
  var regexp = new RegExp('cell_' + this.name + '_' +
                          '(.*)' + '___MODULE_ID__');
  var matches = regexp.exec(id);
  if (matches == null) return -1;
  if (matches.length == 0) return -1;
  return (matches[1] * 1);
}

function IG_Grid_getCellValue(index) {
  if (!this.dragHandler.isDragging) {
    return this.dataObject._IGG_getNormalView(index);
  } else if (this.source == index) {
    if (typeof(this.dataObject._IGG_getSourceView) == 'undefined'
        || this.dataObject._IGG_getSourceView == null) {
      return this.dataObject._IGG_getNormalView(index);
    } else {
      return this.dataObject._IGG_getSourceView(this.source, this.target);
    }
  } else if (this.target == index) {
    if (typeof(this.dataObject._IGG_getTargetView) == 'undefined'
        || this.dataObject._IGG_getTargetView == null) {
      return this.dataObject._IGG_getNormalView(index);
    } else {
      return this.dataObject._IGG_getTargetView(index, this.source);
    }
  } else if (this.dataObject._IGG_isDragTarget(index, this.source)) {
    if (typeof(this.dataObject._IGG_getPossibleTargetView) == 'undefined'
        || this.dataObject._IGG_getPossibleTargetView == null) {
      return this.dataObject._IGG_getNormalView(index);
    } else {
      return this.dataObject._IGG_getPossibleTargetView(index, this.source);
    }
  } else {
    if (typeof(this.dataObject._IGG_getDragView) == 'undefined'
        || this.dataObject._IGG_getDragView == null) {
      return this.dataObject._IGG_getNormalView(index);
    } else {
      return this.dataObject._IGG_getDragView(index, this.source);
    }
  }
}

function IG_Grid_getTable() {
  if (this.table == null) {
    this.makeNewTable();
  }
  return this.table;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_getCell(index) {
  if (index < 0) return null;
  if (typeof(this.cells[index]) == 'undefined' || (this.cells[index] == null)) {
    this.cells[index] = document.createElement('span');
    this.cells[index].id = this.getCellName(index);
    this.cells[index].innerHTML = this.getCellValue(index);
    if (index > this.maxIndex) this.maxIndex = index;
  }
  return this.cells[index];
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_makeNewTable() {
  // Calling this code repeatedly make cause too much garbage.
  // Do you really trust Javascript's garbage collection?
  var tablenode = document.createElement('table');
  var tablebody = document.createElement('tbody');
  for (var row = 0; row < this.height; ++row) {
    var rownode = document.createElement('tr');
    for (var col = 0; col < this.width; ++col) {
      var datanode = document.createElement('td');
      datanode.align = "center";
      datanode.id = this.getCellTDID(row * this.width + col);
      datanode.appendChild(this.getCell(row * this.width + col));
      rownode.appendChild(datanode);
    }
    tablebody.appendChild(rownode);
  }
  tablenode.appendChild(tablebody);
  this.table = tablenode;
  return tablenode;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_handleOnDragStart(source_index) {
  this.source = source_index;
  this.target = -1;
  this.calculateDragTargets(this.source);
  this.refreshDragTargets(this.source);
  if (typeof(this.dataObject._IGG_getDragView) != 'undefined'
      && this.dataObject._IGG_getDragView != null) {
    this.refreshDragNonTargets(this.source);
  }
  this.refreshCell(this.source);
  if (typeof(this.dataObject._IGG_handleDragStart) != 'undefined')
    this.dataObject._IGG_handleDragStart(this.source);
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_handleOnDragEnd(source_index, target_index) {
  this.source = -1;
  this.target = -1;
  if (typeof(this.dataObject._IGG_handleDrag) != 'undefined') {
    this.dataObject._IGG_handleDrag(source_index, target_index);
  } else {
    this.refreshCell(source_index);
    this.refreshCell(target_index);
  }
  if (typeof(this.dataObject._IGG_getPossibleTargetView) != 'undefined'
      && this.dataObject._IGG_getPossibleTargetView != null) {
    this.refreshDragTargets(source_index);
  }
  if (typeof(this.dataObject._IGG_getDragView) != 'undefined'
      && this.dataObject._IGG_getDragView != null) {
    this.refreshDragNonTargets(source_index);
  }
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_handleOnDragTargetHit(target_index) {
  var last_target = this.target;
  this.target = target_index;
  this.refreshCell(last_target);
  this.refreshCell(this.target);
  this.refreshCell(this.source);
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_handleOnDragTargetLost(last_target) {
  var last_target = this.target;
  this.target = -1;
  this.refreshCell(last_target);
  this.refreshCell(this.source);
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_handleOnDragClick(index) {
  this.source = -1;
  this.target = -1;
  if (typeof(this.dataObject._IGG_handleClick) != 'undefined')
    this.dataObject._IGG_handleClick(index);
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_setXMapper(mapper) {
  this.dragHandler.xMapper = mapper;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_setYMapper(mapper) {
  this.dragHandler.yMapper = mapper;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_isRightButton() {
  return this.dragHandler.isRightButton;
}

/**
  * @this {_IG_Grid}
  */
function IG_Grid_initDragging() {
  this.refreshDragSources();

  var callback_this = this;

  this.dragHandler.onDragStart = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGG_handleOnDragStart)
           != 'undefined')
        callback_this.dataObject._IGG_handleOnDragStart(object);
    } else {
      callback_this.handleOnDragStart(index);
    }
  }

  this.dragHandler.onDragEnd = function (object1, object2) {
    var index1 = callback_this.getCellIndexFromName(object1.id);
    if (index1 == -1) {
      if (typeof(callback_this.dataObject._IGG_handleOnDragEnd) != 'undefined')
        callback_this.dataObject._IGG_handleOnDragEnd(object1, object2);
    } else if (object2 == null) {
      callback_this.handleOnDragEnd(index1, -1);
    } else {
      var index2 = callback_this.getCellIndexFromName(object2.id);
      if (index2 == -1) {
        if (typeof(callback_this.dataObject._IGG_handleOnDragEnd)
             != 'undefined')
          callback_this.dataObject._IGG_handleOnDragEnd(object1, object2);
      } else {
        callback_this.handleOnDragEnd(index1, index2);
      }
    }
  }

  this.dragHandler.onDragTargetHit = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGG_handleOnDragTargetHit)
           != 'undefined')
        callback_this.dataObject._IGG_handleOnDragTargetHit(object);
    } else {
      callback_this.handleOnDragTargetHit(index);
    }
  }

  this.dragHandler.onDragTargetLost = function (old_object) {
    if (callback_this.target == -1) {
      if (typeof(callback_this.dataObject._IGG_handleOnDragTargetLost)
           != 'undefined')
        callback_this.dataObject._IGG_handleOnDragTargetLost(old_object);
    } else {
      callback_this.handleOnDragTargetLost(old_object);
    }
  }

  this.dragHandler.onDragClick = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGG_handleOnDragClick)
           != 'undefined')
        callback_this.dataObject._IGG_handleOnDragClick(object);
    } else {
      callback_this.handleOnDragClick(index);
    }
  }

}
