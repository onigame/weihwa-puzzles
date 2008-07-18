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
import sanitize

##########################################################
# exceptions

SeatCountError = "The game/player pair did not have the expected number of seats"

##########################################################

class Player(db.Model):
  # key is uid
  user = db.ReferenceProperty(puzzles.User)    # who am I?
  public = db.BooleanProperty()                # show me on public forums
  l4g = db.BooleanProperty()                   # "looking for game"
  comment = db.TextProperty()                  # right now, just used as a suggestion/comment box

class Game(db.Model):
  # key is "game_id", which is a number
  name = db.StringProperty()                          # assigned by creator, need not be unique
  created = db.DateTimeProperty(auto_now_add=True)    # when the game was created
  creator = db.ReferenceProperty(Player, collection_name="duce_game_creator")              # created player
  modified = db.DateTimeProperty(auto_now=True)       # when last move in the game was made
  ruleset = db.StringProperty()                       # the core rules we're playing by (just a title)
  variant = db.StringProperty()                       # what variant, if any
  started = db.BooleanProperty(default=False)         # has the game started?
  completed = db.BooleanProperty(default=False)       # is the game over?

  def GetAllSeats(self):
    result = []
    seat_query = Seat.all()
    seat_query.filter('game =', self)
    for seat in seat_query:
      result.append(seat)
    return result

  def GetAllPlayers(self):
    result = []
    seat_query = Seat.all()
    seat_query.filter('game =', self)
    for seat in seat_query:
      if not seat.kibitz:
        result.append(seat)
    return result

  def DeclareCompleted(self, winners):
    '''
    winners is a list of Seats
    '''
    self.completed = True
    winning_keys = [winner.key() for winner in winners]
    for seat in self.GetAllSeats():
      if seat.key() in winning_keys:
        seat.result = 1.0
      else:
        seat.result = 0.0
      seat.put()
    self.put()

class Seat(db.Model):
  '''
  a seat is a player/game relation; parent is the game
  it is theoretically possible for the same player to be seated multiple times, but we don't support that yet
  '''
  game = db.ReferenceProperty(Game)
  player = db.ReferenceProperty(Player)
  nickname = db.StringProperty()         # player's nickname in the game
  kibitz = db.BooleanProperty()          # just looking, not actually playing
  result = db.FloatProperty()            # 1.0 for a "victory", 0.0 for a "loss"

  @staticmethod
  def GetSeat(game, player):
    result = []
    seat_query = Seat.all()
    seat_query.filter('game =', game)
    seat_query.filter('player =', player)
    for seat in seat_query:
      result.append(seat)
    if len(result) != 1:
      raise SeatCountError, len(result) + game.key().id() + player.key().name()
    return result[0]

