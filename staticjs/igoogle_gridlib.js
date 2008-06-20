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
  *
  * Creates the Grid object.
  *
  * @param {Object} object Backend object for the grid.
  *
  * The backend object should implement the following methods:
  *    _IGG_getNormalView(index)
  *      returns the HTML content of the cell when the user is not dragging.
  *    _IGG_isDragSource(index)
  *      boolean, tells whether is source.
  *    _IGG_isDragTarget(index, sourceIndex)
  *      boolean, tells whether is target.
  *
  *  these functions are not required, but if they do not exist,
  *  _IGG_getNormalView(index) will be called instead:
  *    _IGG_getSurrogateView(index)
  *      returns the surrogate view when index is being dragged
  *    _IGG_getSourceView(source, target)
  *      returns the HTML content of the cell when it is the source
  *      and the user is dragging.
  *    _IGG_getTargetView(target, source)
  *      returns the HTML content of the cell when it is the target
  *      and the user is dragging.
  *    _IGG_getPossibleTargetView(potential_target, source)
  *      returns the HTML content of the cell when it is a
  *      possible target (but not the target) and the user is dragging.
  *    _IGG_getDragView(index, source)
  *      returns the HTML content of the cell when it is not a
  *      potential target nor the source and the user is dragging.
  *
  *  these functions are not required, but will be called if they exist
  *  and the conditions apply:
  *    _IGG_handleClick(source)
  *      implements the necessary changes when the user has clicked the source.
  *    _IGG_handleDragStart(source)
  *      implements the necessary changes when the user has started dragging.
  *    _IGG_handleDrag(source, target)
  *      implements the necessary changes when the user has
  *      dragged source to target.
  *      Note: We expect this function to call the refresh of
  *      source and target if it is necessary.
  *    _IGG_handleOnDragStart(object)
  *    _IGG_handleOnDragTargetHit(object)
  *    _IGG_handleOnDragTargetLost()
  *    _IGG_handleOnDragEnd(object, object)
  *    _IGG_handleOnDragClick(object)
  *      called when the Grid can't handle the Drag request because the
  *      relevant index is not in the table.
  * 
  *  the following callback methods will be created in the backend object:
  *    _IGG_refreshCell(index)
  *    _IGG_refreshAll()
  *
  * @param {String} name Unique identifier string for the grid.
  * @param {Integer} height Number of rows.
  * @param {Integer} width Number of columns.
  */
function _IG_Grid(object, name, height, width) {

  this.dataObject = object;
  this.name = name;
  this.height = height;
  this.width = width;
  this.maxIndex = this.height * this.width - 1;

  this.table = null;
  this.cells = new Array();

  this.source = -1;
  this.target = -1;

  this.dragHandler = new _IG_Drag();

  // define some callback functions.

  var cb_this = this;

  this.dataObject._IGG_refreshCell = function(index) {
    cb_this.refreshCell(index);
  }

  this.dataObject._IGG_refreshAll = function() {
    cb_this.refreshAll();
  }

  // subroutines.
  this.cellValid = IG_Grid_cellValid;
  this.functionValid = IG_Grid_functionValid;
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
  this.getSurrogateView = IG_Grid_getSurrogateView;
  this.tryUpdateCellContents = IG_Grid_tryUpdateCellContents;
  this.updateCellContentsNormal = IG_Grid_updateCellContentsNormal;
  this.updateCellContents = IG_Grid_updateCellContents;
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
  *
  * Helper function.
  * @return {Boolean} true iff the given index contains valid data.
  * @type Boolean
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_cellValid(index) {
  if (typeof(this.cells[index]) == 'undefined') return false;
  if (this.cells[index] == null) return false;
  return true;
}

/**
  * @this {_IG_Grid}
  *
  * Helper function.
  * @return {Boolean} true iff the backend has the given function name defined.
  *
  * @param {String} func_name The name of the function.
  */
function IG_Grid_functionValid(func_name) {
  return (typeof(this.dataObject[func_name]) == 'function');
}

/**
  * @this {_IG_Grid}
  *
  * Refreshes a cell in the grid.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_refreshCell(index) {
  if (index < 0) return;
  if (index > this.maxIndex) return;
  if (!this.cellValid(index)) return;
  this.updateCellContents(index);
  if (this.dataObject._IGG_isDragSource(index)) {
    this.addDragSource(index);
  }
}

/**
  * @this {_IG_Grid}
  *
  * Refreshes all cells in the grid.
  */
function IG_Grid_refreshAll() {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (!this.cellValid(i)) continue;
    this.refreshCell(i);
  }
  this.refreshDragSources();
  this.refreshDragTargets(this.source);
}

