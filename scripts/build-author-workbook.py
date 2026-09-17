from pathlib import Path
import os, shutil
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
FONT=Path(os.environ.get('WORKBOOK_FONT_DIR', '/Users/ghostux/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'))
for name,file in [('Sans','Carlito-Regular.ttf'),('Bold','Carlito-Bold.ttf'),('Serif','LiberationSerif-Regular.ttf'),('Italic','LiberationSerif-Italic.ttf')]: pdfmetrics.registerFont(TTFont(name,str(FONT/file)))
OUT=ROOT/'output/pdf/36seas-book-to-launch-workbook.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(612,792),pageCompression=1)
c.setTitle('The Book-to-Launch Workbook | 36Seas')
c.setAuthor('36Seas Publishing')
c.setSubject('An illustrated 12-page author workbook with practical steps and fillable planning fields')
INK='#0B211D'; MINT='#A2E0CD'; PAPER='#F4F0E7'; GOLD='#C7974D'; GRAY='#52655E'; LINE='#C7CFC5'
page=0

def box(x,y,w,h,col,r=0):
 c.setFillColor(HexColor(col)); c.setStrokeColor(HexColor(col)); c.roundRect(x,792-y-h,w,h,r,stroke=0,fill=1)
def text(s,x,y,size=12,font='Sans',col=INK):
 c.setFillColor(HexColor(col));c.setFont(font,size);c.drawString(x,792-y-size*.82,s)
def para(s,x,y,w=516,size=12,col=INK,font='Sans',leading=None):
 st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.35,textColor=HexColor(col))
 p=Paragraph(s,st); ww,hh=p.wrap(w,720);p.drawOn(c,x,792-y-hh);return hh

def photo(path,x,y,w,h):
 im=ImageReader(str(ROOT/'36seas-site/assets'/path)); iw,ih=im.getSize(); scale=max(w/iw,h/ih)
 c.saveState();p=c.beginPath();p.rect(x,792-y-h,w,h);c.clipPath(p,stroke=0,fill=0)
 c.drawImage(im,x+(w-iw*scale)/2,792-y-h+(h-ih*scale)/2,iw*scale,ih*scale,mask='auto');c.restoreState()
def line(x,y,w=516):
 c.setStrokeColor(HexColor(LINE));c.setLineWidth(.6);c.line(x,792-y,x+w,792-y)
def base(kicker,title,sub=None):
 global page
 page+=1;box(0,0,612,792,PAPER);text('36SEAS  /  FIRST MATE',48,29,10,'Bold');text('AUTHOR FIELD GUIDE',417,29,9,'Bold',GRAY);line(48,52)
 text(kicker.upper(),48,77,10,'Bold',GRAY);para(title,48,100,516,35,font='Serif',leading=38)
 if sub: para(sub,48,157,516,12,col=GRAY)
 footer()
def footer():
 line(48,750);text('BOOK-TO-LAUNCH WORKBOOK',48,763,8,'Bold',GRAY);text(f'{page:02d} / 12',520,763,8,'Bold',GRAY)
def end():c.showPage()
def step(n,title,body,y):
 box(48,y,29,29,INK,14);text(n,55,y+8,12,'Bold',MINT);text(title,91,y+1,17,'Bold');para(body,91,y+26,467,12)
def callout(label,body,y,h=78):
 box(48,y,516,h,INK,8);text(label.upper(),65,y+14,9,'Bold',MINT);para(body,65,y+33,482,12,PAPER)
def field(name,label,x,y,w=516,h=45):
 text(label,x,y,10,'Bold',GRAY)
 c.acroForm.textfield(name=name,tooltip=label,x=x,y=792-y-20-h,width=w,height=h,fontName='Helvetica',fontSize=11,textColor=HexColor(INK),borderColor=HexColor(LINE),fillColor=white,borderWidth=.7,borderStyle='solid',forceBorder=True,fieldFlags='multiline',maxlen=1500)
def check(label,y,x=48,w=490):
 c.setStrokeColor(HexColor(GRAY));c.rect(x,792-y-10,10,10,stroke=1,fill=0);para(label,x+20,y-2,w,11)

