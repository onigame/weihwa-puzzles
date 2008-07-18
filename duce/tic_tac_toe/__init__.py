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

def UrlMappings():
  url_mappings = []
  return url_mappings

class GameState(turn_based_game.GameState):
  grid = db.ListProperty(int)    # -1 is nobody, 0 and 1 correspond to the player with the seating position.

  def Setup(self, game):
    turn_based_game.GameState.Setup(self, game)
    self.grid = [-1] * 9

  def PlayPage(self, request, response, seat):
    self.messages = ""

    self.template_values = {}

    action = request.get("action")

    if action:
      if self.IsActive(seat):
        self.MakePlay(request, response, action, seat)
      else:
        self.messages += "<P>You cannot make a move because it is not your turn!</P>"

    self.template_values['seat'] = seat
    self.template_values['is_active'] = self.IsActive(seat)
    self.ShowGameState(request, response)

  def MakePlay(self, request, response, action, seat):
    if action != "choose":
      self.messages += "<P>The action '%s' is not a valid action.</p>" % Sanitize(action)
      return

    chosen_value = int(request.get("chose"))

    if not (0 <= chosen_value <= 8):
      self.messages += "<P>That is not a valid position!</p>"
      return

    if self.grid[chosen_value] != -1:
      self.messages += "<P>That position is already occupied!</p>"
      return

    symbol = self.SeatOrderPosition(seat);
    self.grid[chosen_value] = symbol;

    if self.HasWinner(symbol):
      self.messages += "<P>You have completed three-in-a-row!  You win!</P>"
      self.DeclareVictory(seat)
    else:
      self.messages += "<P>You have chosen a space. It is the other player's turn.</P>"
      self.DeclareNextPlayer()

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

  def ShowGameState(self, request, response):
    self.template_values['state'] = self
    self.template_values['game_ended'] = self.GameEnded()
    self.template_values['messages'] = self.messages
    self.template_values['grid'] = self.grid
    path = os.path.join(os.path.dirname(__file__), 'play.html')
    response.out.write(template.render(path, self.template_values))
