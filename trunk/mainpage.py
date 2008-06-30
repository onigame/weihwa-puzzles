import wsgiref.handlers
import os
import datetime
import string
import random
import logger
import urllib
import re

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from datetime import date
from datetime import datetime
from django.template import TemplateDoesNotExist

def hexlify(b):
  return "%02x"*len(b) % tuple(map(ord, b))
random.seed(long(hexlify(os.urandom(100)), 16))

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
        'random_new_user_id': self.RandomUserId(),
        'random_username': self.RandomUserName(),
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

class StaticJavascript(webapp.RequestHandler):
  def get(self, filename):
    self.response.headers['Content-Type'] = 'text/javascript'
    try:
      path = os.path.join(os.path.dirname(__file__), 'staticjs/' + filename)
      self.response.out.write(open(path, 'r').read())
    except IOError:
      WriteBadPage('cannot find the js with name ' + filename)

sudokuTemplateData = {
        'server_urls': ServerUrls(),
        'num_puzzles': 23,
        'puzzle_content': "\
'7xx4x8xxxxxx1xx4xxxx1x5xxxxx57xxxx2x2xxxxxxx9x4xxxx16xxxxx8x3xxxx2xx1xxxxxx6x9xx2',\
'x3xxxx6xxxx6xxxx52xx8x2xx41xxx4xxx1xx572x349xx6xxx7xxx58xx7x9xx64xxxx2xxxx3xxxx8x',\
'84xxx5x73xxxxx3xxxx93xxxx1xx6xx9xxx1x8xx5xx6x1xxx4xx8xx2xxxx43xxxx1xxxxx93x5xxx26',\
'xxxx52xxxxx5xxxxxx2xx4xxxx8x8x2xxx7xxx9xxx3xxx1xxx5x4x6xxxx8xx3xxxxxx5xxxxx67xxxx',\
'xx1xxxxxxx4x2x3xxxxxx97xxxx1xxxxxxxx398xxx547xxxxxxxx2xxxx28xxxxxx4x6x3xxxxxxx9xx',\
'xxx2xx4x662xxxxxxxxxx1xxxx87xxxxxxxxxx45x37xxxxxxxxxx21xxxx9xxxxxxxxxx599x8xx2xxx',\
'x8xx1xx42x2xxxxxxxxxx7xxxxxx1x6xxxxxx6xxxxx5xxxxxx5x7xxxxxx9xxxxxxxxxx1x39xx2xx6x',\
'8xxxx61x5xxx7xxxx9x3xxx978x7xxxx1xxxxxx4x8xxxxxx3xxxx1x645xxx2x5xxxx2xxx2x38xxxx7',\
'xx49xx7xxxxx82xxxxxx9xxxxx53xxxxx5xxx8xx4xx6xxx1xxxxx45xxxxx6xxxxxx97xxxxx8xx62xx',\
'x793xxxxx6xxxxxxxxx5xxxx4xx8475xx9xxx26xxx58xxx1xx9247xx8xxxx5xxxxxxxxx2xxxxx731x',\
'x3xxxxxx1x5xx2xx431xxx49xxxxxx4x6x2xxxx2x1xxxx7x8x3xxxxxx98xxx589xx3xx6x3xxxxxx9x',\
'xxx2xxx5xxxxx5xx39xxxxxx6x8xx54xxx817x6xxx5x291xxx73xx6x2xxxxxx58xx3xxxxx9xxx6xxx',\
'xxxxx76xxx5xxx3x48xxx8x4xxxxxxxx2x1x7xxxxxxx5x1x3xxxxxxxx2x6xxx97x1xxx3xxx49xxxxx',\
'xxx564xxx9xxxx725xxxxxxxxxxxx83xx57x3xx6x5xx9x19xx26xxxxxxxxxxxx859xxxx6xxx176xxx',\
'x2xx63xxx8x7xxx9xxx319xxx4xxxxxxxx3xxxxxxxxxxx6xxxxxxxx7xxx469xxx9xxx5x1xxx79xx8x',\
'xxxxx8x1x85xx4x3xxx3xxxx4582xx36xxxxxxxxxxxxxxxxx74xx5412xxxx3xxx6x9xx21x9x6xxxxx',\
'xxxx13x8xxx78x5xxxxxx69xxxxx1x78xxxx7xx9x2xx6xxxx34x5xxxxx68xxxxxx5x92xxx4x27xxxx',\
'xxxxx9xxxxxx1xxxxxxx14xx8x3x63x2x7x8xxxxxxxxx7x8x6x95x6x5xx32xxxxxxx7xxxxxx8xxxxx',\
'xx1xx9xx2xxxxx6xxxxxxxxxx46x9xx4xxx76x4xxx8x32xxx5xx6x82xxxxxxxxxx7xxxxx4xx2xx1xx',\
'xxxxxxxx3xxxx75xxxxx38xxx9x6x1x47xxx2x4xxx7x1xxx68x5x4x6xxx29xxxxx43xxxx4xxxxxxxx',\
'xx3xxx54x987xxxxx2xxxx32x9xx9x7xxxxx5xxxxxxx6xxxxx1x8xx3x92xxxx1xxxxx954x49xxx8xx',\
'xxxx12xxx5xxxxx9xxxxxx5xxx84x3xxx7xxxxxxxxxxxxx6xxx3x28xxx6xxxxxx9xxxxx1xxx94xxxx',\
'xxx1x97xxxxxxxx8xxxx54xxx9xxxxxx8x72xxxxxxxxx76x9xxxxxx3xxx24xxxx4xxxxxxxx95x1xxx',\
'xx64xxxxxxxxx9xxxxxxxxx7xxx87x5xx4xx2xxxxxxx3xx4xx3x67xxx3xxxxxxxxx6xxxxxxxxx12xx',\
'xxxxxx31xxxxxx27x6xxx74x5xx3x8xx6xx5xxxxxxxxx7xx3xx8x9xx1x79xxx6x28xxxxxx43xxxxxx',\
'x6xxx49x3x7xx2xxxxx4x6xxxx76xxxxx87xxxxxxxxxxx28xxxxx14xxxx9x1xxxxx7xx4x5x93xxx8x',\
'xx7xx3xxx3xx8xxxxxxx4x5xxx8xxxxx5x62x5x4x8x1x93x2xxxxx5xxx2x8xxxxxxx9xx3xxx7xx4xx',\
'x9xxx2xx3xx6x5xx2x5xx9xxxx6x8xxxxx91xx4xxx8xx25xxxxx4x1xxxx4xx9x7xx1x3xx8xx6xxx5x',\
'xxx35xxxxxxxxx8xx5x9xx728x3xxx5xxx2xx5x7x4x1xx4xxx6xxx1x523xx9x9xx8xxxxxxxxx19xxx',\
'x37xxxxxx6xxx8xx7x2x84xxxxxxxx9x1xx71xx8x7xx37xx5x2xxxxxxxx37x8x4xx1xxx5xxxxxx96x',\
'xxxxxxxxxx6xx58xxx7xxxxxxxxx43xxxxx5621xxx7898xxxxx32xxxxxxxxx6xxx32xx5xxxxxxxxxx',\
'x1xxxxxxxxxxxxxx4x8xx49x7xxxxx9xx5xxx4xxxxx7xxx5xx3xxxxx3x51xx2x8xxxxxxxxxxxxxx6x',\
'5xxxx7x8xxxxxx165xx768xxx2x7xxxx2xx6x6xxxxx4x3xx6xxxx2x3xxx819xx421xxxxxx8x4xxxx3',\
'xxxx3x6xxx5xxx79x2xxxxx1x731xxxx24xxxxxx6xxxxxx69xxxx821x8xxxxx4x87xxx9xxx9x2xxxx',\
'xx843xxxxx4xx5xxxxxxx9xxxxx1xxxx57xxxxx8x7xxxxx46xxxx3xxxxx3xxxxxxx6xx5xxxxx982xx',\
'xx6xxxxx77xx2xxxxxxx13xxx4x6x8xxxx3xxx2xxx1xxx4xxxx7x6x5xxx68xxxxxxx7xx38xxxxx2xx',\
'17xxx49xxxx8xx6x1x3xx1xxxxxxxxxxx3xxx35xxx74xxx4xxxxxxxxxxx2xx8x8x4xx1xxxx97xxx34',\
'x9xx8253xxxxx46xxxxxxxxx6xxxxxx6xxx12x3xxx4x51xxx5xxxxxx7xxxxxxxxx63xxxxx3981xx7x',\
'x42x1x9x76xxxxxxxxxx16xxxxx5xxx2xxxxxx6xxx5xxxxxx3xxx2xxxxx17xxxxxxxxxx39x7x5x14x',\
'xxxxxxxx2xx97xxxxxx7x6xxxxx683xxx25xxxxxxxxxxx47xxx863xxxxx3x2xxxxxx65xx1xxxxxxxx',\
'xxxxx5x7x89xx7x1x64xxxxxxxxx23x9xxx1xxxxxxxxx1xxx3x28xxxxxxxxx36x8x5xx42x5x3xxxxx',\
'xx1x5x7xxxx5x3xxxx9xxxxxx5x5xxxx8x96x46xxx82x82x1xxxx5x1xxxxxx9xxxx2x6xxxx3x6x2xx',\
'3xx6x1xx5xxxx8xxxxxxxxxxxx1xx28x3xx91xxxxxxx39xx7x64xx8xxxxxxxxxxxx7xxxx6xx5x9xx2',\
'x8xx2xxxx1x36xxxxx7x5x89xxxx68x1x4xxxxxxxxxxxxx7x9x35xxxx74x9x8xxxxx57x2xxxx6xx4x',\
'xxxxxxxxxx2xxx35xxx8x7xx9x1xxxx3x1x474xxxxx656x5x4xxxx2x4xx9x5xxx96xxx3xxxxxxxxxx',\
'6xxx417x8x2xxxx4xxx8xx2xx9xxxxxxxxxxxx5xxx9xxxxxxxxxxxx4xx5xx6xxx2xxxx3x9x736xxx1',\
'x7x9x8xxxx4xxxx6xxxxxxxxxx8xxxxxx2xx16xxxxx57xx7xxxxxx3xxxxxxxxxx2xxxx3xxxx5x7x1x',\
'xxxx34152xx518xxxxxxxxxxxxx68xxxxx7xx548x932xx1xxxxx89xxxxxxxxxxxxx438xx53269xxxx',\
'3x2xxx7x47xxx1xx9xx1xxxxx6x571xxxxxxxxxxxxxxxxxxxxx937x3xxxxx2xx5xx2xxx11x6xxx4x9',\
'x4xxxxxxxxx2xx68xx3xx7x8xxx4xxx2xxxx56xxxxx42xxxx6xxx9xxx2x9xx6xx96xx1xxxxxxxxx3x'\
" }

