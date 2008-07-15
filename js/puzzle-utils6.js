// Copyright 2006 Google, Inc.
// Author: Wei-Hwa Huang

/////////////////////////////////////////////////
// note: Requires prototype.

function _gel(o) {
  return document.getElementById(o);
}

///////////////////////////////////////////////
//  A random number implementation.

_WHP_Random.prototype.randomize = function (seed) {
  if (typeof(seed) != 'undefined' && seed != null) {
    this.seed = parseInt(seed);
    this.get(); this.get(); this.get(); this.get(); this.get();
    // remove inadvertent randomness caused by initial seed.
  } else {
    this.seed = Math.floor(Math.random() * 4294967296 + 1);
  }
}

_WHP_Random.prototype.get = function () {
  this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
  return (this.seed / 4294967296);
}

_WHP_Random.prototype.getInt = function (max) {
  return Math.floor(this.get() * max);
}

function _WHP_Random(seed) {
  this.randomize(seed);
}

///////////////////////////////////////////////
// rot13

// build a rot13 map.
var _WHP_alphabet_rot13 = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMabcdefghijklmnopqrstuvwxyzabcdefghijklm";
var _WHP_map_rot13 = new Array();
for (i = 0; i < 26; ++i)
  _WHP_map_rot13[_WHP_alphabet_rot13.charAt(i)] = _WHP_alphabet_rot13.charAt(i+13);
for (i = 39; i < 65; ++i)
  _WHP_map_rot13[_WHP_alphabet_rot13.charAt(i)] = _WHP_alphabet_rot13.charAt(i+13);

