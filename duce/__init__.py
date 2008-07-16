import os
import logging
import sys
import re
import random

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template

import puzzles

##########################################################
# exceptions

SeatingCountError = "The game/player pair did not have the expected number of seatings"

##########################################################

class Player(db.Model):
  # key is uid
  user = db.ReferenceProperty(puzzles.User)    # who am I?
  public = db.BooleanProperty()                # show me on public forums
  l4g = db.BooleanProperty()                   # "looking for game"

class Game(db.Model):
  # key is "game_id", which is a number
  name = db.StringProperty()                          # assigned by creator, need not be unique
  created = db.DateTimeProperty(auto_now_add=True)    # when the game was created
  creator = db.ReferenceProperty(Player)          # uid of created player
  modified = db.DateTimeProperty(auto_now=True)       # when last move in the game was made
  state = db.StringProperty()                         # in case game state needs to be stored (should be a pointer of some sort?)
  completed = db.BooleanProperty(default=False)       # is the game over?
  ruleset = db.StringProperty()                       # the core rules we're playing by (just a title)
  variant = db.StringProperty()                       # what variant, if any

  def getAllSeats(self):
    result = []
    seating_query = Seating.all()
    seating_query.filter('game =', self)
    for seating in seating_query:
      result.append(seating)
    return result

  def randomSeat(self):
    return random.choice(self.getAllSeats())

  def getAllPlayers(self):
    result = []
    seating_query = Seating.all()
    seating_query.filter('game =', self)
    for seating in seating_query:
      if not seating.kibitz:
        result.append(seating)
    return result

  def reportEnded(self, winners):
    '''
    winners is a list of Seatings
    '''
    self.completed = True
    winning_keys = [winner.key() for winner in winners]
    for seat in self.getAllSeats():
      if seat.key() in winning_keys:
        seat.result = 1.0
      else:
        seat.result = 0.0
      seat.put()

class Seating(db.Model):
  '''
  a seating is a player/game relation; parent is the game
  it is theoretically possible for the same player to be seated multiple times, but we don't support that yet
  '''
  game = db.ReferenceProperty(Game)
  player = db.ReferenceProperty(Player)
  nickname = db.StringProperty()         # player's nickname in the game
  kibitz = db.BooleanProperty()          # just looking, not actually playing
  result = db.FloatProperty()            # 1.0 for a "victory", 0.0 for a "loss"

  @staticmethod
  def getSeating(game, player):
    result = []
    seating_query = Seating.all()
    seating_query.filter('game =', game)
    seating_query.filter('player =', player)
    for seating in seating_query:
      result.append(seating)
    if len(result) != 1:
      raise SeatingCountError, len(result) + game.key().id() + player.key().name()
    return result[0]

##########################################

