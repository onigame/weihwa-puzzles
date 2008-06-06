import wsgiref.handlers
import os
import datetime
import string
import random

from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from datetime import date
from django.template import TemplateDoesNotExist

random.seed(None)

class PuzzleGadget:
  def __init__(self, year, month, mdate, display_name, short_name):
    self.date = date(year, month, mdate)
    self.display_name = display_name
    if (short_name == ''):
      self.short_name = string.replace(string.lower(display_name),' ','')
    else:
      self.short_name = short_name

puzzle_gadgets = [
  PuzzleGadget(2008,  5, 23, 'Diagonal Sudoku', ''),
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
  PuzzleGadget(2005,  1,  1, 'Series of Tubes', 'series_of_tubes'),
  PuzzleGadget(2005,  1,  1, 'Minesweeper', ''),
]

def WriteBadPage(error_message):
  print 'Content-Type: text/plain'
  print ''
  print '404 Error.  That is not a valid URL.  Message: '
  print error_message

class ServerUrls:
  def __init__(self):
    host = os.environ.get('SERVER_NAME')
    port = os.environ.get('SERVER_PORT')
    if (host == 'weihwa-puzzles.appspot.com'):
      self.server_url = 'http://weihwa-puzzles.appspot.com/'
      self.escaped_server_url = 'http%3A//weihwa-puzzles.appspot.com/'
      self.igoogle = 'http://fusion.google.com/'
      self.gmodules = 'http://gmodules.com/'
    else:
      self.server_url = 'http://enigma.sfo.corp.google.com:8080/'
      self.escaped_server_url = 'http%3A//enigma.sfo.corp.google.com%3A8080/'
      self.igoogle = 'http://ig.corp.google.com/'
      self.gmodules = 'http://igmodules.corp/'

class MainPage(webapp.RequestHandler):
  def get(self):
    template_values = {
        'puzzle_gadgets': puzzle_gadgets,
        'server_urls': ServerUrls(),
      }
    path = os.path.join(os.path.dirname(__file__), 'mainpage.html')
    self.response.out.write(template.render(path, template_values))

class GadgetPage(webapp.RequestHandler):
  def get(self):
    my_pg = "unknown"
    for pg in puzzle_gadgets:
      if (pg.date.strftime("%Y%m%d") + "-" + pg.short_name == self.request.get('g')):
         my_pg = pg
      if (pg.short_name == self.request.get('g')):
         my_pg = pg
    if (my_pg == "unknown"):
      WriteBadPage('cannot find the gadget with name ' + self.request.get('g'))
      return
    template_values = {
        'gadget': my_pg,
        'gadget_name': self.request.get('g'),
        'server_urls': ServerUrls(),
      }
    if (self.request.get('g') == '20080523-diagonalsudoku'):
      path = os.path.join(os.path.dirname(__file__), 'diagonalsudoku.html')
    else:
      path = os.path.join(os.path.dirname(__file__), 'gadgetpage.html')
    self.response.out.write(template.render(path, template_values))

class GadgetXML(webapp.RequestHandler):
  def get(self, filename):
    template_values = {
        'server_urls': ServerUrls(),
        'random_new_user_id': self.RandomUserId(),
        'random_username': self.RandomUserName(),
      }
    try:
      path = os.path.join(os.path.dirname(__file__), 'staticgadgets/' + filename)
      self.response.headers['Content-Type'] = 'text/xml'
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      WriteBadPage('cannot find the xml with name ' + filename)
  def RandomUserId(self):
    # This is a temporary placeholder until we can get real OpenSocial stuff
    # 15 random alphabetic characters should handle about 40 billion users
    result = ''
    for x in range(15):
      result += random.choice(list(string.uppercase))
    return result
  def RandomUserName(self):
    # This is a temporary placeholder until we can get real OpenSocial stuff
    return (random.choice(('Jordan', 'Alex', 'Jamie', 'Chris', 'Pat', 'Elliot', 'Willie', 'Val', 
       'Tracy', 'Stacy', 'Skye', 'Robin', 'Nicky', 'Morgan', 'Madison', 'Leslie', 'Jackie',
       'Glenn', 'Dana', 'Dale', 'Daryl', 'Drew', 'Charlie', 'Corey', 'Bryce', 'Blair'))
       + random.choice(list(string.uppercase))
       + random.choice(list(string.digits))
       + random.choice(list(string.digits))
    )

class GadgetHTML(webapp.RequestHandler):
  def get(self, filename):
    template_values = {
        'server_urls': ServerUrls(),
      }
    try:
      path = os.path.join(os.path.dirname(__file__), 'staticgadgets/' + filename)
      self.response.headers['Content-Type'] = 'text/html'
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      WriteBadPage('cannot find the html with name ' + filename)

class CurrentGadgetXML(GadgetXML):
  def get(self):
    return GadgetXML.get(self, '20080523-diagonalsudoku.xml')

class TestXML(webapp.RequestHandler):
  def get(self):
    host = os.environ.get('HTTP_HOST')
    name = os.environ.get('SERVER_NAME')
    port = os.environ.get('SERVER_PORT')
    template_values = {
        'host': host,
        'name': name,
        'port': port,
      }
    try:
      path = os.path.join(os.path.dirname(__file__), 'staticgadgets/test.xml')
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      WriteBadPage('cannot find the xml with name ' + filename)

##########################################################
# db stuff

class Message(db.Model):
  content = db.StringProperty()

class MessageWriter(webapp.RequestHandler):
  def get(self):
    message = Message()
    message.content = self.request.get('message')
    message.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("Stored %s" % self.request.get('message'))

class MessageReader(webapp.RequestHandler):
  def get(self):
    query = Message.all()
    self.response.headers['Content-Type'] = 'text/plain'
    for result in query:
      self.response.out.write("%s\n" % result.content)

def GetLastMessages(num):
  query = Message.all()
  result = [''] * num;
  pos = 0;
  for message in query:
    result[pos] = message.content
    pos = (pos+1) % num;
  return result[pos:] + result[0:pos]

class MessageReaderLast(webapp.RequestHandler):
  def get(self):
    messages = GetLastMessages(int(self.request.get('count')))
    self.response.headers['Content-Type'] = 'text/plain'
    for s in messages:
      self.response.out.write("%s\n" % s)

##########################################################

class User(db.Model):
  name = db.StringProperty()

class NameWriter(webapp.RequestHandler):
  def get(self):
    user = User.get_by_key_name(self.request.get('id'))
    if user == None:
      user = User(key_name=self.request.get('id'))
    user.name = self.request.get('name')
    user.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("Stored %s with id %s" % (user.name, user.key().name()))

class NameReader(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/plain'
    user = User.get_by_key_name(self.request.get('id'))
    if user != None:
      self.response.out.write(user.name)
    else:
      # Failed!  But we don't have error handling
      1

##########################################################

def main():
  application = webapp.WSGIApplication([('/', MainPage),
                                        ('/current.xml', CurrentGadgetXML),
                                        ('/gadgets/test.xml', TestXML),
                                        ('/gadgets/(.*\.xml)', GadgetXML),
                                        ('/gadgets/(.*\.html)', GadgetHTML),
                                        ('/datastore/message-write', MessageWriter),
                                        ('/datastore/message-all', MessageReader),
                                        ('/datastore/message-last', MessageReaderLast),
                                        ('/datastore/writename', NameWriter),
                                        ('/datastore/getname', NameReader),
                                        ('/gadgetpage', GadgetPage),
                                        ('/.*', MainPage),
                                       ],
                                       debug=True)
  wsgiref.handlers.CGIHandler().run(application)

if __name__ == "__main__":
  main()