class GameState(db.Model):
  '''
  Stores state of the game that can be changed.
  '''
  game = db.ReferenceProperty(Game)                   # back-reference; don't change this.
  created = db.DateTimeProperty(auto_now_add=True)       # when this state was created
  modified = db.DateTimeProperty(auto_now=True)       # when this state was created
  completed = db.BooleanProperty(default=False)       # is the game over?

  def Setup(self, game):
    self.game = game
    self.completed = False

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
    elif filename == "/admin.html":
      self.AdminPage();
    elif filename == "/suggestion_box.html":
      self.SuggestionBoxPage()
    elif filename == "/get_players_in_game.ajax":
      self.GetPlayersInGameAjax();
    elif filename == "/get_comment.ajax":
      self.GetCommentAjax();
    elif filename == "/put_comment.ajax":
      self.PutCommentAjax();
    elif filename == "/action.cgi":
      self.ActionPage();
    elif filename == "/play.cgi":
      self.PlayPage();
    else:
      self.redirect(self.home_url)

  def MainPage(self):

    seat_query = Seat.all()
    seat_query.filter('player =', self.player)
    seats = []
    for seat in seat_query:               # add game names to the seats
      seats.append(seat)

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
      'seats': seats,
      'weihwa_email': weihwa_email,
      'server_url': server_url,
    }
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    self.response.out.write(template.render(path, template_values))

  def AdminPage(self):
    if not users.is_current_user_admin():
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("You are not an admin.")
      return
    if self.request.get("upgrade") == "1":
      self.response.headers['Content-Type'] = 'text/plain'
      import generic_game
      generic_game.Upgrade(self.response)
      self.response.out.write("Upgraded.")
      return
    template_values = {
    }
    path = os.path.join(os.path.dirname(__file__), 'admin.html')
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
      game = self.CreateGame()
      self.StartGame(game)
    self.GoBack()

  def GoBack(self):
    url = self.request.get("url")
    if url:
      self.redirect(url)
    else:
      self.redirect(self.home_url)

  def CreateGame(self):
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
      seat = Seat(parent=game)
      seat.game = game
      seat.player = p
      seat.nickname = p.user.name
      seat.kibitz = False
      seat.put()
    return game

  def StartGame(self, game):
    if game.ruleset == "GuessMyDieRoll":
      state = guess_my_die_roll.GameState()
      state.Setup(game)
      state.put()
      game.state = state
      game.started = True
      game.put()
    if game.ruleset == "TicTacToe":
      state = tic_tac_toe.GameState()
      state.Setup(game)
      state.put()
      game.state = state
      game.started = True
      game.put()

  def PlayerToggle(self):
    field = self.request.get("field")
    if field == "public":
      self.player.public = not self.player.public
    if field == "l4g":
      self.player.l4g = not self.player.l4g
      if self.player.l4g:
        self.player.public = True
    self.player.put()

  def PlayPage(self):
    try:
      game = Game.get_by_id(int(self.request.get("game_id")))
      seat = Seat.GetSeat(game, self.player)

      if game.ruleset == "GuessMyDieRoll":
        query = guess_my_die_roll.GameState.all()
        query.filter('game =', game)
        query.order('-modified')
        results = query.fetch(1)
        if (len(results) > 0):
          results[0].PlayPage(self.request, self.response, seat)
        else:
          self.response.headers['Content-Type'] = 'text/plain'
          self.response.out.write("Error: no game state exists")
        return

      if game.ruleset == "TicTacToe":
        query = tic_tac_toe.GameState.all()
        query.filter('game =', game)
        query.order('-modified')
        results = query.fetch(1)
        if (len(results) > 0):
          results[0].PlayPage(self.request, self.response, seat)
        else:
          self.response.headers['Content-Type'] = 'text/plain'
          self.response.out.write("Error: no game state exists")
        return

      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("The game %s is not implemented yet.\n" % game.ruleset)
      self.DebugPage()
      return
    except ValueError:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("'%s' is not a valid game ID.\n" % self.request.get("game_id"))
      self.DebugPage()

  def SuggestionBoxPage(self):
    all_player_query = Player.all()
    all_players = []
    for player in all_player_query:
      all_players.append(player)
    template_values = {
      'cur_player': self.player,
      'all_players': all_players,
    }
    path = os.path.join(os.path.dirname(__file__), 'suggestion_box.html')
    self.response.out.write(template.render(path, template_values))

  def DebugPage(self):
    args = self.request.arguments()
    self.response.headers['Content-Type'] = 'text/plain'
    for arg in args:
      self.response.out.write(arg)
      self.response.out.write("\n")
      self.response.out.write(self.request.get(arg))
      self.response.out.write("\n")

  def PutCommentAjax(self):
    if self.request.get("comment"):
      self.player.comment = self.request.get("comment")
      self.player.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("SUCCESS")
    self.DebugAjax();

  def GetPlayersInGameAjax(self):
    game_id = self.request.get("game_id")
    LocalError = "Something went wrong in GetPlayersInGameAjax: "
    try:
      if not game_id:
        raise LocalError, "game_id does not exist"
      game = Game.get_by_id(int(game_id))
      if not game:
        raise LocalError, "game does not exist"
      players = game.GetAllPlayers()
      self.response.headers['Content-Type'] = 'text/plain'
      first = True
      for player in players:
        if not player:
          raise LocalError, "player with key %s does not exist" % game_id
        if first:
          first = False
        else:
          self.response.out.write(", ")
        in_game_nick = player.nickname
        whp_nick = player.player.user.name
        self.response.out.write(in_game_nick)
        if in_game_nick != whp_nick:
          self.response.out.write(" (%s)" % whp_nick)
    except LocalError, explanation:
      logging.error(LocalError + explanation)
      self.error(500)

  def GetCommentAjax(self):
    key_name = self.request.get("key_name")
    LocalError = "Something went wrong in GetCommentAjax: "
    try:
      if not key_name:
        raise LocalError, "key does not exist"
      player = Player.get_by_key_name(key_name)
      if not player:
        raise LocalError, "player with key %s does not exist" % key_name
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write(sanitize.PlainText_to_HTML(player.comment)
                              if player.comment 
                              else '<i>[no comments]</i>')
    except LocalError, explanation:
      logging.error(LocalError + explanation)
      self.error(500)

  def DebugAjax(self):
    args = self.request.arguments()
    for arg in args:
      logging.debug("AJAX %s : %s" % (arg, self.request.get(arg)))
    self.response.headers['Content-Type'] = 'text/plain'
    return;


########################################
## add paths for games.

import guess_my_die_roll
import tic_tac_toe

def UrlMappings():
  url_mappings = []
  url_mappings.append(('/duce(.*)', DucePage))
  url_mappings.extend(guess_my_die_roll.UrlMappings())
  url_mappings.extend(tic_tac_toe.UrlMappings())
  return url_mappings

