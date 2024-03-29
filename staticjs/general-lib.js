/**
 * General used for the WoShamBo Gadget
 * Author: Wei-Hwa Huang
 *
 * This file contains multiple utilities used for calculating
 * Woshambo competition information; it can be considered the
 * "Woshambo API".
 *
 * This file contains code that could conceivable be
 * repurposed for non-Woshambo uses.
 */

function _gel(o) {
  return document.getElementById(o);
}

///////////////////////////////////////////////
// TEXT MANIPULATION
////////////////////////////////////////////////////

// Creates a string that represents a ratio as a percentage;
// for example, toPercentage(2, 3) would return "66.66%".
function toPercentage(numerator, denominator) {
  if (numerator == 0) return "0.00%";
  return (Math.round(numerator / denominator * 10000)/100 + "%");
}

///////////////////////////////////////////////
// HTML DOM CONVENIENCE FUNCTIONS
////////////////////////////////////////////////////

// Creates a DOM element of the specified type,
// and adds it to the specified node.
// Also, adds parameters to the element as specified.
// Returns the new element.
function addElement(node, type, params) {
  var newguy = document.createElement(type);
  if (params != undefined) {
    var index = 1;
    while (index < params.length) {
      newguy[params[index-1]] = params[index];
      index += 2;
    }
  }
  node.appendChild(newguy);
  return newguy;
}

// Convenience function; adds an HTML linebreak.
function lineBreak(node) {
  addElement(node, "br");
}

// Creates a text element,
// and adds it to the specified node.
// Returns the new element.
function addText(node, text) {
  node.appendChild(document.createTextNode(text));
  return node.lastChild;
}

// Creates a text element that can be styled (actually a hidden <span>),
// and adds it to the specified node.
// Also, adds parameters to the element and its style as specified.
// Returns the new element.
function addStyledText(node, text, style_params, params) {
  node.appendChild(document.createElement("span"));
  if (params != undefined) {
    var index = 1;
    while (index < params.length) {
      node.lastChild[params[index-1]] = params[index];
      index += 2;
    }
  }
  if (style_params != undefined) {
    var index = 1;
    while (index < style_params.length) {
      node.lastChild.style[style_params[index-1]] = style_params[index];
      index += 2;
    }
  }
  node.lastChild.appendChild(document.createTextNode(text));
  return node.lastChild;
}

// If node starts with a text node, sets that text.
// Otherwise, adds it.
function setText(node, text) {
  if (node.hasChildNodes() && node.firstChild.nodeType == Node.TEXT_NODE) {
    node.firstChild.nodeValue = text;
  } else {
    addText(node, text);
  }
}

// Removes all children from node.
function removeAllChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

// Creates a custom button from two images.
// The first image is what the button looks like when
// not pressed; the other image is what it looks like when
// the mouse button is held down.  Clicking the button
// calls the callback function specified as onclick.
CustomButton = function(onclick, img_norm, img_down) {
  var result = document.createElement("img");
  result.src = img_norm;
  result.onclick = onclick;
  result.onmousedown = function() {
    this.src = img_down;
  }
  result.onmouseout = function() {
    this.src = img_norm;
  }
  result.onmouseup = function() {
    this.src = img_norm;
  }
  return result;
}

// Callback function used by convertToPanel, below.
function togglePanelVisibility(id) {
  if (Element.visible(id)) {
    Element.hide(id);
    $(id + "-img").src = "/images/arrow-closed.png";
  } else {
    Element.show(id);
    $(id + "-img").src = "/images/arrow-open.png";
  }
  if (typeof _IG_AdjustIFrameHeight != "undefined")
    _IG_AdjustIFrameHeight();
}

// Turns a normal <div> in the page into a nice-looking
// panel, that can be shrunk or expanded by clicking
// on a little pointy-arrow.
function convertToPanel(div, title, start_open) {
  var id = div.id;

  var content = document.createElement("span");
  content.innerHTML = div.innerHTML;
  div.innerHTML = "";
  div.id += "-wrapper";
  content.id = id;

  div.style.border = '1px solid #b3c9ef';
  div.style.margin = '0.2em 0.2em 0.2em 0.2em';
  div.style.MozBorderRadius = '0.5em';
  div.style.display = 'block';

  var tabheader = document.createElement("span");
  tabheader.id = id + "-tab";

  tabheader.style.backgroundColor = "#C3D9FF";
  tabheader.style.color = "#333333";
  tabheader.style.fontWeight = "bold";
  tabheader.style.paddingBottom = "0.25em";
  tabheader.style.paddingLeft = "0.5em";
  tabheader.style.paddingTop = "0.25em";
  tabheader.style.cursor = "pointer";
  tabheader.style.display = "block";

  content.style.display = "none";
  content.style.margin = '0.5em 0.5em 0.5em 0.5em';

  tabheader.onclick = function () {
    togglePanelVisibility(id);
  }
  addElement(tabheader, "img");
  tabheader.childNodes[0].id = id + "-img";
  tabheader.childNodes[0].src = "/images/arrow-closed.png";
  addText(tabheader, title);

  div.appendChild(tabheader);
  div.appendChild(content);

  if (start_open) togglePanelVisibility(id);
}

// Same as above, but just creates the HTML for the panel.
function makePanelHTML(id, title) {
  html = (
' <div id="IDHERE-wrapper" ' +
'      style="border:1px solid #b3c9ef;margin:0.2em 0.2em 0.2em 0.2em;-moz-border-radius:0.5em;display:block" ' +
' > ' +
'   <span id="IDHERE-tab" ' +
'         style="background-color:#C3D9FF;color:#333333;font-weight:bold;padding-bottom:0.25em;padding-left:0.5em;padding-top:0.25em;cursor:pointer;display:block" ' +
'         onClick="togglePanelVisibility(\'IDHERE\')" ' +
'   > ' +
'     <img id="IDHERE-img" src="/images/arrow-closed.png"> ' +
      title +
'   </span> ' +
'   <span id="IDHERE" style="display:none;margin:0.5em 0.5em 0.5em 0.5em"> ' +
'   </span> ' +
' </div> ');
  html = html.replace(/IDHERE/g, id);
  return html;
} 

// Dummy function used for debugging.
// Since the javascript in the core xml file has a
// dynamically-generated URL, Firebug can't actually set
// persistent breakpoints in it.  So, invoke this function,
// and set a breakpoint in its only line, then step out.
function dum() {
  return 2+2;
}

