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
      if (_gel("puzzle_status_" + i))
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

  _IG_puzzle_pref_controller.prototype.update_navbar = function() {
    if (this.game_state.cur_puz == this.nav_puz) {
      _gel("newp").disabled = true;
      _gel("newp").value = "On Puzzle " + (this.game_state.cur_puz*1+1) + ((this.game_state.puz_solved[this.game_state.cur_puz] == 1) ? "*" : "");
    } else {
      _gel("newp").disabled = false;
      _gel("newp").value = "Get Puzzle " + (this.nav_puz*1+1) + ((this.game_state.puz_solved[this.nav_puz] == 1) ? "*" : "");
    }
    _gel("puznum").innerHTML = (this.game_state.cur_puz*1+1) + ((this.game_state.puz_solved[this.game_state.cur_puz] == 1) ? "*" : "");
    var possible_vals = new Array(1, 10, 50);
    for (var i=0; i < possible_vals.length; ++i) {
      var v = possible_vals[i];
      if (_gel("levp" + v)) {
        _gel("levp" + v).disabled = (this.nav_puz >= this.game_state.puz_count - v);
      }
      if (_gel("levm" + v)) {
        _gel("levm" + v).disabled = (this.nav_puz < v);
      }
    }
    _IG_AdjustIFrameHeight();
  }
                                                                                                                                                                                              
  _IG_puzzle_pref_controller.prototype.change_level = function(amount) {
    this.nav_puz += amount;
    if (this.nav_puz < 0) this.nav_puz = 0;
    if (this.nav_puz > this.game_state.puz_count) this.nav_puz = this.game_state.puz_count;
    this.update_navbar();
  }

