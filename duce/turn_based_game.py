#####################
# an implementation for a generic turn-based game
# that saves each state
# that has a unique winner (consider changing this)

import logging
import random

from google.appengine.ext import db

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

  def DeclareVictory(self, seat):
    result = Result()
    result.game_ended = True
    result.winner = seat
    result.put()
    self.result = result
    self.put()
    self.game.DeclareCompleted([seat])

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
