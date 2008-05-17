// Copyright 2006 Google, Inc.
// Author: Wei-Hwa Huang

///////////////////////////////////////////////
//  A random number implementation.

function _IG_Random(seed) {
  this.randomize(seed);
}

_IG_Random.prototype.randomize = function (seed) {
  if (typeof(seed) != 'undefined' && seed != null) {
    this.seed = parseInt(seed);
    this.get(); this.get(); this.get(); this.get(); this.get();
    // remove inadvertent randomness caused by initial seed.
  } else {
    this.seed = Math.floor(Math.random() * 4294967296 + 1);
  }
}

_IG_Random.prototype.get = function () {
  this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
  return (this.seed / 4294967296);
}

_IG_Random.prototype.getInt = function (max) {
  return Math.floor(this.get() * max);
}

///////////////////////////////////////////////
// rot13

// build a rot13 map.
var _IG_alphabet_rot13 = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMabcdefghijklmnopqrstuvwxyzabcdefghijklm";
var _IG_map_rot13 = new Array();
for (i = 0; i < 26; ++i)
  _IG_map_rot13[_IG_alphabet_rot13.charAt(i)] = _IG_alphabet_rot13.charAt(i+13);
for (i = 39; i < 65; ++i)
  _IG_map_rot13[_IG_alphabet_rot13.charAt(i)] = _IG_alphabet_rot13.charAt(i+13);

function _IG_rot13(text) {
  var result = "";
  for (i = 0; i < text.length; ++i) {
    if (typeof(_IG_map_rot13[text.charAt(i)]) == 'undefined') {
      result += text.charAt(i);
    } else {
      result += _IG_map_rot13[text.charAt(i)];
    }
  }
  return result;
}

///////////////////////////////////////////////
//  A basic set and multiset implementation.

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
    if (typeof(this.items[key]) == 'undefined') {
      return 0;
    }
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
//  This is a simple grid that supports dragging and the like.
//
//  Note: to use this, you must first load the drag object from drag.js, e.g.,
//  <script type="text/javascript" src="drag.js"></script>

