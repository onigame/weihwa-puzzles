##########################
# an implementation of a game.
# This game is called "Tic Tac Toe"

import os
import logging

from google.appengine.ext import db
from google.appengine.ext.webapp import template
from sanitize import Sanitize

import duce
from duce import turn_based_game
from duce.exceptions import BadAjaxParameters

def UrlMappings():
  url_mappings = []
  return url_mappings

IllegalPlay = "illegal move"

class GameState(turn_based_game.GameState):
  grid = db.ListProperty(int)    # -1 is nobody, 0 and 1 correspond to the player with the seating position.

  def Setup(self, game):
    turn_based_game.GameState.Setup(self, game)
    self.grid = [-1] * 9

  def PlayerSymbol(self, seat):
    return self.SeatOrderPosition(seat)

  def AddMessage(self, message):
    pass

  def HandleAjax(self, request, response, seat):
    try:
      turn_based_game.GameState.HandleAjax(self, request, response, seat)
    except BadAjaxParameters:
      params = dict([(arg, request.get(arg)) for arg in request.arguments()])
      if request.get("action") == "get" and request.get("what") == "grid":
        output = ",".join([str(g) for g in self.grid])
      elif request.get("action") == "get" and request.get("what") == "my_value":
        output = str(self.PlayerSymbol(seat))
      elif request.get("action") == "put":
        try:
          self.MakePlay(request, response, seat);
          output = "SUCCESS"
        except IllegalPlay:
          raise BadAjaxParameters
      else:
        raise BadAjaxParameters

      response.headers['Content-Type'] = 'text/plain'
      response.out.write(output)

  def PlayPage(self, request, response, seat):
    self.template_values = {}
    self.template_values['messages'] = ""
    self.template_values['state'] = self
    path = os.path.join(os.path.dirname(__file__), 'play.html')
    response.out.write(template.render(path, self.template_values))

  def MakePlay(self, request, response, seat):
    if not self.IsActive(seat):
      self.AddMessage("You cannot make a move because it is not your turn!")
      raise IllegalPlay
    if not request.get("chose"):
      self.AddMessage("You did not choose a valid location!")
      raise IllegalPlay

    chosen_value = int(request.get("chose"))

    if not (0 <= chosen_value <= 8):
      self.AddMessage("That is not a valid position!</p>")
      raise IllegalPlay
    if self.grid[chosen_value] != -1:
      self.AddMessage("That position is already occupied!</p>")
      raise IllegalPlay

    symbol = self.PlayerSymbol(seat);
    self.grid[chosen_value] = symbol;

    if self.HasWinner(symbol):
      self.AddMessage("You have completed three-in-a-row!  You win!")
      self.DeclareVictory(seat)
    elif self.GridFilled():
      self.AddMessage("The grid is filled.  Drawn game.")
      self.DeclareDraw()
    else:
      self.AddMessage("You have chosen a space. It is the other player's turn.")
      self.DeclareNextPlayer()

    self.put()

  def HasWinner(self, symbol):
    if self.grid[0] == symbol and self.grid[1] == symbol and self.grid[2] == symbol:
      return True
    if self.grid[3] == symbol and self.grid[4] == symbol and self.grid[5] == symbol:
      return True
    if self.grid[6] == symbol and self.grid[7] == symbol and self.grid[8] == symbol:
      return True
    if self.grid[0] == symbol and self.grid[3] == symbol and self.grid[6] == symbol:
      return True
    if self.grid[1] == symbol and self.grid[4] == symbol and self.grid[7] == symbol:
      return True
    if self.grid[2] == symbol and self.grid[5] == symbol and self.grid[8] == symbol:
      return True
    if self.grid[2] == symbol and self.grid[4] == symbol and self.grid[6] == symbol:
      return True
    if self.grid[0] == symbol and self.grid[4] == symbol and self.grid[8] == symbol:
      return True
    return False

  def GridFilled(self):
    for item in self.grid:
      if item == -1:
        return False
    return True
