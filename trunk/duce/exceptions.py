class DuceException:
  "General Exception for Duce."

class SeatCountError(DuceException):
  "The game/player pair did not have the expected number of seats"

class GameHasNoState(DuceException):
  "The selected game does not have a current GameState"

class BadGameSpecificCommand(DuceException):
  "A game-specific command was not recognized by the game."

class BadAjaxParameters(DuceException):
  "The given AJAX parameters were not recognized by the game."
