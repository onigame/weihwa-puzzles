##########################
# an implementation of a game.
# This game is called "Guess My Die Roll",
# or GMDR for short.
#
# The rules are simple.
# Both players take alternating turns.
# On your turn, the computer rolls a six-sided die at random.
# You guess what face the computer rolled.
# If you guess right, you win!
# Otherwise, it is the other player's turn.

import random
import os
import logging

from google.appengine.ext.webapp import template
from sanitize import Sanitize

import duce
from duce import turn_based_game

def UrlMappings():
  url_mappings = []
  return url_mappings

class GameState(turn_based_game.GameState):

  def Setup(self, game):
    turn_based_game.GameState.Setup(self, game)

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
    self.template_values['state'] = self
    self.ShowGameState(request, response)

  def MakePlay(self, request, response, action, seat):
    if action != "choose":
      self.messages += "<P>The action '%s' is not a valid action.</p>" % Sanitize(action)
      return
    chosen_value = request.get("chose")
    dieroll = random.choice(["1","2","3","4","5","6"])
    if chosen_value == dieroll:
      self.messages += "<P>You chose %s correctly!  Yay!</P>" % dieroll
      self.DeclareVictory(seat)
    else:
      self.messages += "<P>You chose %s but the die roll was %s.  Sorry, it is the other player's turn.</P>" % (Sanitize(chosen_value), dieroll)
      self.DeclareNextPlayer()

  def ShowGameState(self, request, response):
    self.template_values['messages'] = self.messages
    path = os.path.join(os.path.dirname(__file__), 'play.html')
    response.out.write(template.render(path, self.template_values))
