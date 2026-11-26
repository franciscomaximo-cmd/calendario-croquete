"""Verifica as cores do style.css: valores da paleta Violeta e regras de contraste.
Correr: python -I tests/test_tokens.py   (sai com código 1 se alguma regra falhar)"""
import pathlib, re, sys

CSS = (pathlib.Path(__file__).parent.parent / 'style.css').read_text(encoding='utf-8')
ROOT = re.search(r':root\{color-scheme:light dark;(.*?)\}', CSS, re.S).group(1)

def tokens():
    claro, escuro = {}, {}
    for nome, valor in re.findall(r'--([\w-]+):([^;]+);?', ROOT):
        m = re.fullmatch(r'light-dark\((#[0-9a-fA-F]{6}),(#[0-9a-fA-F]{6})\)', valor.strip())
        if m: claro[nome], escuro[nome] = m.group(1).lower(), m.group(2).lower()
        elif re.fullmatch(r'#[0-9a-fA-F]{6}', valor.strip()): claro[nome] = escuro[nome] = valor.strip().lower()
    return claro, escuro

def lum(h):
    c = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)

VIOLETA = {  # nome: (claro, escuro), da spec
    'bg': ('#ffffff', '#0f1020'), 'surface': ('#f4f1fd', '#181a2e'), 'ink': ('#131627', '#f2f0fb'),
    'mute': ('#565a6e', '#b3b1c8'), 'edge': ('#858aa0', '#7c7c96'), 'band': ('#6f00fd', '#6f00fd'),
    'bandink': ('#ffffff', '#ffffff'), 'brand': ('#6f00fd', '#a983ff'), 'yes': ('#0a4230', '#1f7a55'),
    'yesink': ('#ffffff', '#ffffff'), 'yestxt': ('#0a4230', '#5cd6a0'), 'maybe': ('#ffd21f', '#f2c94c'),
    'maybeink': ('#131627', '#131627'), 'maybeedge': ('#8a6a00', '#f2c94c'), 'no': ('#c62828', '#d32f2f'),
    'noink': ('#ffffff', '#ffffff'), 'erro': ('#b3261e', '#ff8a80'), 'erroink': ('#ffffff', '#131627'),
    'maybebar': ('#b07d00', '#f2c94c'),
    'verso': ('#eeeaf8', '#1f2238'),   # verso das folhas do bloco (só decoração)
}
REGRAS = [  # (a, b, mínimo)
    ('ink', 'bg', 4.5), ('ink', 'surface', 4.5), ('mute', 'bg', 4.5), ('mute', 'surface', 4.5),
    ('bandink', 'band', 4.5), ('edge', 'bg', 3), ('edge', 'surface', 3), ('brand', 'bg', 3), ('brand', 'surface', 3),
    ('yes', 'bg', 3), ('yes', 'surface', 3), ('maybeedge', 'bg', 3), ('maybeedge', 'surface', 3),
    ('no', 'bg', 3), ('no', 'surface', 3), ('yesink', 'yes', 4.5), ('maybeink', 'maybe', 4.5), ('noink', 'no', 4.5),
    ('yes', 'maybe', 3), ('yestxt', 'bg', 4.5), ('yestxt', 'surface', 4.5), ('erro', 'bg', 4.5), ('erro', 'surface', 4.5), ('erroink', 'erro', 4.5),
    # barra: os segmentos ficam lado a lado e sobre o fundo da barra (--bg)
    ('yes', 'maybebar', 3), ('maybebar', 'bg', 3), ('maybebar', 'surface', 3),
]

def main():
    claro, escuro = tokens()
    falhas = []
    for nome, (c, e) in VIOLETA.items():
        if (claro.get(nome), escuro.get(nome)) != (c, e):
            falhas.append(f'--{nome}: esperado {c}/{e}, está {claro.get(nome)}/{escuro.get(nome)}')
    for tema, t in (('claro', claro), ('escuro', escuro)):
        for a, b, m in REGRAS:
            if a in t and b in t and ratio(t[a], t[b]) < m:
                falhas.append(f'{tema}: {a}/{b} = {ratio(t[a], t[b]):.2f} < {m}')
        if 'band' in t and 'bg' in t and tema == 'escuro' and ratio(t['band'], t['bg']) < 2:
            falhas.append(f'escuro: faixa/fundo = {ratio(t["band"], t["bg"]):.2f} < 2')
    if re.search(r'inset\s+\d+px\s+0\s+0', CSS):
        falhas.append('risca colorida só num lado (side-stripe): usar contorno à volta')
    if 'light-dark(#' in CSS[CSS.index(ROOT) + len(ROOT):]:
        falhas.append('cor escrita à mão fora do :root')
    barra = re.search(r'^\.bar\{[^}]*\}', CSS, re.M).group(0)   # a regra principal, não '.day.past .bar{'
    if 'background:var(--bg)' not in barra:
        falhas.append('fundo da barra tem de ser --bg (as regras de contraste da barra medem contra ele)')
    if '.bar .m{background:var(--maybebar)}' not in CSS:
        falhas.append('segmento Talvez da barra tem de usar --maybebar')
    if any(ord(c) < 32 and c not in '\n\r\t' for c in CSS):
        falhas.append('carácter de controlo no CSS (escape mal escrito?)')
    if re.search(r'--best\b', CSS):
        falhas.append('--best ainda existe (o melhor dia passa a ser a risca em --brand)')
    print('\n'.join(falhas) if falhas else 'tokens OK: Violeta e 27 regras de contraste nos dois temas')
    return 1 if falhas else 0

if __name__ == '__main__':
    sys.exit(main())
