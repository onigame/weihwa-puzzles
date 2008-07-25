import guess_my_die_roll
import tic_tac_toe

from exceptions import DuceException

###############################
# Exceptions

class UnrecognizedGame(DuceException):
  "The game (ruleset) was not recognized."

###############################

names = {
  "GuessMyDieRoll" : guess_my_die_roll,
  "TicTacToe" : tic_tac_toe,
}