/**
  * @this {_IG_Grid}
  *
  * Declares a cell in the grid as a drag Source.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_addDragSource(index) {
  if (index < 0) return;
  if (index > this.maxIndex) return;
  if (!this.cellValid(index)) return;
  var name = this.getCellName(index);
  var surrogate_view = this.getSurrogateView(index);
  this.dragHandler.addOrUpdateSource(name, _gel(name), surrogate_view);
}

/**
  * @this {_IG_Grid}
  *
  * Removes a cell in the grid from being a drag Source.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_removeDragSource(index) {
  if (index < 0) return;
  if (index > this.maxIndex) return;
  if (!this.cellValid(index)) return;
  var name = this.getCellName(index);
  this.dragHandler.removeSource(name);
}

/**
  * @this {_IG_Grid}
  *
  * Goes through the whole grid and refreshes their drag Source
  * status.  This allows for any changes in surrogate views to be
  * instantiated.
  */
function IG_Grid_refreshDragSources() {
  this.dragHandler.removeAllSources();
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (!this.cellValid(i)) continue;
    if (this.dataObject._IGG_isDragSource(i)) {
      var name = this.getCellName(i);
      var surrogate_view = this.getSurrogateView(i);
      this.dragHandler.addOrUpdateSource(name, _gel(name), surrogate_view);
    }
  }
}

/**
  * @this {_IG_Grid}
  *
  * Refreshes all the valid drag targets for the given source.
  *
  * @param {Integer} sourceIndex The index of the source cell.
  */
function IG_Grid_refreshDragTargets(sourceIndex) {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (!this.cellValid(i)) continue;
    if (this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      this.refreshCell(i);
    }
  }
}

/**
  * @this {_IG_Grid}
  *
  * Refreshes all the cells that are not targets for the given source.
  * This might be useful in the case where the grid elements want
  * to display being invalid targets.
  *
  * @param {Integer} sourceIndex The index of the source cell.
  */
function IG_Grid_refreshDragNonTargets(sourceIndex) {
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (!this.cellValid(i)) continue;
    if (!this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      this.refreshCell(i);
    }
  }
}

/**
  * @this {_IG_Grid}
  *
  * Refreshes all the cells that are not targets for the given source.
  * This might be useful in the case where the grid elements want
  * to display being invalid targets.
  *
  * @param {Integer} sourceIndex The index of the source cell.
  */
function IG_Grid_calculateDragTargets(sourceIndex) {
  this.dragHandler.removeAllTargets();
  for (var i = 0; i <= this.maxIndex; ++i) {
    if (!this.cellValid(i)) continue;
    if (this.dataObject._IGG_isDragTarget(i, sourceIndex)) {
      var name = this.getCellName(i);
      this.dragHandler.addTarget(name, _gel(name), 0);
    }
  }
}

/**
  * @this {_IG_Grid}
  *
  * @return {String} The name of the cell with the given index, in string form.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_getCellName(index) {
  return ('cell_' + this.name + '_' + index + '___MODULE_ID__');
}

/**
  * @this {_IG_Grid}
  *
  * @return {String} The HTML ID f the cell's <TD> element, in string form.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_getCellTDID(index) {
  return ('celltd_' + this.name + '_' + index + '___MODULE_ID__');
}

/**
  * @this {_IG_Grid}
  *
  * Given a cell name, finds the numerical index of the cell.
  * The inverse function to getCellName().
  * @return {integer} The index.
  *
  * @param {String} id The name of the cell.
  */
