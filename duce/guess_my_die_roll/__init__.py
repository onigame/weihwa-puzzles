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
import duce
import logging

#from google.appengine.api import users
#from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from sanitize import Sanitize

def UrlMappings():
  url_mappings = []
  return url_mappings

class GMDR_State(db.Model):
  game = db.ReferenceProperty(duce.Game)
  active_seat = db.ReferenceProperty(duce.Seating, collection_name="gmdr_state_current_player") 
  timestamp = db.DateTimeProperty(auto_now_add=True)       # when this state was created
  game_ended = db.BooleanProperty(default=False)
  game_end_time = db.DateTimeProperty()       # when this state was created
  winner = db.ReferenceProperty(duce.Seating, default=None, collection_name="gmdr_state_winner")

  def NextState(self):
    '''
    Returns another state that is the same as this one but has a new timestamp and is stored separately.
    '''
    result = GMDR_State(parent=self.parent())
    result.game = self.game
    result.active_seat = self.active_seat
    result.game_ended = self.game_ended
    result.game_end_time = self.game_end_time
    result.winner = self.winner
    return result

###############################################
# exceptions

#############################################

class GMDR_Manager:
  def __init__(self, seating):
    self.seating = seating
    # do something with ducegame.variant??

  def StartGame(self):
    self.state = GMDR_State(parent=self.seating.game)
    self.state.game = self.seating.game
    self.state.active_seat = self.seating.game.randomSeat()
    self.state.put()
    return self.state

  def LoadCurrentState(self):
    query = GMDR_State.all()
    query.order("-timestamp")
    query.filter("game =", self.seating.game)
    results = query.fetch(1)
    if len(results) != 1:
      return False
    self.state = results[0]
    return True

  def PlayPage(self, request, response):
    self.messages = ""
    if not self.LoadCurrentState():
      self.messages += "<P>For some reason, the game was not started.  Starting now...</P>"
      self.StartGame()

    if not self.state.game_ended and not self.state.active_seat:
      self.messages += "<P>Error... there is no active player.  Choosing one at random now...</P>"
      self.state.active_seat = self.seating.game.randomSeat()
      self.state.put()

    is_active = self.seating.key() == self.state.active_seat.key()

    logging.debug("FOOOOOO %s %s" % (self.seating.key, self.state.active_seat.key))

    self.template_values = {}
    self.template_values['seating'] = self.seating

    action = request.get("action")

    if action:
      if is_active:
        # db.run_in_transaction(self.MakePlay, request, response, action)
        self.MakePlay(request, response, action)
      else:
        self.messages += "<P>You cannot make a move because it is not your turn!</P>"

    is_active = self.seating.key() == self.state.active_seat.key()
    self.template_values['is_active'] = is_active
    self.template_values['state'] = self.state
    self.ShowGameState(request, response)

  def MakePlay(self, request, response, action):
    if action != "choose":
      self.messages += "<P>The action '%s' is not a valid action.</p>" % Sanitize(action)
      return
    chosen_value = request.get("chose")
    dieroll = random.choice(["1","2","3","4","5","6"])
    # create a new state
    self.state = self.state.NextState()
    if chosen_value == dieroll:
      self.messages += "<P>You chose %s correctly!  Yay!</P>" % dieroll
      self.GameOver()
    else:
      self.messages += "<P>You chose %s but the die roll was %s.  Sorry, it is the other player's turn.</P>" % (Sanitize(chosen_value), dieroll)
      self.NextPlayer()

  def NextPlayer(self):
    # this is insanely inefficient.
    current = self.state.active_seat.key()
    while (self.state.active_seat.key() == current):
      self.state.active_seat = self.seating.game.randomSeat()
    self.state.put()
    return

  def GameOver(self):
    self.state.game_ended = True
    self.state.winner = self.state.active_seat
    self.state.put()
    self.state.game.reportEnded([self.state.winner])
    return

  def ShowGameState(self, request, response):
    self.template_values['messages'] = self.messages
    path = os.path.join(os.path.dirname(__file__), 'play.html')
    response.out.write(template.render(path, self.template_values))
