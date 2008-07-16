import wsgiref.handlers
import os
import datetime
import string
import logging
import logger
import urllib
import re
import random
import puzzles

from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from datetime import date
from datetime import datetime
from django.template import TemplateDoesNotExist

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
  PuzzleGadget(2006, 10,  4, 'Mister Mind', ''),
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
  print '(Yes, I know this isn\'t a real 404.)'

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

class Javascript(webapp.RequestHandler):
  def get(self, filename):
    template_values = {
        'server_urls': ServerUrls(),
        'random_new_user_id': puzzles.RandomUnusedUserId(),
        'random_username': "SomeDude",
      }
    self.response.headers['Content-Type'] = 'text/javascript'
    try:
      path = os.path.join(os.path.dirname(__file__), 'js/' + filename)
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      path = os.path.join(os.path.dirname(__file__), 'staticjs/' + filename)
      try:
        self.response.out.write(open(path, 'r').read())
      except IOError:
        WriteBadPage('cannot find the js with name ' + filename)

class GadgetXML(webapp.RequestHandler):
  def get(self, filename):
    template_values = {};
    if filename == '20080523-diagonalsudoku.xml':
      template_values = puzzles.diagonalsudokuTemplateData
    template_values['server_urls'] = ServerUrls()
    self.response.headers['Content-Type'] = 'text/xml'
    path = os.path.join(os.path.dirname(__file__), 'gadgets/' + filename)
    try:
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      path = os.path.join(os.path.dirname(__file__), 'staticgadgets/' + filename)
      try:
        self.response.out.write(open(path, 'r').read())
      except IOError:
        WriteBadPage('cannot find the xml with name ' + filename)

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

class Test2XML(webapp.RequestHandler):
  def get(self):
    host = os.environ.get('HTTP_HOST')
    name = os.environ.get('SERVER_NAME')
    port = os.environ.get('SERVER_PORT')
    template_values = {
        'host': host,
        'server_urls': ServerUrls(),
        'name': name,
        'port': port,
      }
    try:
      path = os.path.join(os.path.dirname(__file__), 'staticgadgets/test2.xml')
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      WriteBadPage('cannot find the xml with name ' + filename)

##########################################################

class WhoAmIPage(webapp.RequestHandler):
  def get(self):
    user = users.get_current_user()
    self.response.headers['Content-Type'] = 'text/plain'
    if user:
      self.response.out.write('You are ' + user.email())
    else:
      self.response.out.write('You are not logged in.')

class PuzzleLoginPage(webapp.RequestHandler):
  def get(self):
    return self.post()
  def post(self):
    url = self.request.get('url')         # url to redirect to
    explain = self.request.get('explain') # show a explanatory screen to the user
    key = self.request.get('key')         # key for the memcache
    arg = self.request.arguments()
    user = users.get_current_user()

    if key and not url:
      url = memcache.get(key)

    if user and url:
      dest = (url + (re.search(r'\?', url) and '&' or '?') +
                    'whpemail=' + urllib.quote(user.email()) +
                    '&whpnick=' + urllib.quote(user.nickname()))
      logging.debug('login: url is %s and dest is %s and user is %s' % (url, dest, user.nickname()))
      self.redirect(dest)
    elif user:
      logging.debug('login: no url, user is %s' % user.nickname())
      self.response.headers['Content-Type'] = 'text/html'
      self.response.out.write('Hello, ' + user.nickname() + "\n")
      for ar in arg:
        self.response.out.write('<br>' + ar + "\n")
      self.response.out.write('<br>You have already logged in!')
      self.response.out.write('<br><a href="logout">logout</a>');
    elif url and not explain:
      memcache_key = "MEM_";
      for x in range(10):
        memcache_key += random.choice(list(string.uppercase))
      memcache.set(memcache_key, url, 60*60)  # key expires in one hour
      dest = (users.create_login_url("/puzzlelogin?key=" + memcache_key))
      logging.debug('login: no user, url is %s and memcache key is %s \n' % (url, memcache_key))
      self.redirect(dest)
    elif url and explain:
      self.response.headers['Content-Type'] = 'text/html'
      self.response.out.write("""
Hi.  If you're seeing this, it means that Wei-Hwa has implemented user logins on App
Engine (but hasn't implemented automatic login) and you're not logged in.
Please <a href="/puzzlelogin?url=%s">click here</a> to start the login process.
""" % url)
    else:
      logging.debug('login: no user, no url')
      self.redirect(users.create_login_url("/confirm-login.html"))