function _IG_GameGrid() {

  this.dataObject = arguments[0];
  // requires the following methods:
  //   _IGGG_getNormalView(index)
  //     returns the HTML content of the cell when the user is not dragging.
  //   _IGGG_isDragSource(index)
  //     boolean, tells whether is source.
  //   _IGGG_isDragTarget(index, sourceIndex)
  //     boolean, tells whether is target.
  //
  // these functions are not required, but if they do not exist, _IGGG_getNormalView(index)
  // will be called instead:
  //   _IGGG_getSurrogateView(index)
  //     returns the surrogate view when index is being dragged
  //   _IGGG_getSourceView(source, target)
  //     returns the HTML content of the cell when it is the source and the user is dragging.
  //   _IGGG_getTargetView(target, source)
  //     returns the HTML content of the cell when it is the target and the user is dragging.
  //   _IGGG_getPossibleTargetView(potential_target, source)
  //     returns the HTML content of the cell when it is a possible target (but not the target) and the user is dragging.
  //   _IGGG_getDragView(index, source)
  //     returns the HTML content of the cell when it is not a potential target nor the source and the user is dragging.
  //
  // these functions are not required, but will be called if they exist
  // and the conditions apply:
  //   _IGGG_handleClick(source)
  //     implements the necessary changes when the user has clicked the source.
  //   _IGGG_handleDragStart(source)
  //     implements the necessary changes when the user has started dragging.
  //   _IGGG_handleDrag(source, target)
  //     implements the necessary changes when the user has dragged source to target.
  //     Note: We expect this function to call the refresh of source and target
  //     if it is necessary.
  //   _IGGG_handleOnDragStart(object)
  //   _IGGG_handleOnDragTargetHit(object)
  //   _IGGG_handleOnDragTargetLost()
  //   _IGGG_handleOnDragEnd(object, object)
  //   _IGGG_handleOnDragClick(object)
  //     called when the GameGrid can't handle the Drag request because the
  //     relevant index is not in the table.
  //
  // the following callback methods will be created:
  //   _IGGG_refreshCell(index)
  //   _IGGG_addDragSource(index)
  //   _IGGG_removeDragSource(index)
  //   _IGGG_refreshDragSources()
  //   _IGGG_calculateDragTargets(sourceIndex)
  //   _IGGG_refreshDragTargets(sourceIndex)
  //   _IGGG_refreshAll()

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

  this.dataObject._IGGG_refreshCell = function (index) {
    if (index < 0) return; if (index > callback_this.maxIndex) return;
    if (typeof(callback_this.cells[index]) == 'undefined' || callback_this.cells[index] == null) return;
    callback_this.cells[index].innerHTML = callback_this.getCellValue(index);
  }
    
  this.dataObject._IGGG_addDragSource = function (index) {
    if (index < 0) return; if (index > callback_this.maxIndex) return;
    if (typeof(callback_this.cells[index]) == 'undefined' || callback_this.cells[index] == null) return;
    var name = callback_this.getCellName(index);
    var surrogate_view = null;
    if (typeof(callback_this.dataObject._IGGG_getSurrogateView) == 'undefined' || callback_this.dataObject._IGGG_getSurrogateView == null) {
      surrogate_view = callback_this.dataObject._IGGG_getNormalView(index);
    } else {
      surrogate_view = callback_this.dataObject._IGGG_getSurrogateView(index);
    }
    callback_this.dragHandler.addSource(name, _gel(name), surrogate_view);
  }
    
  this.dataObject._IGGG_removeDragSource = function (index) {
    if (index < 0) return; if (index > callback_this.maxIndex) return;
    if (typeof(callback_this.cells[index]) == 'undefined' || callback_this.cells[index] == null) return;
    var name = callback_this.getCellName(index);
    callback_this.dragHandler.removeSource(name, _gel(name));
  }

  this.dataObject._IGGG_refreshDragSources = function () {
    callback_this.dragHandler.removeAllSources();
    for (var i = 0; i <= callback_this.maxIndex; ++i) {
      if (typeof(callback_this.cells[i]) == 'undefined' || callback_this.cells[i] == null) continue;
      if (callback_this.dataObject._IGGG_isDragSource(i)) {
        var name = callback_this.getCellName(i);
        var surrogate_view = null;
        if (typeof(callback_this.dataObject._IGGG_getSurrogateView) == 'undefined' || callback_this.dataObject._IGGG_getSurrogateView == null) {
          surrogate_view = callback_this.dataObject._IGGG_getNormalView(i);
        } else {
          surrogate_view = callback_this.dataObject._IGGG_getSurrogateView(i);
        }
        callback_this.dragHandler.addSource(name, _gel(name), surrogate_view);
      }
    }
  }
    
  this.dataObject._IGGG_refreshDragTargets = function (sourceIndex) {
    for (var i = 0; i <= callback_this.maxIndex; ++i) {
      if (typeof(callback_this.cells[i]) == 'undefined' || callback_this.cells[i] == null) continue;
      if (callback_this.dataObject._IGGG_isDragTarget(i, sourceIndex)) {
        callback_this.dataObject._IGGG_refreshCell(i);
      }
    }
  }
    
  this.dataObject._IGGG_calculateDragTargets = function (sourceIndex) {
    callback_this.dragHandler.removeAllTargets();
    for (var i = 0; i <= callback_this.maxIndex; ++i) {
      if (typeof(callback_this.cells[i]) == 'undefined' || callback_this.cells[i] == null) continue;
      if (callback_this.dataObject._IGGG_isDragTarget(i, sourceIndex)) {
        var name = callback_this.getCellName(i);
        callback_this.dragHandler.addTarget(name, _gel(name));
      }
    }
    this._IGGG_refreshDragTargets(sourceIndex);
  }
    
  this.dataObject._IGGG_refreshAll = function () {
    for (var i = 0; i <= callback_this.maxIndex; ++i) {
      if (typeof(callback_this.cells[i]) == 'undefined' || callback_this.cells[i] == null) continue;
      callback_this.dataObject._IGGG_refreshCell(i);
    }
    callback_this.dataObject._IGGG_refreshDragSources();
    callback_this.dataObject._IGGG_refreshDragTargets(callback_this.source);
  }
}

_IG_GameGrid.prototype.getCellName = function (index) {
  return ('cell_' + this.name + '_' + index + '___MODULE_ID__');
}

_IG_GameGrid.prototype.getCellTDID = function (index) {
  return ('celltd_' + this.name + '_' + index + '___MODULE_ID__');
}

_IG_GameGrid.prototype.getCellIndexFromName = function (id) {
  var regexp = new RegExp('cell_' + this.name + '_' + '(.*)' + '___MODULE_ID__');
  var matches = regexp.exec(id);
  if (matches == null) return -1;
  if (matches.length == 0) return -1;
  return (matches[1] * 1);
}

