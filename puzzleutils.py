import os
import re
import logger
import logging
import string
import random

from datetime import datetime
from datetime import timedelta
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from django.template import TemplateDoesNotExist


##########################################################

def hexlify(b):
  return "%02x"*len(b) % tuple(map(ord, b))

random.seed(long(hexlify(os.urandom(100)), 16))

##########################################################

# Google User: reverse mapping.
class GoogleUser(db.Model):
  whp_uid = db.StringProperty()
  modified = db.DateTimeProperty(auto_now=True)

class User(db.Model):
  name = db.StringProperty()
  google_id = db.StringProperty()
  modified = db.DateTimeProperty(auto_now=True)

def RandomUserName():
  # This is a temporary placeholder until we can get real OpenSocial stuff
  return (random.choice(('Jordan', 'Alex', 'Jamie', 'Chris', 'Pat', 'Elliot', 'Willie', 'Val', 
     'Tracy', 'Stacy', 'Skye', 'Robin', 'Nicky', 'Morgan', 'Madison', 'Leslie', 'Jackie',
     'Glenn', 'Dana', 'Dale', 'Daryl', 'Drew', 'Charlie', 'Corey', 'Bryce', 'Blair'))
     + random.choice(list(string.uppercase))
     + random.choice(list(string.digits))
     + random.choice(list(string.digits))
  )

def RandomUnusedUserId():
  u = 1
  while u:
    result = RandomUserId()
    u = User.get_by_key_name(result)
  return result

def RandomUserId():
  # 15 random alphabetic characters should handle about 40 billion users
  result = ''
  for x in range(15):
    result += random.choice(list(string.uppercase))
  return result

def CreateUser(google_id, proposed_id):
  gu = GoogleUser.get_or_insert(google_id)
  if gu.whp_uid != proposed_id:
    gu.whp_uid = proposed_id
    gu.put()

  u = User.get_or_insert(gu.whp_uid)
  if u.google_id != google_id:
    u.google_id = google_id
    if not u.name or u.name == "None":
      u.name = RandomUserName()
    u.put()
  
  return u

def GetOrCreateUser(google_id):
  gu = GoogleUser.get_or_insert(google_id)
  if not gu.whp_uid:
    gu.whp_uid = RandomUnusedUserId()
    gu.put()

  u = User.get_or_insert(gu.whp_uid)
  if u.google_id != google_id:
    u.google_id = google_id
    if not u.name or u.name == "None":
      u.name = RandomUserName()
    u.put()

  return u

def GetUser(gu):  # takes GoogleUser as input
  u = User.get_or_insert(gu.whp_uid)
  if u.google_id != gu.whp_uid:
    u.google_id = gu.whp_uid
    if not u.name or u.name == "None":
      u.name = RandomUserName()
    u.put()
  return u

class UIDGet(webapp.RequestHandler):
  def post(self):
    return self.get()
  def get(self):
    gid = self.request.get('gid')
    if not gid:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write('NOT_LOGGED_IN')
      return
    gu = GoogleUser.get_by_key_name(gid)
    if not gu:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write('NOT_LOGGED_IN')
      return

    u = GetUser(gu)
    
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write(u.key().name())

class UIDPut(webapp.RequestHandler):
  def post(self):
    return self.get()
  def get(self):
    gid = self.request.get('gid')
    if not gid:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write('NOT_LOGGED_IN')
      return
    # unfortunately we have no way of checking whether the given gid is valid.

    id = self.request.get('id')
    if not id:
      id = RandomUnusedUserId()

    u = CreateUser(gid, id)

    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write(id)

class NameGet(webapp.RequestHandler):
  def post(self):
    return self.get()
  def get(self):
    gid = self.request.get('gid')

    if not gid:
      id = self.request.get('id')
      if not id:
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write("SomeDude")     # Change to NOT_LOGGED_IN when opensocial works
        return;

      u = User.get_by_key_name(self.request.get('id'))
    else:
      gu = GoogleUser.get_by_key_name(gid)
      if not gu:
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write('NOT_LOGGED_IN')
        return
      u = GetUser(gu)

    if not u:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("NoNameGuy")
      return;

    if not u.name:
      u.name = re.match("([A-Za-z0-9_])+", guser.nickname()).group(1)
      if not u.name:
        u.name = "someDude"
      u.put()

    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write(u.name)