class DucePage(webapp.RequestHandler):
  home_url = "/duce/index.html"

  def post(self, filename):
    self.get(filename)
  def get(self, filename):
    user = users.get_current_user()
    if not user:
      self.redirect(users.create_login_url(self.request.url))
      return

    self.player = Player.get_or_insert(puzzles.CurrentUID(), 
        user=puzzles.CurrentUser(),
        public=True,
        l4g=True,
      )

    if filename == "/index.html":
      self.MainPage()
    elif filename == "/faq.html":
      self.FaqPage()
    elif filename == "/action.cgi":
      self.ActionPage();
    elif filename == "/play.cgi":
      self.PlayPage();
    else:
      self.redirect(self.home_url)

  def MainPage(self):

    seating_query = Seating.all()
    seating_query.filter('player =', self.player)
    seatings = []
    for seating in seating_query:               # add game names to the seatings
      seatings.append(seating)

    available_player_query = Player.all()
    available_player_query.filter('l4g =', True)

    available_players = [self.player]
    for available_player in available_player_query:
      if available_player.key() != self.player.key():
        available_players.append(available_player)

    if os.environ.get('SERVER_NAME') == 'weihwa-puzzles.appspot.com':
      weihwa_email = 'weihwa.feedback@gmail.com'
      server_url = 'http://weihwa-puzzles.appspot.com/duce/'
    else:
      weihwa_email = 'whuang@google.com'
      server_url = 'http://enigma.sfo.corp.google.com:8080/duce/'

    template_values = {
      'uid': self.player.key().name(),
      'player': self.player,
      'available_players': available_players,
      'seatings': seatings,
      'weihwa_email': weihwa_email,
      'server_url': server_url,
    }
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    self.response.out.write(template.render(path, template_values))

  def FaqPage(self):
    if os.environ.get('SERVER_NAME') == 'weihwa-puzzles.appspot.com':
      weihwa_email = 'weihwa.feedback@gmail.com'
      server_url = 'http://weihwa-puzzles.appspot.com/duce/'
    else:
      weihwa_email = 'whuang@google.com'
      server_url = 'http://enigma.sfo.corp.google.com:8080/duce/'
    template_values = {
      'weihwa_email': weihwa_email,
      'server_url': server_url,
    }
    path = os.path.join(os.path.dirname(__file__), 'faq.html')
    self.response.out.write(template.render(path, template_values))

  def ActionPage(self):
    command = self.request.get("command")
    if command == "toggle":
      self.PlayerToggle()
    if command == "startgame":
      self.StartGame()

  def GoBack(self):
    url = self.request.get("url")
    if url:
      self.redirect(url)
    else:
      self.redirect(self.home_url)

  def StartGame(self):
    # who is playing?
    players = []
    for arg in self.request.arguments():
      # u.name = re.match("([A-Za-z0-9_])+", guser.nickname()).group(1)
      mobj = re.match(r"cg\-(.+)", arg)
      if mobj:
        dp = Player.get_by_key_name(mobj.group(1))
        if not dp:
          self.response.headers['Content-Type'] = 'text/plain'
          self.response.out.write("The player with code %s does not exist!" % mobj.group(1))
          return;
        players.append(dp)
    game = Game()
    game.name = "Unnamed"
    game.creator = self.player
    game.ruleset = self.request.get('ruleset')
    game.variant = self.request.get('variant')
    game.put()
    for p in players:
      seating = Seating(parent=game)
      seating.game = game
      seating.player = p
      seating.nickname = p.user.name
      seating.kibitz = False
      seating.put()

    if game.ruleset == "GuessMyDieRoll":
      gmdr_mgr = guess_my_die_roll.GMDR_Manager(Seating.getSeating(game, self.player))
      gmdr_mgr.StartGame()

    self.GoBack()

  def PlayerToggle(self):
    field = self.request.get("field")
    if field == "public":
      self.player.public = not self.player.public
    if field == "l4g":
      self.player.l4g = not self.player.l4g
      if self.player.l4g:
        self.player.public = True
    self.player.put()
    self.GoBack()

  def PlayPage(self):
    try:
      game = Game.get_by_id(int(self.request.get("game_id")))
      seating = Seating.getSeating(game, self.player)
      if game.ruleset == "GuessMyDieRoll":
        gmdr_mgr = guess_my_die_roll.GMDR_Manager(seating)
        gmdr_mgr.PlayPage(self.request, self.response)
        return
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("The game %s is not implemented yet.\n" % game.ruleset)
      self.DebugPage()
      return
    except ValueError:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("'%s' is not a valid game ID.\n" % self.request.get("game_id"))
      self.DebugPage()

  def DebugPage(self):
    args = self.request.arguments()
    self.response.headers['Content-Type'] = 'text/plain'
    for arg in args:
      self.response.out.write(arg)
      self.response.out.write("\n")
      self.response.out.write(self.request.get(arg))
      self.response.out.write("\n")

########################################
## add paths for games.

import guess_my_die_roll

def UrlMappings():
  url_mappings = []
  url_mappings.append(('/duce(.*)', DucePage))
  url_mappings.extend(guess_my_die_roll.UrlMappings())
  return url_mappings

