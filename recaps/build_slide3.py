import re, html

SRC = 'unpacked/ppt/slides/slide3.xml'
x = open(SRC, encoding='utf-8').read()
blocks = re.findall(r'<p:(?:sp|cxnSp)>.*?</p:(?:sp|cxnSp)>', x, re.S)
head = x[:x.find('<p:sp>')]
tail = x[x.rfind('</p:sp>') + len('</p:sp>'):]

T_LABEL   = blocks[0]    # top small label
T_TITLE   = blocks[1]
T_OBJLINE = blocks[2]    # dashed objective line
T_OBJTXT  = blocks[3]    # "OBJETIVO 100"
T_BAR     = blocks[4]
T_VAL     = blocks[5]
T_DAY     = blocks[6]
T_WKLINE  = blocks[67]   # vertical orange dashed
T_WKTXT   = blocks[68]   # "SEMANA 21 AL 27"
T_TREND   = blocks[69]
T_RULE    = blocks[70]
T_CAPTION = blocks[71]
T_FOOT    = blocks[72:75]

# ---- data ----
days = [('7',39),('8',29),('9',37),('10',34),('11',41),('12',90),('13',82),
        ('14',78),('15',53),('16',90),('17',88),('18',98),('19',119),('20',78),
        ('21',134),('22',141),('23',107),('24',88),('25',102),('26',137),('27',180),
        ('28',277),('29',322),('30',260),('1',295),('2',162),('3',162),('4',290)]
WEEK_COLORS = ['E4E4E4','D4D4D4','C0C0C0','FF8431']
OBJ_OLD, OBJ_NEW, SPLIT = 100, 160, 21   # SPLIT = index of first day with new objective

# ---- geometry (EMU) ----
X0, WIDTH = 731520, 10716768
N = len(days)
PITCH = WIDTH // N
BARW = 280000
BASE = 5303520
SCALE = 7800            # EMU per ticket
VAL_OFF = 274320        # value label sits this far above the bar top
DAY_Y = 5413248
LBL_W = 548640
LINE_X0, LINE_X1 = 640080, 640080 + 10899648

def bar_x(i): return X0 + i*PITCH + (PITCH - BARW)//2
def bar_cx(i): return bar_x(i) + BARW//2
def y_of(v): return BASE - v*SCALE

ids = [100]
def nid():
    ids[0] += 1; return ids[0]

def set_id(blk, name):
    return re.sub(r'<p:cNvPr id="\d+" name="[^"]*"/>', f'<p:cNvPr id="{nid()}" name="{name}"/>', blk, 1)

def set_xfrm(blk, x, y, cx, cy, flipV=False):
    tag = '<a:xfrm flipV="1">' if flipV else '<a:xfrm>'
    return re.sub(r'<a:xfrm[^>]*><a:off x="\d+" y="\d+"/><a:ext cx="\d+" cy="\d+"/>',
                  f'{tag}<a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/>', blk, 1)

def set_text(blk, t):
    return re.sub(r'<a:t>[^<]*</a:t>', f'<a:t>{html.escape(t, quote=False)}</a:t>', blk, 1)

def set_fill(blk, color):
    return re.sub(r'(<p:spPr>.*?<a:solidFill><a:srgbClr val=")\w+(")', rf'\g<1>{color}\2', blk, 1, re.S)

def set_color(blk, color):   # text color
    return re.sub(r'(<a:defRPr[^>]*><a:solidFill><a:srgbClr val=")\w+(")', rf'\g<1>{color}\2', blk, 1)

def set_line_color(blk, color):
    return re.sub(r'(<a:ln w="\d+"><a:solidFill><a:srgbClr val=")\w+(")', rf'\g<1>{color}\2', blk, 1)

out = []
out.append(set_id(set_text(T_LABEL, '7 DE SEPTIEMBRE AL 4 DE OCTUBRE'), 'TextBox 1'))
out.append(set_id(T_TITLE, 'TextBox 2'))

# objective lines (stepped)
xb = X0 + SPLIT*PITCH
yo, yn = y_of(OBJ_OLD), y_of(OBJ_NEW)
out.append(set_id(set_xfrm(T_OBJLINE, LINE_X0, yo, xb - LINE_X0, 0), 'Objetivo 100'))
out.append(set_id(set_xfrm(T_OBJLINE, xb, yn, LINE_X1 - xb, 0), 'Objetivo 160'))
out.append(set_id(set_xfrm(T_OBJLINE, xb, yn, 0, yo - yn), 'Objetivo salto'))
out.append(set_id(set_xfrm(set_text(T_OBJTXT, f'OBJETIVO {OBJ_OLD}'), LINE_X0, yo - 292608, 1828800, 228600), 'Objetivo 100 texto'))

# bars + labels
for i, (d, v) in enumerate(days):
    week = i // 7
    color = WEEK_COLORS[week]
    top = y_of(v)
    out.append(set_id(set_fill(set_xfrm(T_BAR, bar_x(i), top, BARW, BASE - top), color), f'Barra {d}'))
    out.append(set_id(set_xfrm(set_text(T_VAL, str(v)), bar_cx(i) - LBL_W//2, top - VAL_OFF, LBL_W, 228600), f'Valor {d}'))
    day = set_text(T_DAY, d)
    day = set_color(day, '383838' if week == 3 else '999999')
    out.append(set_id(set_xfrm(day, bar_cx(i) - LBL_W//2, DAY_Y, LBL_W, 201168), f'Dia {d}'))

# week marker: vertical dashed line at the split, with labels
wk_top = 2103120
out.append(set_id(set_xfrm(T_WKLINE, xb, wk_top, 0, BASE + 54911 - wk_top), 'Semana linea'))
out.append(set_id(set_xfrm(set_text(T_WKTXT, f'SEMANA 28 SEP AL 4 OCT · OBJETIVO {OBJ_NEW}'), xb + 91440, 2075688, LINE_X1 - xb - 91440, 228600), 'Semana texto'))

# trend line: least squares over all days
vals = [v for _, v in days]
n = N; xs = list(range(n))
mx = sum(xs)/n; my = sum(vals)/n
slope = sum((xi-mx)*(vi-my) for xi, vi in zip(xs, vals)) / sum((xi-mx)**2 for xi in xs)
b = my - slope*mx
y1, y2 = y_of(b), y_of(b + slope*(n-1))
x1, x2 = bar_cx(0), bar_cx(n-1)
out.append(set_id(set_xfrm(T_TREND, x1, min(y1, y2), x2 - x1, abs(y2 - y1), flipV=(y1 > y2)), 'Tendencia'))

out.append(set_id(T_RULE, 'Rectangle 71'))
cap = ('La línea punteada es el objetivo: 100 boletos por día hasta el 27 y 160 desde el 28. '
       'La azul es la tendencia. En naranja, la semana del 28 de septiembre al 4 de octubre.')
out.append(set_id(set_text(T_CAPTION, cap), 'TextBox 72'))
out.append(set_id(set_text(T_FOOT[0], 'CIELO MÁGICO · 28 DE SEPTIEMBRE A 4 DE OCTUBRE'), 'TextBox 73'))
out.append(set_id(T_FOOT[1], 'TextBox 74'))
out.append(set_id(T_FOOT[2], 'TextBox 75'))

open(SRC, 'w', encoding='utf-8').write(head + ''.join(out) + tail)
print('shapes written:', len(out), '| trend slope %.2f/día, promedio semana %.1f' % (slope, sum(vals[21:])/7))