class ConfirmLoginHTML(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/html'
    self.response.out.write('Thanks for logging in, %s.  Please refresh the page to play your puzzles.' % users.get_current_user().nickname() )

class LoginTestPage(webapp.RequestHandler):
  def post(self, text):
    dest = self.request.get("dest")
    logging.debug('logintest: no user, dest is %s \n' %  dest)
    self.redirect(dest)

class PuzzleLogoutPage(webapp.RequestHandler):
  def get(self):
    return self.post()
  def post(self):
    url = urllib.unquote(self.request.get('url'))      # url to redirect to
    if url: 
      self.redirect(users.create_logout_url(url))
    else:
      self.redirect(users.create_logout_url("puzzleloggedout"))    # should be a "confirm logout" page

class PuzzleLoggedoutPage(webapp.RequestHandler):
  def get(self):
    return self.post()
  def post(self):
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write('You have logged out of Wei-Hwa\'s puzzles.')
     
    
##########################################################

def real_main():
  url_mappings = [('/', MainPage),
                  ('/confirm-login.html', ConfirmLoginHTML),
                  ('/current.xml', CurrentGadgetXML),
                  ('/js/(.*\.js)', Javascript),
                  ('/gadgets/(.*\.xml)', GadgetXML),

                  ('/datastore/message-write', logger.LogWriter),
                  ('/datastore/message-all', logger.LogReader),
                  ('/datastore/message-last', logger.LogReaderLast),
                  ('/datastore/message-first', logger.LogReaderFirst),
                  ('/datastore/message-delete-first', logger.LogDeleterFirst),

                  ('/datastore/request_whp_id', puzzles.UIDGet),
                  ('/datastore/register_whp_id', puzzles.UIDPut),
                  ('/datastore/get_name', puzzles.NameGet),
                  ('/datastore/put_name', puzzles.NamePut),

                  ('/datastore/writepuzzledata', puzzles.PuzzleDataWriter),
                  ('/datastore/getpuzzledata', puzzles.PuzzleDataReader),
                  ('/datastore/rps', puzzles.ReportPuzzleSolved),

                  ('/whoami', WhoAmIPage),
                  ('/puzzlelogin', PuzzleLoginPage),
                  ('/puzzlelogout', PuzzleLogoutPage),
                  ('/puzzleloggedout', PuzzleLoggedoutPage),
                  ('/gadgetpage', GadgetPage),

                  ('/diagonalsudoku/(.*\.html)', puzzles.DiagonalSudokuSubPage),
                  ('/logintest(.*)', LoginTestPage)]

  url_mappings.extend(puzzles.UrlMappings())
  url_mappings.append(('/.*', MainPage))
  application = webapp.WSGIApplication(url_mappings, debug=True)
  wsgiref.handlers.CGIHandler().run(application)

def profile_main():
  # This is the main function for profiling 
  # We've renamed our original main() above to real_main()
  import cProfile, pstats, StringIO
  prof = cProfile.Profile()
  prof = prof.runctx("real_main()", globals(), locals())
  print "/* <!--"
  stats = pstats.Stats(prof)
  stats.sort_stats("time")  # Or cumulative
  stats.print_stats(800)  # 80 = how many to print
  # The rest is optional.
  # stats.print_callees()
  # stats.print_callers()
  print " --> */"

main = real_main;

if __name__ == "__main__":
  main()