function _WHP_rot13(text) {
  var result = "";
  for (i = 0; i < text.length; ++i) {
    if (typeof(_WHP_map_rot13[text.charAt(i)]) == 'undefined') {
      result += text.charAt(i);
    } else {
      result += _WHP_map_rot13[text.charAt(i)];
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
      if (typeof this.items[x] != "function" && this.items[x] != 1) return true;
    }
    return false;
  }
}

  ///////////////////////////////////////////////
  // wrapper for _IG_Fetch_Content.

  function _WHP_Fetch(url, callback) {
    if (typeof _IG_FetchContent != "undefined") {
      _IG_FetchContent(url, callback, { refreshInterval: 0 });
      return;
    }
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type",
                             "application/x-javascript;");
    request.onreadystatechange = function() {
      if (request.readyState == 4 && request.status == 200) {
        if (request.responseText) {
          callback(request.responseText);
        }
      }
    };
    request.send("");
  }

  ///////////////////////////////////////////////
  // wrapper for _IG_Prefs.

  _WHP_LOCALDATA = [];

  function _WHP_GetData(key) {
    if (typeof _IG_Prefs != "undefined") {
      var prefs = new _IG_Prefs();
      return prefs.getString(key);
    } else if (typeof _WHP_LOCALDATA[key] != "undefined") {
      return _WHP_LOCALDATA[key];
    } else {
      return "";
    }
  }

  function _WHP_SetData(key, data) {
    if (typeof _IG_Prefs != "undefined") {
      var prefs = new _IG_Prefs();
      prefs.set(key, data);
    } else {
      _WHP_LOCALDATA[key] = data;
    }
  }

  ///////////////////////////////////////////////
  // code to handle logging on server

  function _Log_addMessage(content) {
    var url = '{{server_urls.server_url}}datastore/message-write?content='
              + encodeURIComponent('Client: ' + content);
    _WHP_Fetch(url, function(result) { });
  }

  ///////////////////////////////////////////////

  // code to handle user ID and names.

  // Annoyingly, we can't pass cookies via _WHP_Fetch, so we have to pass an id around.

  function _UserID_controller_(email, nickname, not_logged_in_callback, id_loaded_callback) {
    this.google_email = email;
    this.google_nickname = nickname;
    this.not_logged_in_callback = not_logged_in_callback;
    this.id_loaded_callback = id_loaded_callback;      // will be called when the id is stable.

    this.whp_uid = _WHP_GetData("user_id");
    this.whp_name = '[loading...]';
    if (this.whp_uid == '' || this.whp_uid == 'NOT_LOGGED_IN') {
      this.request_whp_uid();
    } else {
      this.register_whp_uid();
    }
  }

  _UserID_controller_.prototype.check_response = function(responseText) {
    if (responseText == "NOT_LOGGED_IN") {
      this.not_logged_in_callback();
    }
  }

  _UserID_controller_.prototype.request_whp_uid = function() {
    // Tell the server that this is our whp_uid.
    var url = '{{server_urls.server_url}}datastore/request_whp_id?gid=' + this.google_email;
    _WHP_Fetch(url, this.request_whp_uid_callback.bind(this));
  }

  _UserID_controller_.prototype.request_whp_uid_callback = function(responseText) {
    this.check_response(responseText);
    this.set_whp_uid(responseText);
    this.load_whp_name();
    this.id_loaded_callback();
  }

  _UserID_controller_.prototype.register_whp_uid = function() {
    // Tell the server that this is our whp_uid.
    var url = '{{server_urls.server_url}}datastore/register_whp_id?gid=' + this.google_email + '&id=' + this.whp_uid;
    _WHP_Fetch(url, this.register_whp_uid_callback.bind(this));
  }

  _UserID_controller_.prototype.register_whp_uid_callback = function(responseText) {
    this.check_response(responseText);
    // the server returns the uid we should actually use (if we gave it a good one, it should return it)
    this.set_whp_uid(responseText);
    _WHP_SetData("user_id", this.whp_uid);
    this.load_whp_name();
    this.id_loaded_callback();
  }

  _UserID_controller_.prototype.load_whp_name = function() {
    var url = '{{server_urls.server_url}}datastore/get_name?gid=' + this.google_email;
    _WHP_Fetch(url, this.load_whp_name_callback.bind(this));
  }

  _UserID_controller_.prototype.load_whp_name_callback = function (responseText) {
    this.check_response(responseText);
    this.set_whp_name(responseText);
  }

  _UserID_controller_.prototype.get_whp_uid = function(value) {
    return this.whp_uid;
  }

  _UserID_controller_.prototype.set_whp_uid = function(value) {
    this.whp_uid = value;
    _WHP_SetData("user_id", this.whp_uid);
    if (_gel('whp_uid') != null)
      setText(_gel('whp_uid'), this.whp_uid);
  }

  _UserID_controller_.prototype.set_whp_name = function(value) {
    this.whp_name = value;
    if (_gel('whp_name') != null)
      setText(_gel('whp_name'), value);
  }

  _UserID_controller_.prototype.userSetName = function() {
    var name = _gel('whp_name_entry').value;
    if (!name.match(/^[A-Za-z0-9\-\_]+$/)) {
      _gel("whp_name_msg").innerHTML = "Only letters and numbers please";
      return;
    }
    var url = '{{server_urls.server_url}}datastore/put_name?gid=' + this.google_email + '&name=' + name;
    this.whp_name = name;
    _gel("whp_name").innerHTML = name;
    _WHP_Fetch(url, this.userSetName_callback.bind(this));
  }

  _UserID_controller_.prototype.userSetName_callback = function(responseText) {
    this.check_response(responseText);
    _gel("whp_name_entry").style.display = "none";
    _gel("whp_name").style.display = "inline";
    _gel("whp_name_msg").innerHTML = "New name accepted!";
    _gel("whp_name_button").value = "Change My Nickname";
    _gel("whp_name_button").onclick = this.prepareNameChange.bind(this);
  }

  _UserID_controller_.prototype.prepareNameChange = function() {
    _gel("whp_name").style.display = "none";
    _gel("whp_name_msg").innerHTML = "";
    _gel("whp_name_entry").style.display = "inline";
    _gel("whp_name_entry").value = this.google_nickname;
    _gel("whp_name_button").value = "This one's good";
    _gel("whp_name_button").onclick = this.userSetName.bind(this);
  }

  _UserID_controller_.prototype.getUI = function() {
    var div = document.createElement('div');
    div.style.fontSize = '10pt';
    addText(div, 'Your Google ID is:');
    var tmp = addElement(div, 'span', []);
    addText(tmp, this.google_email);
    addElement(div, 'br');
    addText(div, 'Your Nickname is:');
    var tmp = addElement(div, 'span', [
      'id', 'whp_name',
    ]);
    setText(tmp, this.whp_name);
    tmp.style.display = 'inline';
    tmp = addElement(div, 'input', [
      'id', 'whp_name_entry',
      'type', 'text',
      'size', '20',
    ]);
    tmp.style.display = 'none';
    addElement(div, 'input', [
      'id', 'whp_name_button',
      'type', 'button',
      'value', 'Change My Nickname',
      'onclick', this.prepareNameChange.bind(this),
    ]);
    addElement(div, 'br');
    addElement(div, 'span', [
      'id', 'whp_name_msg'
    ]);
    addElement(div, 'br');
    addText(div, 'Your Puzzler ID is:');
    tmp = addElement(div, 'span', [
      'id', 'whp_uid'
    ]);
    if (this.whp_uid == '')
      setText(tmp, "[Loading...]");
    else
      setText(tmp, this.whp_uid);
    return div;
  }