_IG_GameGrid.prototype.getCellValue = function (index) {
  if (!this.dragHandler.isDragging) {
    return this.dataObject._IGGG_getNormalView(index);
  } else if (this.source == index) {
    if (typeof(this.dataObject._IGGG_getSourceView) == 'undefined' || this.dataObject._IGGG_getSourceView == null) {
      return this.dataObject._IGGG_getNormalView(index);
    } else {
      return this.dataObject._IGGG_getSourceView(this.source, this.target);
    }
  } else if (this.target == index) {
    if (typeof(this.dataObject._IGGG_getTargetView) == 'undefined' || this.dataObject._IGGG_getTargetView == null) {
      return this.dataObject._IGGG_getNormalView(index);
    } else {
      return this.dataObject._IGGG_getTargetView(index, this.source);
    }
  } else if (this.dataObject._IGGG_isDragTarget(index, this.source)) {
    if (typeof(this.dataObject._IGGG_getPossibleTargetView) == 'undefined' || this.dataObject._IGGG_getPossibleTargetView == null) {
      return this.dataObject._IGGG_getNormalView(index);
    } else {
      return this.dataObject._IGGG_getPossibleTargetView(index, this.source);
    }
  } else {
    if (typeof(callback_this.dataObject._IGGG_getDragView) == 'undefined' || callback_this.dataObject._IGGG_getDragView == null) {
      return this.dataObject._IGGG_getNormalView(index);
    } else {
      return this.dataObject._IGGG_getDragView(index, this.source);
    }
  }
}

_IG_GameGrid.prototype.getTable = function () {
  if (this.table == null) {
    this.makeNewTable();
  }
  return this.table;
}

_IG_GameGrid.prototype.getCell = function (index) {
  if (typeof(this.cells[index]) == 'undefined' || (this.cells[index] == null)) {
    this.cells[index] = document.createElement('span');
    this.cells[index].id = this.getCellName(index);
    this.cells[index].innerHTML = this.getCellValue(index);
    if (index > this.maxIndex) this.maxIndex = index;
  }
  return this.cells[index];
}

_IG_GameGrid.prototype.makeNewTable = function () {
  // Calling this code repeatedly make cause too much garbage.
  // Do you really trust Javascript's garbage collection?
  var tablenode = document.createElement('table');
  tablenode.border = "0";
  tablenode.cellPadding = "0px";
  tablenode.cellSpacing = "0px";
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

_IG_GameGrid.prototype.handleOnDragStart = function (source_index) {
  this.source = source_index;
  this.target = -1;
  this.dataObject._IGGG_calculateDragTargets(this.source);
  this.dataObject._IGGG_refreshCell(this.source);
  if (typeof(this.dataObject._IGGG_handleDragStart) != 'undefined')
    this.dataObject._IGGG_handleDragStart(this.source);
}

_IG_GameGrid.prototype.handleOnDragEnd = function (source_index, target_index) {
  this.source = -1;
  this.target = -1;
  if (typeof(this.dataObject._IGGG_handleDrag) != 'undefined')
    this.dataObject._IGGG_handleDrag(source_index, target_index);
  this.dataObject._IGGG_refreshDragTargets(source_index);
}

_IG_GameGrid.prototype.handleOnDragTargetHit = function (target_index) {
  var last_target = this.target;
  this.target = target_index;
  this.dataObject._IGGG_refreshCell(last_target);
  this.dataObject._IGGG_refreshCell(this.target);
  this.dataObject._IGGG_refreshCell(this.source);
}

_IG_GameGrid.prototype.handleOnDragTargetLost = function () {
  var last_target = this.target;
  this.target = -1;
  this.dataObject._IGGG_refreshCell(last_target);
  this.dataObject._IGGG_refreshCell(this.source);
}

_IG_GameGrid.prototype.handleOnDragClick = function (index) {
  this.source = -1;
  this.target = -1;
  if (typeof(this.dataObject._IGGG_handleClick) != 'undefined')
    this.dataObject._IGGG_handleClick(index);
}

_IG_GameGrid.prototype.setXMapper = function (mapper) {
  this.dragHandler.xMapper = mapper;
}

_IG_GameGrid.prototype.setYMapper = function (mapper) {
  this.dragHandler.yMapper = mapper;
}

_IG_GameGrid.prototype.isRightButton = function () {
  return this.dragHandler.isRightButton;
}

_IG_GameGrid.prototype.initDragging = function () {
  this.dataObject._IGGG_refreshDragSources();

  var callback_this = this;

  this.dragHandler.onDragStart = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGGG_handleOnDragStart) != 'undefined')
        callback_this.dataObject._IGGG_handleOnDragStart(object);
    } else {
      callback_this.handleOnDragStart(index);
    }
  }

  this.dragHandler.onDragEnd = function (object1, object2) {
    var index1 = callback_this.getCellIndexFromName(object1.id);
    if (index1 == -1) {
      if (typeof(callback_this.dataObject._IGGG_handleOnDragEnd) != 'undefined')
        callback_this.dataObject._IGGG_handleOnDragEnd(object1, object2);
    } else if (object2 == null) {
      callback_this.handleOnDragEnd(index1, -1);
    } else {
      var index2 = callback_this.getCellIndexFromName(object2.id);
      if (index2 == -1) {
        if (typeof(callback_this.dataObject._IGGG_handleOnDragEnd) != 'undefined')
          callback_this.dataObject._IGGG_handleOnDragEnd(object1, object2);
      } else {
        callback_this.handleOnDragEnd(index1, index2);
      }
    }
  }

  this.dragHandler.onDragTargetHit = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGGG_handleOnDragTargetHit) != 'undefined')
        callback_this.dataObject._IGGG_handleOnDragTargetHit(object);
    } else {
      callback_this.handleOnDragTargetHit(index);
    }
  }

  this.dragHandler.onDragTargetLost = function (old_object) {
    if (callback_this.target == -1) {
      if (typeof(callback_this.dataObject._IGGG_handleOnDragTargetLost) != 'undefined')
        callback_this.dataObject._IGGG_handleOnDragTargetLost(old_object);
    } else {
      callback_this.handleOnDragTargetLost(old_object);
    }
  }

  this.dragHandler.onDragClick = function (object) {
    var index = callback_this.getCellIndexFromName(object.id);
    if (index == -1) {
      if (typeof(callback_this.dataObject._IGGG_handleOnDragClick) != 'undefined')
        callback_this.dataObject._IGGG_handleOnDragClick(object);
    } else {
      callback_this.handleOnDragClick(index);
    }
  }

}