class GadgetXML(webapp.RequestHandler):
  def get(self, filename):
    if filename == '20080523-diagonalsudoku.xml':
      template_values = sudokuTemplateData
    else:
      template_values = {
          'server_urls': ServerUrls(),
        }
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

class StaticGadgetXML(webapp.RequestHandler):
  def get(self, filename):
    self.response.headers['Content-Type'] = 'text/xml'
    path = os.path.join(os.path.dirname(__file__), 'staticgadgets/' + filename)
    try:
      self.response.out.write(open(path, 'r').read())
    except IOError:
      WriteBadPage('cannot find the xml with name ' + filename)

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

class User(db.Model):
  name = db.StringProperty()
  modified = db.DateTimeProperty()

class NameWriter(webapp.RequestHandler):
  def get(self):
    user = User.get_by_key_name(self.request.get('id'))
    oldname = ''
    if user == None:
      user = User(key_name=self.request.get('id'))
    else:
      oldname = user.name;
    user.name = self.request.get('name')
    user.modified = datetime.now();
    user.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("Stored %s with id %s" % (user.name, user.key().name()))
    if oldname == '':
      logger.LogOneEntry("Server: User %s acquired name %s" % (user.key().name(), user.name))
    else:
      logger.LogOneEntry("Server: User %s changed name from %s to %s" % (user.key().name(), oldname, user.name))

