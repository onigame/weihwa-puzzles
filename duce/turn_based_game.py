#####################
# an implementation for a generic turn-based game
# that saves each state
# that has a unique winner (consider changing this)

import logging
import random

from google.appengine.ext import db
from exceptions import BadAjaxParameters

import duce

class SeatOrder(db.Model):
  order = db.ListProperty(db.Key)      # should be a list of Seat keys

  def GenerateFrom(self, game):
    players = game.GetAllPlayers()
    self.order = [player.key() for player in players]
    random.shuffle(self.order)

class Result(db.Model):
  game_ended = db.BooleanProperty(default=False)
  game_end_time = db.DateTimeProperty(auto_now_add=True)
  winner = db.ReferenceProperty(duce.Seat)

class GameState(duce.GameState):
  '''
  A simple turn-based game
  '''
  active_seat = db.ReferenceProperty(duce.Seat, collection_name="current_player")
  result = db.ReferenceProperty(Result)              # not defined until the game is over
  seat_order = db.ReferenceProperty(SeatOrder)

  def HandleAjax(self, request, response, seat):
    try:
      duce.GameState.HandleAjax(self, request, response, seat)
    except BadAjaxParameters:
      action = request.get("action")
      output = ""
      if action == "get":
        what = request.get("what")
        if what == "grid":
          output = ",".join([str(g) for g in self.grid])
        elif what == "active_nickname":
          output = self.ActiveSeat().nickname
        elif what == "is_active":
          output = "1" if self.IsActive(seat) else "0"
        elif what == "is_over":
          if self.result:
            output = "1" if self.result.game_ended else "0"
          else:
            output = "0"
        elif what == "is_draw":
          if self.result and self.result.game_ended:
            output = "0" if self.result.winner else "1"
          else:
            raise BadAjaxParameters
        elif what == "is_winner":
          if self.result and self.result.game_ended:
            output = "1" if self.result.winner == seat else "0"
          else:
            raise BadAjaxParameters
        elif what == "winner_nickname":
          if self.result and self.result.game_ended:
            output = self.result.winner.nickname
          else:
            raise BadAjaxParameters
        else:
          raise BadAjaxParameters
      else:
        raise BadAjaxParameters

      response.headers['Content-Type'] = 'text/plain'
      response.out.write(output)

  def Setup(self, game):
    duce.GameState.Setup(self, game)
    seat_order = SeatOrder()
    seat_order.GenerateFrom(game)
    seat_order.put()

    self.seat_order = seat_order
    self.active_seat = random.choice(game.GetAllPlayers())

  def PlayPage(self, request, response, seat):
    assert 0, "TurnBasedGameState is abstract!"

  def IsActive(self, seat):
    return seat.key() == self.active_seat.key()

  def ActiveSeat(self):
    return self.active_seat

  def DeclareVictory(self, seat):
    result = Result()
    result.game_ended = True
    result.winner = seat
    result.put()
    self.result = result
    self.put()
    self.game.DeclareCompleted([seat])

  def DeclareDraw(self):
    result = Result()
    result.game_ended = True
    result.winner = None
    result.put()
    self.result = result
    self.put()
    self.game.DeclareCompleted([])

  def SeatOrderPosition(self, seat):
    seats = [num for num in range(len(self.seat_order.order))
                 if self.seat_order.order[num] == seat.key()]
    if len(seats) != 1:
      logging.error("Wrong number of seats %s %s" % (self.key(), seat.key()))
    return seats[0]

  def DeclareNextPlayer(self):
    pos = self.SeatOrderPosition(self.active_seat)
    pos += 1
    if pos == len(self.seat_order.order):
      pos = 0
    self.active_seat = duce.Seat.get(self.seat_order.order[pos])
    self.put()

  def GameEnded(self):
    if not self.result:
      return False
    return self.result.game_ended