class NamePut(webapp.RequestHandler):
  def post(self):
    return self.get()
  def get(self):
    gid = self.request.get('gid')
    if not gid:
      id = self.request.get('id')
      if not id:
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write("SomeDude")     # Change to NOT_LOGGED_IN when opensocial works
        return;
      u = User.get_by_key_name(self.request.get('id'))
    else:
      gu = GoogleUser.get_by_key_name(gid)
      if not gu:
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write('NOT_LOGGED_IN')
        return
      u = GetUser(gu)

    u.name = self.request.get('name')
    u.put()

    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write(u.name)


##########################################################

class UserPuzzleData(db.Model):
  data = db.TextProperty()    # usually JSON
  modified = db.DateTimeProperty(auto_now=True)

class PuzzleDataWriter(webapp.RequestHandler):
  def get(self):
    whp_uid = self.request.get('id')
    combined_key = whp_uid
    if (self.request.get('key') != ''):
      combined_key += '$$' + self.request.get('key')
    userpuzzledata = UserPuzzleData.get_by_key_name(combined_key)
    olddata = ''
    if userpuzzledata == None:
      userpuzzledata = UserPuzzleData(key_name=combined_key)
    else:
      olddata = userpuzzledata.data;
    userpuzzledata.data = self.request.get('data')
    userpuzzledata.put()
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.out.write("Stored %s with id %s" % (userpuzzledata.data, userpuzzledata.key().name()))

class PuzzleDataReader(webapp.RequestHandler):
  def get(self):
    whp_uid = self.request.get('id')
    self.response.headers['Content-Type'] = 'text/html'
    combined_key = whp_uid
    if (self.request.get('key') != ''):
      combined_key += '$$' + self.request.get('key')
    userpuzzledata = UserPuzzleData.get_by_key_name(combined_key)
    if userpuzzledata != None:
      self.response.out.write(userpuzzledata.data)

def GetLastData(num):
  query = UserPuzzleData.all()
  query.order("-modified")
  results = query.fetch(num)
  return results

###############################

class PuzzleSolveTimes(db.Model):
  uid = db.StringProperty()
  puzzletype = db.StringProperty()
  puzzleid = db.StringProperty()
  modified_timestamp = db.DateTimeProperty()   # we don't use auto_now because we want to manage this ourselves
  solvetimes = db.ListProperty(datetime)
  last_solvetime = db.DateTimeProperty()
  best_solvetime = db.DateTimeProperty()

class UserPuzzleRecord(db.Model):
  uid = db.StringProperty()
  puzzletype = db.StringProperty()
  modified_timestamp = db.DateTimeProperty()  # we don't use auto_now because we want to manage this ourselves
  num_puzzles_solved = db.IntegerProperty()
  which_puzzles_solved = db.ListProperty(int)   # 0 = not solved, 1 = solved (future values might be added)
  when_puzzles_first_solvetime = db.ListProperty(datetime)
  when_puzzles_last_solvetime = db.ListProperty(datetime)
  when_puzzles_best_solvetime = db.ListProperty(datetime)
  total_first_solvetime = db.DateTimeProperty()    # really a big timedelta
  total_last_solvetime = db.DateTimeProperty()    # really a big timedelta
  total_best_solvetime = db.DateTimeProperty()    # really a big timedelta
  mean_first_solvetime = db.DateTimeProperty()     # really an average timedelta
  mean_last_solvetime = db.DateTimeProperty()     # really an average timedelta
  mean_best_solvetime = db.DateTimeProperty()     # really an average timedelta

###############################
# Conversions to/from timedelta.

def td2dt(td):
  return datetime(1970,1,1) + td;

def dt2td(dt):
  return dt - datetime(1970,1,1);

###############################