class NameReader(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/plain'
    given_id = self.request.get('id')
    if given_id == '':
      self.response.out.write('UNKNOWN')
      logger.LogOneEntry("Server: Empty User requested Name")
    else:
      user = User.get_by_key_name(given_id)
      if user != None:
        self.response.out.write(user.name)
        logger.LogOneEntry("Server: User %s asked for name %s" % (user.key().name(), user.name))
      else:
        # Failed!  But we don't have error handling
        logger.LogOneEntry("Server: User %s asked for name; user unknown" % (self.request.get('id')))

class UserPuzzleData(db.Model):
  data = db.TextProperty()    # usually JSON
  modified = db.DateTimeProperty()

class PuzzleDataWriter(webapp.RequestHandler):
  def get(self):
    if (self.request.get('key') == ''):
      combined_key = self.request.get('id')
    else:
      combined_key = self.request.get('id') + '$$' + self.request.get('key')
    userpuzzledata = UserPuzzleData.get_by_key_name(combined_key)
    olddata = ''
    if userpuzzledata == None:
      userpuzzledata = UserPuzzleData(key_name=combined_key)
    else:
      olddata = userpuzzledata.data;
    userpuzzledata.data = self.request.get('data')
    userpuzzledata.modified = datetime.now();
    userpuzzledata.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("Stored %s with id %s" % (userpuzzledata.data, userpuzzledata.key().name()))
    if olddata == '':
      logger.LogOneEntry("Server: User %s acquired data %s" % (userpuzzledata.key().name(), userpuzzledata.data))
    else:
      logger.LogOneEntry("Server: User %s changed data from %s to %s" % (userpuzzledata.key().name(), olddata, userpuzzledata.data))

class PuzzleDataReader(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/html'
    if (self.request.get('key') == ''):
      combined_key = self.request.get('id')
    else:
      combined_key = self.request.get('id') + '$$' + self.request.get('key')
    userpuzzledata = UserPuzzleData.get_by_key_name(combined_key)
    if userpuzzledata != None:
      self.response.out.write(userpuzzledata.data)
      logger.LogOneEntry("Server: User %s asked for data %s" % (userpuzzledata.key().name(), userpuzzledata.data))
    else:
      # Failed!  But we don't have error handling
      logger.LogOneEntry("Server: User %s asked for data; userpuzzledata unknown" % (self.request.get('id')))

##########################################################

class PuzzleLoginPage(webapp.RequestHandler):
  def get(self):
    url = urllib.unquote(self.request.get('url'))      # url to redirect to
    user = users.get_current_user()

    if user and re.search(r'\?', url):
      self.redirect(url + '&whpemail=' + urllib.quote(user.email()) + '&whpnick=' + urllib.quote(user.nickname()))
    elif user and url:
      self.redirect(url)
    elif user:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write('Hello, ' + user.nickname() + "\n")
      self.response.out.write('So you logged in.  Whaddaya want, a medal?')
    else:
      self.redirect(users.create_login_url("foo"))
#      self.redirect(users.create_login_url(self.request.uri))

class PuzzleLogoutPage(webapp.RequestHandler):
  def get(self):
    self.redirect(users.create_logout_url("/"))
    
##########################################################

def real_main():
  application = webapp.WSGIApplication([('/', MainPage),
                                        ('/current.xml', CurrentGadgetXML),
                                        ('/gadgets/test.xml', TestXML),
                                        ('/gadgets/test2.xml', Test2XML),
                                        ('/js/(.*\.js)', Javascript),
                                        ('/staticjs/(.*\.js)', StaticJavascript),
                                        ('/gadgets/(.*\.xml)', GadgetXML),
                                        ('/staticgadgets/(.*\.xml)', StaticGadgetXML),
                                        ('/gadgets/(.*\.html)', GadgetHTML),
                                        ('/datastore/message-write', logger.LogWriter),
                                        ('/datastore/message-all', logger.LogReader),
                                        ('/datastore/message-last', logger.LogReaderLast),
                                        ('/datastore/writename', NameWriter),
                                        ('/datastore/getname', NameReader),
                                        ('/datastore/writepuzzledata', PuzzleDataWriter),
                                        ('/datastore/getpuzzledata', PuzzleDataReader),
                                        ('/puzzlelogin', PuzzleLoginPage),
                                        ('/puzzlelogout', PuzzleLogoutPage),
                                        ('/gadgetpage', GadgetPage),
                                        ('/.*', MainPage),
                                       ],
                                       debug=True)
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