function IG_Grid_getCellIndexFromName(id) {
  var regexp = new RegExp('cell_' + this.name + '_' +
                          '(.*)' + '___MODULE_ID__');
  var matches = regexp.exec(id);
  if (matches == null || matches.length == 0) {
    return -1;
  }
  return (matches[1] * 1);
}

/**
  * @this {_IG_Grid}
  *
  * @return {String or Object} the surrogate view of the specified cell index.
  * This defaults to the normal view if no surrogate view is defined.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_getSurrogateView(index) {
  if (this.functionValid('_IGG_getSurrogateView')) {
    return this.dataObject._IGG_getSurrogateView(index);
  } else {
    return this.dataObject._IGG_getNormalView(index);
  }
}


/**
  * @this {_IG_Grid}
  *
  * Tries to update the cell at the given location, using the specified
  * function name with given parameters.  This routine is internal and 
  * doesn't check for validity, but the function name should be one of:
  *    FUNCTION NAME                 PARAMETERS
  *    _IGG_getSurrogateView         (index)
  *    _IGG_getSourceView            (source, target)
  *    _IGG_getTargetView            (target, source)
  *    _IGG_getPossibleTargetView    (potential_target, source)
  *    _IGG_getDragView              (index, source)
  * as mentioned at the top of these docs.
  * If the function is not found, the cell is updated with the
  * normal view.
  *
  * @param {Integer} index The index of the cell.
  * @param {String} func The name of the function to call.
  * @param {any} param1 First parameter to pass to the function.
  * @param {any} param2 Second parameter to pass to the function.
  */
function IG_Grid_tryUpdateCellContents(index, func, param1, param2) {
  var tp = 'undefined';
  var obj = null;
  if (this.functionValid(func)) {
    obj = this.dataObject[func](param1, param2);
    tp = typeof(obj);
  }
  if (tp == 'boolean' || tp == 'number' || tp == 'string') {
    this.cells[index].innerHTML = obj;
    return;
  } else if (tp == 'undefined') {
    this.updateCellContentsNormal(index);
  } else {
    // remove everything from the cell first
    while (this.cells[index].firstChild) {
      this.cells[index].removeChild(this.cells[index].firstChild);
    }
    this.cells[index].appendChild(obj);
  }
}

//  Tries to update this.cells[index] with these functions from dataObject:
//     _IGG_getNormalViewObject
//     _IGG_getNormalView

/**
  * @this {_IG_Grid}
  *
  * Tries to update the view of the cell at the given index with
  * the user-defined "normal" view.
  * Based on what _IGG_getNormalView returns, it either adds it
  * as a DOM node, or as the innerHTML of the cell <TD>.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_updateCellContentsNormal(index) {
  var tp = 'undefined';
  var obj = null;
  if (this.functionValid('_IGG_getNormalView')) {
    obj = this.dataObject._IGG_getNormalView(index);
    tp = typeof(obj);
  }
  if (tp == 'boolean' || tp == 'number' ||
      tp == 'string' || tp == 'undefined') {
    this.cells[index].innerHTML = obj;
  } else {
    // remove everything from the cell first
    while (this.cells[index].firstChild) {
      this.cells[index].removeChild(this.cells[index].firstChild);
    }
    this.cells[index].appendChild(obj);
  }
}

/**
  * @this {_IG_Grid}
  *
  * Updates the view of the given cell.
  * What view the cell is updated with depends on what
  * state of dragging the grid is currently at.
  *
  * @param {Integer} index The index of the cell.
  */
