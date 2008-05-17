import wsgiref.handlers
import os
import datetime
import string

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from datetime import date

class PuzzleGadget:
  def __init__(self, year, month, mdate, display_name, short_name):
    self.date = date(year, month, mdate)
    self.display_name = display_name
    if (short_name == ''):
      self.short_name = string.replace(string.lower(display_name),' ','')
    else:
      self.short_name = short_name

puzzle_gadgets = [
  PuzzleGadget(2007, 10, 15, 'Udoku', ''),
  PuzzleGadget(2007,  6,  1, 'Ssudoku', ''),
  PuzzleGadget(2007,  3, 26, 'Memory Lists', 'lists'),
  PuzzleGadget(2007,  2, 26, 'Latin Squares', ''),
  PuzzleGadget(2007,  2,  9, 'Bridges 3', 'bridges'),
  PuzzleGadget(2007,  1, 26, 'Bridges 2', ''),
  PuzzleGadget(2007,  1, 11, 'Knight Attack', ''),
  PuzzleGadget(2006, 12, 15, 'Holiday Ornaments', 'ornaments'),
  PuzzleGadget(2006, 12,  8, 'Word Wreck Tangle 2', 'wordtangle2'),
  PuzzleGadget(2006, 12,  1, 'Trilands', ''),
  PuzzleGadget(2006, 11, 24, 'Bridges', ''),
  PuzzleGadget(2006, 11, 17, 'Mini Kakuro 4', ''),
  PuzzleGadget(2006, 11, 10, 'Mini Kakuro 3', ''),
  PuzzleGadget(2006, 11,  3, 'Whyme Rhyme 2', 'whyme2'),
  PuzzleGadget(2006, 10, 27, 'Hidden Insults', ''),
  PuzzleGadget(2006, 10, 20, 'Mini Battleships 2', ''),
  PuzzleGadget(2006, 10, 13, 'Basic WPC Puzzle', 'wpc2006'),
  PuzzleGadget(2006, 10,  6, 'Mister Mind', ''),
  PuzzleGadget(2006,  9, 29, 'Word Wreck Tangle', 'wordtangle'),
  PuzzleGadget(2006,  9, 22, 'Last Chessman Standing', 'chesselimination'),
  PuzzleGadget(2006,  9, 15, 'Pipe Spin', 'pipes'),
  PuzzleGadget(2006,  9,  8, 'Mini Battleships', ''),
  PuzzleGadget(2006,  9,  1, 'Cross-O Change-O', 'crosso'),
  PuzzleGadget(2006,  8, 25, 'Mini Kakuro 2', ''),
  PuzzleGadget(2006,  8, 18, 'Nine Letters', ''),
  PuzzleGadget(2006,  8, 11, 'Bolt Swap', ''),
  PuzzleGadget(2006,  8,  4, 'Retrospective', ''),
  PuzzleGadget(2006,  7, 28, 'Mini Kakuro', ''),
  PuzzleGadget(2006,  7, 21, 'Give and Take', 'anagramlist'),
  PuzzleGadget(2006,  7, 14, 'Knight Swap', ''),
  PuzzleGadget(2006,  7,  7, 'US States Jigsaw Sudoku', 'statesudoku'),
  PuzzleGadget(2006,  6, 30, 'Confounded Compounds', 'eightletters'),
  PuzzleGadget(2006,  6, 23, 'Dance Maze', 'maze'),
  PuzzleGadget(2006,  6, 16, 'Minesweeper', ''),
  PuzzleGadget(2006,  6,  9, 'Distance', ''),
  PuzzleGadget(2006,  6,  2, 'Whyme Rhyme', 'whyme'),
  PuzzleGadget(2005,  5, 26, '3, 3, 8, 8', '3388'),
]

class MainPage(webapp.RequestHandler):
  def get(self):
    template_values = {
      'puzzle_gadgets': puzzle_gadgets,
      }
    path = os.path.join(os.path.dirname(__file__), 'mainpage.html')
    self.response.out.write(template.render(path, template_values))

class GadgetPage(webapp.RequestHandler):
  def get(self):
    template_values = {
      'gadget_name': self.request.get('g'),
      }
    path = os.path.join(os.path.dirname(__file__), 'gadgetpage.html')
    self.response.out.write(template.render(path, template_values))

def main():
  application = webapp.WSGIApplication([('/', MainPage),
                                        ('/gadgetpage', GadgetPage),
                                       ],
                                       debug=True)
  wsgiref.handlers.CGIHandler().run(application)

if __name__ == "__main__":
  main()