///////////////////////////////////////
//  This object stores game state.  Right now it uses setprefs, so only works
//  on the home page.
//  It's rather tailored to the puzzle module, but parts of it are generalizable.
//
//  To use, you should override _IG_game_state to contain your custom data
//  (but make sure to keep this.cur_puz if you want navigation!)
//  also, don't put any heavyweight functions in it, since it will go through JSON.
//  
//  Override _IG_puzzle_pref_controller.prototype.get_color = function(puz_num)
//  as needed for the display color, and also add other functions to manipulate
//  yadda yadda 

  function _IG_game_state() {
    this.cur_puz = 0;
  }
                                                                                                                                                                                  
  function _IG_puzzle_pref_controller(module_id, pref_name, navigation) {
    this.pref_name = pref_name;
    this.prefs = new _IG_Prefs(module_id);
    this.game_state = null;
    this.navigation = navigation;
                                                                                                                                                                                  
    this.num_puzzles = 12;
    this.box_height = 5;
    this.box_width = 5;
    this.rows = 3;
    this.cols = 4;
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.get_color = function(puz_num) {
    return "#FF0000";
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.get_current_color = function() {
    return "#0000FF";
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.get_num_solved = function() {
    return 0;
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.extra_update_state = function() {
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.getPrefs = function() {
    // Get user preferences
    var data = this.prefs.getString(this.pref_name);
    if (data == "") {
      this.game_state = new _IG_game_state();
    } else {
      this.game_state = data.parseJSON();
    }
    if (this.navigation) {
      this.nav_puz = this.game_state.cur_puz;
      this.update_navbar();
    }
    this.updatePrefDisplay();
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.setPrefs = function() {
    this.prefs.set(this.pref_name, ObjectToJSONString(this.game_state));
    if (this.navigation) {
      this.update_navbar();
    }
  }

                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.resetPrefs = function() {
    this.game_state = new _IG_game_state();
    this.setPrefs();
    this.updatePrefDisplay();
    if (this.navigation) {
      this.nav_puz = this.game_state.cur_puz;
      this.update_navbar();
    }
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.updatePrefDisplay = function() {
    for (var i=0; i<this.num_puzzles; i++) {
      _gel("puzzle_status_" + i).style.backgroundColor = this.get_color(i);
    }
    if (this.navigation) {
      if (_gel("puzzle_status_" + i))
        _gel("puzzle_status_" + i).style.backgroundColor = "#0000FF";
    }
    this.extra_update_state(this.game_state);
    _IG_AdjustIFrameHeight();
  }
                                                                                                                                                                                  
  _IG_puzzle_pref_controller.prototype.getTableHTML = function() {
    var answer = "";
    answer += "<table border=0 cellpadding=0 cellspacing=0>";
    for (var row = 0; row < this.rows; row++) {
      answer += "<tr>";
      for (var col = 0; col < this.cols; col++) {
        var idnum = row * this.cols + col;
        answer += '<td id="puzzle_status_' + idnum + '" style="height:' + this.box_height + ';width:' + this.box_width
                + '"><img src="http://www.google.com/ig/images/cleardot.gif"></td>';
      }
      answer += "</tr>";
    }
    answer += "</table>";
    return answer;
  }