function IG_Grid_updateCellContents(index) {
  if (!this.dragHandler.isDragging) {
    this.updateCellContentsNormal(index);
  } else if (this.source == index) {
    this.tryUpdateCellContents(index, '_IGG_getSourceView',
                               this.source, this.target);
  } else if (this.target == index) {
    this.tryUpdateCellContents(index, '_IGG_getTargetView',
                               index, this.source);
  } else if (this.dataObject._IGG_isDragTarget(index, this.source)) {
    this.tryUpdateCellContents(index, '_IGG_getPossibleTargetView',
                               index, this.source);
  } else {
    this.tryUpdateCellContents(index, '_IGG_getDragView',
                               index, this.source);
  }
}

/**
  * @this {_IG_Grid}
  *
  * @return {Node} The DOM node representing the Grid's <TABLE> element.
  */
function IG_Grid_getTable() {
  if (this.table == null) {
    this.makeNewTable();
  }
  return this.table;
}

/**
  * @this {_IG_Grid}
  *
  * @param {Integer} index The index of the cell.
  * @return {Node} The <TD> DOM node representing the cell with the given index.
  */
function IG_Grid_getCell(index) {
  if (index < 0) return null;
  if (typeof(this.cells[index]) == 'undefined' || (this.cells[index] == null)) {
    this.cells[index] = document.createElement('span');
    this.cells[index].id = this.getCellName(index);
    this.updateCellContents(index);
    if (index > this.maxIndex) this.maxIndex = index;
  }
  return this.cells[index];
}

/**
  * @this {_IG_Grid}
  *
  * Creates a DOM table for the grid.
  * Warning!  Don't call this code repeatedly because a lot of garbage
  * gets created.  Unless you trust Javascript's garbage collection.
  *
  * @return {Node} The DOM node representing the Grid's <TABLE> element.
  */