class ReportPuzzleSolved(webapp.RequestHandler):
  _PUZZLE_START_TIME = datetime(2008,07,01)   # puzzle solve time is delta from this.
  def get(self):
    puzzletype = "DS01"
    uid = self.request.get('id')
    password = self.request.get('password')
    puznum = self.request.get('puznum')
    curtime = datetime.now()
    solvetime = curtime - self._PUZZLE_START_TIME
    if uid == '' or password == '' or puznum == '':
      logger.LogOneEntry("Server: cheating attempt? %s %s" % (curtime.isoformat(' '), self.request.url))
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("Hey!  No hacking the server!")
    else:

      ## Update the PuzzleSolveTime object.
      combined_key = uid + '$$' + puzzletype + '$$' + puznum
      pst = PuzzleSolveTimes.get_or_insert(combined_key)
      pst.uid = uid
      pst.puzzletype = puzzletype
      pst.puzzleid = puznum
      pst.modified_timestamp = curtime
      solvetime_dt = td2dt(solvetime)
      pst.solvetimes.append(solvetime_dt)
      pst.last_solvetime = solvetime_dt
      if len(pst.solvetimes) == 1:
        pst.best_solvetime = solvetime_dt
      if pst.best_solvetime > solvetime_dt:
        pst.best_solvetime = solvetime_dt

      pst.put()

      ## Update the UserPuzzleRecord object.
      combined_key = uid + '$$' + puzzletype
      pnum = int(puznum)
      upr = UserPuzzleRecord.get_or_insert(combined_key)
      upr.uid = uid
      upr.puzzletype = puzzletype
      upr.modified_timestamp = curtime
      solvetime_dt = td2dt(solvetime)
      if upr.num_puzzles_solved == None:
        upr.num_puzzles_solved = 0
        upr.total_first_solvetime = td2dt(timedelta())
        upr.total_last_solvetime = td2dt(timedelta())
        upr.total_best_solvetime = td2dt(timedelta())
      if len(upr.which_puzzles_solved) < pnum + 1 or not upr.which_puzzles_solved[pnum]:
        # newly solved
        upr.num_puzzles_solved += 1
        while (len(upr.which_puzzles_solved) < pnum + 1):
          upr.which_puzzles_solved.append(0)
          upr.when_puzzles_first_solvetime.append(td2dt(timedelta()))
          upr.when_puzzles_last_solvetime.append(td2dt(timedelta()))
          upr.when_puzzles_best_solvetime.append(td2dt(timedelta()))
        upr.which_puzzles_solved[pnum] = 1
        upr.when_puzzles_first_solvetime[pnum] = solvetime_dt
        upr.when_puzzles_last_solvetime[pnum] = solvetime_dt
        upr.when_puzzles_best_solvetime[pnum] = solvetime_dt
        upr.total_first_solvetime += solvetime
        upr.total_last_solvetime += solvetime
        upr.total_best_solvetime += solvetime
      else:
        # already solved
        upr.total_last_solvetime += solvetime - dt2td(upr.when_puzzles_last_solvetime[pnum]) 
        upr.when_puzzles_last_solvetime[pnum] = solvetime_dt
        if (dt2td(upr.when_puzzles_best_solvetime[pnum]) > solvetime):
          upr.total_best_solvetime += solvetime - dt2td(upr.when_puzzles_best_solvetime[pnum])
          upr.when_puzzles_best_solvetime[pnum] = solvetime_dt

      upr.mean_first_solvetime = td2dt(dt2td(upr.total_first_solvetime) // upr.num_puzzles_solved)
      upr.mean_last_solvetime = td2dt(dt2td(upr.total_last_solvetime) // upr.num_puzzles_solved)
      upr.mean_best_solvetime = td2dt(dt2td(upr.total_best_solvetime) // upr.num_puzzles_solved)

      upr.put()

      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write("%d\n" % upr.num_puzzles_solved)
      self.response.out.write("%s\n" % solvetime)
      self.response.out.write("%s\n" % (dt2td(upr.total_last_solvetime) // upr.num_puzzles_solved))
      self.response.out.write("%s\n" % upr.mean_last_solvetime)
      self.response.out.write("Thank you.")

###############################

def OrdinalFormat(number):
  if number % 100 == 11:
    return "%dth" % number
  if number % 100 == 12:
    return "%dth" % number
  if number % 100 == 13:
    return "%dth" % number
  if number % 10 == 1:
    return "%dst" % number
  if number % 10 == 2:
    return "%dnd" % number
  if number % 10 == 3:
    return "%drd" % number
  return "%dth" % number

def GetLastSolves(count):
  query = PuzzleSolveTimes.all()
  query.order("-modified_timestamp")
  results = query.fetch(count)
  for item in results:
    (item.uid, item.puzzletype, item.puznum) = item.key().name().split('$$')  
    user = User.get_by_key_name(item.uid)
    if user:
      item.nickname = User.get_by_key_name(item.uid).name
    else:
      item.nickname = '[unknown user]'
    if len(item.solvetimes) > 1 :
      item.extra_message = "(for the %s time)" % OrdinalFormat(len(item.solvetimes))
  return results

def GetByNumPuzzlesSolved(count):
  query = UserPuzzleRecord.all()
  query.order("-num_puzzles_solved")
  query.order("-modified_timestamp")
  results = query.fetch(count)
  for item in results:
    (item.uid, item.puzzletype) = item.key().name().split('$$')  
    user = User.get_by_key_name(item.uid)
    if user:
      item.nickname = User.get_by_key_name(item.uid).name
    else:
      item.nickname = '[unknown user]'
  return results


##################################

class DiagonalSudokuSubPage(webapp.RequestHandler):
  def get(self, filename):
    template_values = {
        'solves' : GetLastSolves(10),
        'top100' : GetByNumPuzzlesSolved(100),
      }
    template_values.update(diagonalsudokuTemplateData)
    self.response.headers['Content-Type'] = 'text/html'
    path = os.path.join(os.path.dirname(__file__), 'diagonalsudoku/' + filename)
    try:
      self.response.out.write(template.render(path, template_values))
    except TemplateDoesNotExist:
      WriteBadPage('cannot find the file with name ' + filename)

###############################

diagonalsudokuTemplateData = {
        'num_puzzles': 30,
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


#####################################

class DuceGame(db.Model):
  # key is "game_id", which is a number
  name = db.StringProperty()                          # assigned by creator, need not be unique
  created = db.DateTimeProperty(auto_now_add=True)    # when the game was created
  creator = db.StringProperty()                       # uid of created player
  modified = db.DateTimeProperty(auto_now=True)       # when last move in the game was made
  state = db.StringProperty()                         # in case game state needs to be stored (should be a pointer of some sort?)
  completed = db.BooleanProperty(default=False)       # is the game over?
  ruleset = db.StringProperty()                       # the core rules we're playing by (just a title)
  variant = db.StringProperty()                       # what variant, if any

  def getAllSeats(self):
    result = []
    id = self.key().id()
    if not id:
      # we really should throw some sort of exception here
      return result
    seating_query = DuceSeating.all()
    seating_query.filter('game_id =', id)
    for seating in seating_query:
      result.append(seating)
    return result

  def getAllPlayers(self):
    result = []
    id = self.key().id()
    if not id:
      # we really should throw some sort of exception here
      return result
    seating_query = DuceSeating.all()
    seating_query.filter('game_id =', id)
    for seating in seating_query:
      if not seating.kibitz:
        result.append(seating)
    return result

class DucePlayer(db.Model):
  # key is uid
  public = db.BooleanProperty()      # show me on public forums
  l4g = db.BooleanProperty()         # "looking for game"

class DuceSeating(db.Model):         # a seating is a player/game relation
  game_id = db.IntegerProperty()
  nickname = db.StringProperty()     # player's nickname in the game
  uid = db.StringProperty()
  kibitz = db.BooleanProperty()      # just looking, not actually playing

#####################################
# external games

import duce_guess_my_die_roll

#####################################
# Duce API calls

def getSeatingNickname(game_id, uid):
  query = DuceSeating.all()
  query.filter('game_id =', game_id)
  query.filter('uid =', uid)
  return [seating.nickname for seating in query]
  

#####################################

def DuceUrlMappings():
  url_mappings = [('/duce(.*)', DucePage)]
  url_mappings.append(duce_guess_my_die_roll.UrlMappings())
  return ('/duce(.*)', DucePage)

class DucePage(webapp.RequestHandler):
  home_url = "/duce/index.html"
  user = None            # current user
  uid = None             # current user's uid

  def post(self, filename):
    self.get(filename)
  def get(self, filename):
    guser = users.get_current_user()
    if not guser:
      self.redirect(users.create_login_url(self.request.url))
      return
    self.user = GetOrCreateUser(guser.email())
    self.uid = self.user.key().name()

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
    seating_query = DuceSeating.all()
    seating_query.filter('uid =', self.uid)
    seatings = []

    for seating in seating_query:               # add game names to the seatings
      game = DuceGame.get_by_id(seating.game_id)
      seating.game_name = game.name
      seating.created = game.created
      seating.completed = game.completed
      seating.ruleset = game.ruleset
      seating.variant = game.variant
      seatings.append(seating)

    player = DucePlayer.get_or_insert(self.uid, 
        public=True,
        l4g=True,
      )
    player.uid = self.uid

    available_player_query = DucePlayer.all()
    available_player_query.filter('l4g =', True)
    available_players = []

    self_inside = False
    for available_player in available_player_query:
      available_player.nickname = User.get_by_key_name(available_player.key().name()).name
      available_player.uid = available_player.key().name()
      if available_player.uid == self.uid:
        self_inside = True
      available_players.append(available_player)

    if not self_inside:
      me = DucePlayer.get_by_key_name(self.uid)
      me.nickname = User.get_by_key_name(me.key().name()).name
      me.uid = self.uid
      available_players.append(me)

    if os.environ.get('SERVER_NAME') == 'weihwa-puzzles.appspot.com':
      weihwa_email = 'weihwa.feedback@gmail.com'
      server_url = 'http://weihwa-puzzles.appspot.com/duce/'
    else:
      weihwa_email = 'whuang@google.com'
      server_url = 'http://enigma.sfo.corp.google.com:8080/duce/'

    template_values = {
      'user': self.user,
      'uid': self.uid,
      'player': player,
      'available_players': available_players,
      'seatings': seatings,
      'weihwa_email': weihwa_email,
      'server_url': server_url,
    }
    path = os.path.join(os.path.dirname(__file__), 'duce/index.html')
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
    path = os.path.join(os.path.dirname(__file__), 'duce/faq.html')
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
        dp = DucePlayer.get_by_key_name(mobj.group(1))
        if not dp:
          self.response.headers['Content-Type'] = 'text/plain'
          self.response.out.write("The player with code %s does not exist!" % mobj.group(1))
          return;
        players.append(dp)
    game = DuceGame()
    game.name = "Unnamed"
    game.creator = self.request.get('creator')
    game.ruleset = self.request.get('ruleset')
    game.variant = self.request.get('variant')
    game.put()
    for p in players:
      seating = DuceSeating()
      seating.game_id = game.key().id()
      seating.uid = p.key().name()
      seating.nickname = User.get_by_key_name(seating.uid).name
      seating.kibitz = False
      seating.put()

    if game.ruleset == "GuessMyDieRoll":
      gmdr_mgr = duce_guess_my_die_roll.GMDR_Manager(game, self.uid)
      gmdr_mgr.StartGame()

    self.GoBack()

  def PlayerToggle(self):
    field = self.request.get("field")
    if field == "public":
      player = DucePlayer.get_or_insert(self.uid)
      player.public = not player.public
    if field == "l4g":
      player = DucePlayer.get_or_insert(self.uid)
      player.l4g = not player.l4g
      if player.l4g:
        player.public = True
    player.put()
    self.GoBack()

  def PlayPage(self):
    try:
      game = DuceGame.get_by_id(int(self.request.get("game_id")))
      if game.ruleset == "GuessMyDieRoll":
        gmdr_mgr = duce_guess_my_die_roll.GMDR_Manager(game, self.uid)
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
