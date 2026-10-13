"""Adapt the retained instrument SVGs for GameDude's hero and playable panels."""
from pathlib import Path
from copy import deepcopy
import re,xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
def tag(name):return '{'+NS+'}'+name
def node(name,**attrs):return ET.Element(tag(name),attrs)
def byid(root,id):return next(e for e in root.iter() if e.get('id')==id)
def add_logo(defs):
    logo=ET.parse(ROOT/'web/gamedude-logo.svg').getroot()
    symbol=node('symbol',id='gd-logo',viewBox=logo.get('viewBox'))
    symbol.extend(deepcopy(list(logo)));defs.append(symbol)
def use_logo(parent,x,y,w,h):parent.append(node('use',href='#gd-logo',x=str(x),y=str(y),width=str(w),height=str(h)))

out=ROOT/'web/artwork';out.mkdir(exist_ok=True)
fm=ET.parse(ROOT/'vendor/illustrations/fm1.svg').getroot()
for child in list(fm):
    if child.get('class')=='hero-wire':fm.remove(child)
fm.set('viewBox','25 45 590 350');fm.set('aria-label','FM-1 GameDude simulator');fm.attrib.pop('aria-labelledby',None)
product=next(e for e in fm if e.get('class')=='hero-product');product.attrib.pop('aria-hidden',None)
for parent in fm.iter():
    for child in list(parent):
        if child.get('class') in ('product-display','product-screen-label'):parent.remove(child)
defs=fm.find(tag('defs'));add_logo(defs)
brand=node('g',id='game-screen-brand');use_logo(brand,205,126,93,19);product.append(brand)
style=node('style');style.text='''
.hero-product{color:#cdd7d4}.product-body{fill:#343b43;stroke:#687887}.product-rubber{fill:#263b40;stroke:#1118}.product-button{fill:var(--button-fill,#82aaa5);stroke:#182b30}.product-detail{opacity:.25}.product-bezel{fill:#0a111b;stroke:#000}.product-screen{fill:#090d19;stroke:#566b73}.product-labels{font-family:Arial,sans-serif;letter-spacing:.3px}.product-control-ink{color:#173631}
''';fm.insert(0,style)
ET.ElementTree(fm).write(out/'fm1.svg',encoding='utf-8',xml_declaration=True)

smk=ET.parse(ROOT/'vendor/illustrations/smk37.svg').getroot()
defs=smk.find(tag('defs'))
for child in list(defs):
    if child.get('id')=='smk-wire-hardware':defs.remove(child)
hardware=byid(defs,'smk-hardware')
for parent in hardware.iter():
    for child in list(parent):
        if child.tag==tag('image'):parent.remove(child)
add_logo(defs)
brand=node('g',id='game-screen-brand');use_logo(brand,139,107,68,14);hardware.append(brand)
for child in list(smk):
    if child.tag!=tag('defs'):smk.remove(child)
# Keep the actual shapes in the visible tree so individual controls can respond.
defs.remove(hardware);smk.append(hardware)
smk.set('viewBox','10 32 940 370');smk.attrib.pop('aria-labelledby',None)
style=node('style');style.text='''
.smk-chassis{fill:var(--smk-body);stroke:#0005;stroke-width:2}.smk-recess{fill:#151b1d;stroke:#0005}.smk-control{fill:var(--smk-control);stroke:#0007;stroke-width:1.2}.smk-ink{fill:var(--smk-ink);font:6px Arial,sans-serif;text-anchor:middle}.smk-wordmark{font-size:16px;font-weight:bold;letter-spacing:1px}.smk-control-label{fill:var(--smk-control-ink);font:5px Arial,sans-serif;text-anchor:middle}.smk-pad-edge{fill:#789496;stroke:#0004}.smk-pad{fill:var(--smk-pad)}.smk-white-key{fill:url(#smk-key);stroke:#777;stroke-width:.8}.smk-black-key{fill:var(--smk-key);stroke:#0006}
''';smk.insert(0,style)
for model,css in [('pro','--smk-body:#b92832;--smk-control:#262c30;--smk-ink:#fff2e5;--smk-control-ink:#ddd;--smk-key:#252b2c;--smk-pad:#26373a'),('elite','--smk-body:#687481;--smk-control:#e76522;--smk-ink:#f1f1e9;--smk-control-ink:#402b23;--smk-key:#df5923;--smk-pad:#fff5da')]:
    smk.set('style',css);smk.set('aria-label','SMK-37 '+model.title()+' GameDude simulator')
    ET.ElementTree(smk).write(out/('smk-'+model+'.svg'),encoding='utf-8',xml_declaration=True)

hero=node('svg',viewBox='0 0 840 650',role='img')
title=node('title');title.text='GameDude on FM-1, SMK-37 Pro and SMK-37 Elite';hero.append(title)
defs=node('defs');add_logo(defs);hero.append(defs);use_logo(hero,145,30,550,104)
for name,x,y,w,h,angle in [('smk-pro',105,175,660,260,-5),('smk-elite',170,365,640,252,4),('fm1',5,365,370,220,-9)]:
    text=(out/(name+'.svg')).read_text(encoding='utf-8')
    for id in re.findall(r'\bid="([^"]+)"',text):
        text=text.replace('id="'+id+'"','id="'+name+'-'+id+'"').replace('#'+id+'"','#'+name+'-'+id+'"').replace('#'+id+')','#'+name+'-'+id+')')
    art=ET.fromstring(text);art.set('x',str(x));art.set('y',str(y));art.set('width',str(w));art.set('height',str(h));art.set('transform',f'rotate({angle} {x+w/2} {y+h/2})');hero.append(art)
for label,x,y in [('SMK-37 PRO',615,157),('SMK-37 ELITE',638,635),('FM-1',60,627)]:
    text=node('text',x=str(x),y=str(y),fill='#a9b8cc',**{'font-family':'Arial,sans-serif','font-size':'14','font-weight':'700','letter-spacing':'2'});text.text=label;hero.append(text)
ET.ElementTree(hero).write(out/'gamedude-devices.svg',encoding='utf-8',xml_declaration=True)
print('Built FM-1, SMK Pro, SMK Elite and GameDude hero SVGs.')