function IG_Grid_makeNewTable() {
  var tablenode = document.createElement('table');
  var tablebody = document.createElement('tbody');
  for (var row = 0; row < this.height; ++row) {
    var rownode = document.createElement('tr');
    for (var col = 0; col < this.width; ++col) {
      var datanode = document.createElement('td');
      datanode.align = 'center';
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
  *
  * Callback function invoked by the Drag API when the user
  * has begun dragging.
  * Calls the corresponding functions in the backend object
  * if it exists.
  *
  * @param {Integer} source_index The index of the source cell.
  */
function IG_Grid_handleOnDragStart(source_index) {
  this.source = source_index;
  this.target = -1;
  this.calculateDragTargets(this.source);
  this.refreshDragTargets(this.source);
  if (this.functionValid('_IGG_getDragView')) {
    this.refreshDragNonTargets(this.source);
  }
  this.refreshCell(this.source);
  if (this.functionValid('_IGG_handleDragStart')) {
    this.dataObject._IGG_handleDragStart(this.source);
  }
}

/**
  * @this {_IG_Grid}
  *
  * Callback function invoked by the Drag API when the user
  * has finished dragging.
  * Calls the corresponding functions in the backend object
  * if it exists.
  *
  * @param {Integer} source_index The index of the source cell.
  * @param {Integer} target_index The index of the target cell.
  */
function IG_Grid_handleOnDragEnd(source_index, target_index) {
  this.source = -1;
  this.target = -1;
  if (this.functionValid('_IGG_handleDrag')) {
    this.dataObject._IGG_handleDrag(source_index, target_index);
  } else {
    this.refreshCell(source_index);
    this.refreshCell(target_index);
  }
  if (this.functionValid('_IGG_getPossibleTargetView')) {
    this.refreshDragTargets(source_index);
  }
  if (this.functionValid('_IGG_getDragView')) {
    this.refreshDragNonTargets(source_index);
  }
}

/**
  * @this {_IG_Grid}
  *
  * Callback function invoked by the Drag API when the user
  * has hit a target (mouseover, but not released).
  * Calls the corresponding functions in the backend object
  * if it exists.
  *
  * @param {Integer} target_index The index of the target cell.
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
  *
  * Callback function invoked by the Drag API when the user
  * has left a target but the drag is still ongoing.
  * Calls the corresponding functions in the backend object
  * if it exists.
  *
  * @param {Integer} last_target The index of the target that the user left.
  */
function IG_Grid_handleOnDragTargetLost(last_target) {
  var last_target = this.target;
  this.target = -1;
  this.refreshCell(last_target);
  this.refreshCell(this.source);
}

/**
  * @this {_IG_Grid}
  *
  * Callback function invoked by the Drag API when the user
  * has clicked on a cell.
  * Calls the corresponding functions in the backend object
  * if it exists.
  *
  * @param {Integer} index The index of the cell that was clicked.
  */
function IG_Grid_handleOnDragClick(index) {
  this.source = -1;
  this.target = -1;
  if (this.functionValid('_IGG_handleClick')) {
    this.dataObject._IGG_handleClick(index);
  }
}

/**
  * @this {_IG_Grid}
  *
  * Sets the Drag API horizontal mapper.
  * See docs for the Drag API for more details.
  *
  * @param {Function} mapper The given mapper
  */
function IG_Grid_setXMapper(mapper) {
  this.dragHandler.xMapper = mapper;
}

/**
  * @this {_IG_Grid}
  *
  * Sets the Drag API horizontal mapper.
  * See docs for the Drag API for more details.
  *
  * @param {Function} mapper The given mapper
  */
function IG_Grid_setYMapper(mapper) {
  this.dragHandler.yMapper = mapper;
}

/**
  * @this {_IG_Grid}
  *
  * @type Boolean
  * @return {Boolean} true iff the user dragged with the right mouse button.
  */
function IG_Grid_isRightButton() {
  return this.dragHandler.isRightButton;
}

/**
  * @this {_IG_Grid}
  *
  * Initialize dragging for the grid, including defining all the
  * callbacks outstanding.
  */
function IG_Grid_initDragging() {
  this.refreshDragSources();

  var cb_this = this;

  this.dragHandler.onDragStart = function(object) {
    var index = cb_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (cb_this.functionValid('_IGG_handleOnDragStart')) {
        cb_this.dataObject._IGG_handleOnDragStart(object);
      }
    } else {
      cb_this.handleOnDragStart(index);
    }
  };

  this.dragHandler.onDragEnd = function(object1, object2) {
    var index1 = cb_this.getCellIndexFromName(object1.id);
    if (index1 == -1) {
      if (cb_this.functionValid('_IGG_handleOnDragEnd')) {
        cb_this.dataObject._IGG_handleOnDragEnd(object1, object2);
      }
    } else if (object2 == null) {
      cb_this.handleOnDragEnd(index1, -1);
    } else {
      var index2 = cb_this.getCellIndexFromName(object2.id);
      if (index2 == -1) {
        if (cb_this.functionValid('_IGG_handleOnDragEnd')) {
          cb_this.dataObject._IGG_handleOnDragEnd(object1, object2);
        }
      } else {
        cb_this.handleOnDragEnd(index1, index2);
      }
    }
  };

  this.dragHandler.onDragTargetHit = function(object) {
    var index = cb_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (cb_this.functionValid('_IGG_handleOnDragTargetHit')) {
        cb_this.dataObject._IGG_handleOnDragTargetHit(object);
      }
    } else {
      cb_this.handleOnDragTargetHit(index);
    }
  };

  this.dragHandler.onDragTargetLost = function(old_object) {
    if (cb_this.target == -1) {
      if (cb_this.functionValid('_IGG_handleOnDragTargetLost')) {
        cb_this.dataObject._IGG_handleOnDragTargetLost(old_object);
      }
    } else {
      cb_this.handleOnDragTargetLost(old_object);
    }
  };

  this.dragHandler.onDragClick = function(object) {
    var index = cb_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (cb_this.functionValid('_IGG_handleOnDragClick')) {
        cb_this.dataObject._IGG_handleOnDragClick(object);
      }
    } else {
      cb_this.handleOnDragClick(index);
    }
  };

}
