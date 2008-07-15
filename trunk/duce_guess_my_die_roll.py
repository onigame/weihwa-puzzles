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

import puzzleutils
import random
import os

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template

directory = 'duce/guess_my_die_roll/'

def UrlMappings():
  url_mappings = []
  return url_mappings

class GMDR_State(db.Model):
  current_player = db.StringProperty()                     # uid of current player
  timestamp = db.DateTimeProperty(auto_now_add=True)       # when this state was created

class GMDR_Manager:
  def __init__(self, ducegame, uid):
    self.uid = uid
    self.ducegame = ducegame
    self.seats = ducegame.getAllSeats()
    self.players = ducegame.getAllPlayers()
    # do something with ducegame.variant??

  def StartGame(self):
    self.state = GMDR_State()
    self.state.current_player = random.choice(self.players).uid
    self.state.put()
    return self.state

  def LoadCurrentState(self):
    query = GMDR_State.all()
    query.order("-timestamp")
    results = query.fetch(1)
    if len(results) != 1:
      return False
    self.state = results[0]
    return True

  def PlayPage(self, request, response):
    started_game = False
    if not self.LoadCurrentState():
      cur_state = self.StartGame()
      started_game = True
    ready_to_play = (self.uid == self.state.current_player)
    if ready_to_play:
      cur_player_name = "<b>You!</b>"
    else:
      cur_player_name = puzzleutils.getSeatingNickname(self.state.current_player)
    template_values = {
      'started_game': started_game,
      'ready_to_play': ready_to_play,
      'cur_player_name': cur_player_name,
    }
    path = os.path.join(os.path.dirname(__file__), directory + 'play.html')
    response.out.write(template.render(path, template_values))