///////////////////////////////////////
//   Older UserID code (before opensocial and user authentication)

var curname = '';

 function _UserID_getNewID() {
   _WHP_SetData("user_id", '{{random_new_user_id}}');
   // _gel('id_button').disabled = true;
   setText(_gel('unique_id_msg'),'{{random_new_user_id}}');
 }

 function _UserID_current() {
   var id = _WHP_GetData("user_id");
   if (id == '') {
     _UserID_getNewID();
   }
   return id;
 }

 function _UserID_setName() {
   var name = _gel('name_entry').value;
   if (name.match(/^[A-Za-z0-9\-\_]+$/)) {
     var url = '{{server_urls.server_url}}datastore/put_name?id=' + _UserID_current()
         + '&name=' + name;
     curname = name;
     _gel("username").innerHTML = curname;
     _WHP_Fetch(url, function() {
       _gel("name_entry").style.display = "none";
       _gel("username").style.display = "inline";
       _gel("name_msg").innerHTML = "New name accepted!";
       _gel("name_button").value = "Change My Nickname";
       _gel("name_button").onclick = _UserID_prepareNameChange;
       _Log_addMessage('user ' + _UserID_current() + ' changed their name to ' + curname);
     });
   } else {
     _gel("name_msg").innerHTML = "Only letters and numbers please";
   }
 }

 function _UserID_userRequestedNewID() {
   _gel("name_entry").style.display = "inline";
   _gel('name_entry').value = _UserID_getName();
   _UserID_getNewID();
   _UserID_setName();
 }

 function _UserID_prepareNameChange() {
   _gel("username").style.display = "none";
   _gel("name_msg").innerHTML = "";
   _gel("name_entry").style.display = "inline";
   _gel("name_entry").value = '{{random_username}}';
   _gel("name_button").value = "This one's good";
   _gel("name_button").onclick = _UserID_setName;
 }

 function _UserID_updateName(responseText) {
   if (responseText == '') {
     _gel('name_entry').value = '{{random_username}}';
     _UserID_setName();
   } else {
     curname = responseText;
     _gel('username').innerHTML = curname;
   }
   _gel('unique_id_msg').innerHTML = _UserID_current();
 }


 function _UserID_getName() {
   var url = '{{server_urls.server_url}}datastore/get_name?id=' + _UserID_current();
   _WHP_Fetch(url, _UserID_updateName);
 }

 function _UserID_getUI() {
   var div = document.createElement('div');
   div.style.fontSize = '10pt';
   addText(div, 'Your Nickname is:');
   var tmp = addElement(div, 'span', [
     'id', 'username',
   ]);
   tmp.style.display = 'inline';
   addText(tmp, '[querying server]');
   tmp = addElement(div, 'input', [
     'id', 'name_entry',
     'type', 'text',
     'size', '20',
   ]);
   tmp.style.display = 'none';
   addElement(div, 'input', [
     'id', 'name_button',
     'type', 'button',
     'value', 'Change My Nickname',
     'onclick', _UserID_prepareNameChange,
   ]);
   addElement(div, 'br');
   addElement(div, 'span', [
     'id', 'name_msg'
   ]);
   addElement(div, 'br');
   addText(div, 'Your Unique ID is:');
   tmp = addElement(div, 'span', [
     'id', 'unique_id_msg'
   ]);
   addText(tmp, "{Loading...}");
/*
   addElement(div, 'br');
   addElement(div, 'input', [
     'id', 'id_button',
     'type', 'button',
     'value', 'Change UID to ' + '{{random_new_user_id}}',
     'onclick', _UserID_userRequestedNewID,
   ]);
*/
   return div;
 }