# 01 Cover
page=1;box(0,0,612,792,INK)
photo('meatwagon/detective-concept.png',0,0,612,450)
box(0,418,612,374,INK);box(48,393,182,29,MINT)
text('THE AUTHOR FIELD GUIDE',59,402,10,'Bold')
text('36SEAS / FIRST MATE',48,38,11,'Bold',PAPER)
text('The book-to-launch',48,458,44,'Serif',PAPER)
text('workbook.',48,511,59,'Italic',MINT)
para('A practical plan for the book only you can make.',50,589,475,18,PAPER)
para('12 illustrated pages. Six stages. Checklists, creative briefs,\nand fillable worksheets to turn your next step into a finished task.',50,633,476,12,'#BFD0C7')
text('OUTLINE  /  WRITE  /  EDIT  /  DESIGN  /  PUBLISH  /  MARKET',50,721,9,'Bold',MINT)
text('36SEAS.COM',50,758,9,'Bold',PAPER)
end()
# 02 map
base('Start here','A route, not a race.','Find your current stage. Work toward its deliverable, then move forward.')
items=[('01','Outline','A clear reader promise\nand a chapter map.'),('02','Write','A complete working draft,\nwith gaps marked.'),('03','Edit','A revised manuscript\nand a resolved issue list.'),('04','Design','A focused cover brief\nand readable interior.'),('05','Publish','Checked files, metadata,\nand a chosen route.'),('06','Market','A reader message,\nassets, and outreach plan.')]
for i,(n,title,body) in enumerate(items):
 x=48+(i%2)*268;y=224+(i//2)*126
 box(x,y,248,109,'#E4E9DF',8);text(n,x+15,y+16,24,'Serif',GRAY);text(title,x+58,y+16,19,'Bold');para(body.replace('\n','<br/>'),x+58,y+46,174,12)
callout('How to use this workbook','Read one stage, make one decision, and produce one useful artifact. Return to earlier stages whenever the book changes.',620,82)
end()
# 03 positioning
base('01 / Foundation','Know the reader. Name the promise.','A book becomes easier to shape when you know who you want to reach.')
step('1','Choose one primary reader.','Describe their taste, situation, or question. Avoid "everyone who reads."',216)
step('2','State the experience you offer.','For fiction: an emotion, tension, or world. For nonfiction: an insight or useful change.',291)
box(48,369,516,99,'#E4E9DF',8);text('EXAMPLE / FICTION POSITIONING',65,385,9,'Bold',GRAY)
para('For readers who love morally complicated crime stories, this book offers a tense investigation where every answer carries a personal cost.',65,409,480,14,font='Italic')
field('reader','MY PRIMARY READER',48,493,h=49)
field('promise','MY ONE-SENTENCE PROMISE',48,585,h=62)
text('DONE WHEN  You can explain the book without summarizing every chapter.',48,700,10,'Bold')
end()
# 04 outline
base('01 / Outline','Build a spine before you draft.','Map the change your book delivers. Keep the structure flexible.')
# diagram
for i,(a,b) in enumerate([('OPEN','A question or disruption'),('DEEPEN','Pressure and discovery'),('TURN','A costly decision'),('LAND','A changed understanding')]):
 x=48+i*132;box(x,223,120,90,INK,5);text(f'{i+1:02}',x+12,234,10,'Bold',MINT);text(a,x+12,253,13,'Bold',PAPER);para(b,x+12,276,100,10,PAPER)
text('CHAPTER / SCENE CARD',48,343,11,'Bold')
para('Give each chapter a job. If it does not move the story, build understanding, or prepare a payoff, rethink its place.',48,366,510,12)
field('chapter_job','WHAT MUST CHANGE IN THIS CHAPTER?',48,417,h=51)
field('chapter_obstacle','WHAT QUESTION, OBSTACLE, OR EVIDENCE DRIVES IT?',48,515,h=51)
field('chapter_next','WHAT MAKES THE READER CONTINUE?',48,613,h=51)
end()
# 05 draft
base('02 / Write','Make progress repeatable.','Schedule a small session you can keep, then protect the next one.')
step('1','Set the finish line.','Choose a scene, section, or time block. A realistic target beats a heroic one.',218)
step('2','Draft forward.','Mark gaps with [RESEARCH] or [FIX LATER]. Keep a separate parking lot for ideas.',294)
step('3','Leave a breadcrumb.','End with a note about the next scene or paragraph. Make restarting easier.',370)
text('YOUR WEEKLY WRITING PLAN',48,463,11,'Bold')
for i,day in enumerate(['Session 1','Session 2','Session 3']):
 y=494+i*64;text(day,48,y+21,12,'Bold');field(f'writing_{i}','WHEN + WHAT I WILL FINISH',151,y,413,29)
callout('A useful measure','Count completed sessions and scenes moved forward. Let consistency guide the plan.',682,57)
end()
# 06 edits
base('03 / Edit','Revise from the outside in.','Fix the structure before polishing sentences that may not survive.')
for i,(title,body,col) in enumerate([('STRUCTURE','Does every section earn its place? Check stakes, sequence, pacing, and payoff.',INK),('CONTINUITY','Track names, dates, motivations, facts, and repeated ideas. Resolve contradictions.', '#294D42'),('LANGUAGE','Improve clarity, voice, dialogue, rhythm, and unnecessary repetition.','#527266'),('PROOF','Check spelling, punctuation, formatting, and final-file errors after layout.','#6E887A')]):
 y=218+i*84;box(48,y,516,72,col,5);text(f'0{i+1}  {title}',64,y+12,11,'Bold',PAPER);para(body,64,y+33,480,11,PAPER)
field('revision','MY THREE MOST IMPORTANT REVISION TASKS',48,578,h=72)
para('AI suggestions are proposals. Review them for voice, accuracy, and context. Outside readers or a professional editor can add another perspective.',48,690,516,11,col=GRAY)
end()
# 07 design visual
base('04 / Design','Build a world readers recognize.','Use the cover, typography, and imagery to signal a coherent reading experience.')
photo('meatwagon/published-cover.jpg',48,220,161,244)
photo('meatwagon/detective-concept.png',224,220,340,159)
photo('meatwagon/terminal-concept.png',224,389,163,75)
box(398,389,166,75,INK,4);text('INK / MINT / AMBER',410,404,9,'Bold',PAPER)
for i,col in enumerate([INK,MINT,GOLD]):box(411+i*45,427,34,21,col)
text('MEAT WAGON / VISUAL STUDY',48,480,9,'Bold',GRAY)
para('Published cover at left; temporary AI concept art at right. Study the shared atmosphere and contrast. A mood board guides a designer; final files still need review.',48,500,516,11)
field('design_words','THREE WORDS THAT DESCRIBE MY BOOK\'S VISUAL WORLD',48,558,h=40)
field('design_avoid','MY COVER MUST SIGNAL / MUST AVOID',48,647,h=39)
end()
# 08 publish
base('05 / Publish','Choose the route. Check the files.','Separate the publishing decision from the excitement of uploading a finished book.')
for x,title,body in [(48,'SELF-PUBLISH','You choose the platform, production team, budget, pricing, and release plan. You are responsible for checking every final file.'),(316,'SEEK A PUBLISHER','Research the fit and submission requirements. Prepare requested materials and track responses. Selection and timing vary.')]:
 box(x,222,248,161,'#E4E9DF',7);text(title,x+17,241,12,'Bold');para(body,x+17,270,214,12)
text('BEFORE YOU RELEASE',48,416,11,'Bold')
for i,s in enumerate(['Proof the final interior on screen and, for print, in a physical proof.','Check the cover at thumbnail size and against current platform specs.','Verify title, author name, description, categories, and other metadata.','Confirm permissions for any third-party material you use.','Review your chosen platform\'s current requirements and sales settings.']):check(s,450+i*40)
callout('36Seas + First Mate','First Mate supports your author workflow. Human editing and other services are separate. Consideration by the 36Seas imprint is selective.',669,69)
end()
# 09 market
base('06 / Market','Start the conversation early.','Create a reason to care, a place to learn more, and a clear next action.')
for i,(tag,title,body) in enumerate([('FOUNDATION','Know your message.','Reuse your reader promise. Draft a short description and a one-line hook. Set up one book page and a permission-based email list.'),('PRE-LAUNCH','Prepare a small asset kit.','Gather a cover image, author bio, book description, sample excerpt, and verified purchase or signup links.'),('LAUNCH','Show up where readers are.','Choose relevant communities, personal outreach, and your own channels. Follow community rules and ask for honest feedback.'),('FOLLOW-THROUGH','Learn and keep showing up.','Record questions, clicks, replies, and sales where available. Repeat useful content and improve unclear messages.')]):
 y=219+i*112;box(48,y,4,94,GOLD);text(tag,67,y,9,'Bold',GRAY);text(title,67,y+21,18,'Serif');para(body,67,y+47,493,12)
para('Focus on actions you can sustain. A plan can improve readiness; it cannot promise sales, reviews, or bestseller status.',48,697,516,11,col=GRAY)
end()
# 10 marketing worksheet
base('Your launch asset kit','Write the invitation.','Make one clear message, then adapt it to each place your readers hear from you.')
box(48,215,516,95,INK,7);text('A SIMPLE MESSAGE FRAME',65,231,10,'Bold',MINT)
para('For [reader], [book title] offers [experience or change].<br/>If you enjoy [relevant interest], start with [one clear next action].',65,259,475,14,PAPER,font='Italic')
field('hook','MY ONE-LINE HOOK',48,340,h=48)
field('outreach','MY SHORT READER INVITATION',48,437,h=77)
field('cta','MY ONE NEXT ACTION + WORKING LINK',48,563,h=48)
para('Before sharing: check the link, use an image you have permission to use, and keep the message specific. Never present invented endorsements or reviews as real.',48,671,516,11,col=GRAY)
end()
# 11 action plan
base('Your next seven days','One week. One finished deliverable.','Choose the stage that matters now. Give yourself a finish line you can recognize.')
field('week_stage','MY CURRENT STAGE',48,219,248,34)
field('week_deliverable','MY FINISHED DELIVERABLE',316,219,248,34)
for i,(label,hint) in enumerate([('DAY 1 / DECIDE','Choose your priority and define done.'),('DAYS 2-3 / BUILD','Protect two focused work sessions.'),('DAYS 4-5 / REVIEW','Read, test, or ask for useful feedback.'),('DAY 6 / FINISH','Resolve the most important open issue.'),('DAY 7 / RESET','Save the work and choose the next step.')]):
 y=315+i*72;text(label,48,y,10,'Bold');para(hint,48,y+19,221,10,col=GRAY);field(f'week_{i}','MY TASK / TIME',294,y,270,34)
end()
# 12 last
base('Keep this page close','Choose your next chapter.','Use this readiness check at every milestone. Complete the missing work before advancing.')
for i,(label,body) in enumerate([('OUTLINE','My reader promise and chapter map are clear.'),('WRITE','My draft is complete, with open questions recorded.'),('EDIT','My main structural and continuity issues are resolved.'),('DESIGN','My visual brief, cover, and interior have been reviewed.'),('PUBLISH','My route, final files, and metadata are checked.'),('MARKET','My message, links, assets, and outreach plan are ready.')]):
 y=227+i*51;check(label,y);para(body,190,y-2,366,11)
box(48,561,516,116,INK,8);text('PUT THE WORKBOOK TO WORK',65,579,10,'Bold',MINT)
text('Write with First Mate',65,604,21,'Serif',PAPER);text('app.36seas.com/signup',65,635,11,'Sans',MINT)
c.linkURL('https://app.36seas.com/signup?start=idea',(63,792-654,332,792-600),relative=0)
text('Learn with us',354,605,16,'Serif',PAPER);text('36seas.com/webinars',354,635,11,'Sans',MINT)
c.linkURL('https://36seas.com/webinars/',(352,792-654,551,792-600),relative=0)
para('Fillable fields work in compatible PDF readers. Save a local copy after completing them. Your worksheet answers stay in your PDF; they are not sent to 36Seas.',48,697,516,9,col=GRAY)
end();c.save()
print(OUT)