///////////////////////////////////////
//  This object stores game state.
//  Right now it uses app engine stuff.
//  It's rather tailored to the puzzle module, but parts of it are generalizable.
//
//  To use, you should override _WHP_game_state to contain your custom data
//  (but make sure to keep this.cur_puz if you want navigation!)
//  also, don't put any heavyweight functions in it, since it will go through JSON.
//  
//  Override _WH_pref_controller.prototype.get_color = function(puz_num)
//  as needed for the display color, and also add other functions to manipulate
//  yadda yadda 

  function _WHP_game_state() {
    this.cur_puz = 0;
    this.puz_count = 12;
  }

  function _WHP_pref_controller(module_id, navigation, uidc, not_logged_in_callback) {
    this.uidc = uidc;
    this.not_logged_in_callback = not_logged_in_callback;
    this.game_state = null;
    this.navigation = navigation;
    this.getPrefs_callback = null;

    this.num_puzzles = 12;
    this.box_height = 5;
    this.box_width = 5;
    this.rows = 3;
    this.cols = 4;
  }

  _WHP_pref_controller.prototype.get_whp_uid = function() {
    if (uidc == null) return _UserID_current();
    return this.uidc.get_whp_uid();
  }

  _WHP_pref_controller.prototype.check_response = function(responseText) {
    if (responseText == "NOT_LOGGED_IN") {
      this.not_logged_in_callback();
    }
  }

  _WHP_pref_controller.prototype.get_color = function(puz_num) {
    return "#FF0000";
  }

  _WHP_pref_controller.prototype.get_current_color = function() {
    return "#0000FF";
  }

  _WHP_pref_controller.prototype.get_num_solved = function() {
    return 0;
  }

  _WHP_pref_controller.prototype.extra_update_state = function() {
  }

  _WHP_pref_controller.prototype.getPrefs = function(callback) {
    this.getPrefs_extern_callback = callback;
    var url = '{{server_urls.server_url}}datastore/getpuzzledata?id=' + this.get_whp_uid();
    _WHP_Fetch(url, this.getPrefsCallbackWrapper.bind(this));
  }

  _WHP_pref_controller.prototype.getPrefsCallbackWrapper = function(result) {
    this.check_response(result);
    this.getPrefsCallback(result);
  }

  _WHP_pref_controller.prototype.getPrefsCallback = function(result) {
    if (result == null || result == "") {
      this.game_state = new _WHP_game_state();
    } else {
      this.game_state = result.parseJSON();
    }
    if (!this.game_state) {
      this.game_state = new _WHP_game_state();
    }
    if (this.navigation) {
      this.nav_puz = this.game_state.cur_puz;
      this.update_navbar();
    }
    this.updatePrefDisplay();
    if (this.getPrefs_extern_callback) {
      this.getPrefs_extern_callback();
    }
  }

  _WHP_pref_controller.prototype.setPrefs = function() {
    if (this.navigation) {
      this.update_navbar();
    }

    var url = '{{server_urls.server_url}}datastore/writepuzzledata?id=' + this.get_whp_uid() + '&data='
              + encodeURIComponent(ObjectToJSONString(this.game_state));
    pref_controller_temp = this;
    _WHP_Fetch(url, this.setPrefsCallbackWrapper.bind(this));
  }

  _WHP_pref_controller.prototype.setPrefsCallbackWrapper = function(result) {
    this.check_response(result);
    this.setPrefsCallback(result);
  }

  _WHP_pref_controller.prototype.setPrefsCallback = function(result) {
    if (this.navigation) {
      this.update_navbar();
    }
  }


  _WHP_pref_controller.prototype.resetPrefs = function() {
    this.game_state = new _WHP_game_state();
    this.setPrefs();
    this.updatePrefDisplay();
    if (this.navigation) {
      this.nav_puz = this.game_state.cur_puz;
      this.update_navbar();
    }
  }

  _WHP_pref_controller.prototype.updatePrefDisplay = function() {
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

  _WHP_pref_controller.prototype.getTableUI = function(num_puzzles) {
    var table = document.createElement('table');
    table.border = '0';
    table.cellPadding = '0';
    table.cellSpacing = '0';
    for (var row = 0; row < this.rows; row++) {
      var row_o = addElement(table, 'tr');
      for (var col = 0; col < this.cols; col++) {
        var idnum = row * this.cols + col;
        if (idnum < num_puzzles) {
          var col_o = addElement(row_o, 'td', [
            'id', 'puzzle_status_' + idnum
          ]);
          col_o.style.height = this.box_height;
          col_o.style.width = this.box_width;
          addElement(col_o, 'img', [
            'src', 'http://www.google.com/ig/images/cleardot.gif'
          ]);
        }
      }
    }
    return table;
  }

  _WHP_pref_controller.prototype.update_navbar = function() {
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

  _WHP_pref_controller.prototype.change_level = function(amount) {
    this.nav_puz += amount;
    if (this.nav_puz < 0) this.nav_puz = 0;
    if (this.nav_puz > this.game_state.puz_count) this.nav_puz = this.game_state.puz_count;
    this.update_navbar();
  }

///////////////////////////////////////
//  This object stores per-puzzle state (or actually any substate that is keyed
//  by user and a string of your choice).
//
//  To use, you should override _WHP_puz_state to contain your custom data.
//  also, don't put any heavyweight functions in it, since it will go through JSON.

  function _WHP_puz_state() {
  }

  function _WHP_puz_controller(uidc) {
    this.loadState_callback = null;
    this.saveState_callback = null;
    this.uidc = uidc;
  }

  _WHP_puz_controller.prototype.get_whp_uid = function() {
    if (uidc == null) return _UserID_current();
    return this.uidc.get_whp_uid();
  }

  _WHP_puz_controller.prototype.loadState = function(key, callback) {
    var url = '{{server_urls.server_url}}datastore/getpuzzledata?id=' + this.get_whp_uid()
              + '&key=' + encodeURIComponent(key);
    this.loadState_callback = callback;
    _WHP_Fetch(url, this.loadStateCallbackWrapper.bind(this));
  }

  _WHP_puz_controller.prototype.loadStateCallbackWrapper = function(result) {
    var answer = null;
    if (result == null || result == "") {
      answer = new _WHP_puz_state();
    } else {
      answer = result.parseJSON();
    }
    if (!answer) {
      answer = new _WHP_puz_state();
    }
    if (this.loadState_callback) {
      this.loadState_callback(answer);
    }
  }

  _WHP_puz_controller.prototype.saveState = function(key, state, callback) {
    var url = '{{server_urls.server_url}}datastore/writepuzzledata?'
              + 'id=' + this.get_whp_uid()
              + '&key=' + encodeURIComponent(key)
              + '&data=' + encodeURIComponent(ObjectToJSONString(state));
    this.saveState_callback = callback;
    _WHP_Fetch(url, this.saveStateCallbackWrapper.bind(this));
  }

  _WHP_puz_controller.prototype.saveStateCallbackWrapper = function(result) {
    this.saveState_callback(result);
  }

////////////////////////////////////////////////////
// Reports a puzzle solved to the server.

  _WHP_reportPuzzleSolved = function(puzNum) {
    var passgen = new _WHP_Random((new Date()).getTime());
    var url = '{{server_urls.server_url}}datastore/rps?'
              + 'id=' + this.get_whp_uid()
              + '&puznum=' + puzNum
              + '&password=' + passgen.getInt(100000000);
    _WHP_Fetch(url, null);
  }
