"""Verifica a Poppins auto-alojada: ficheiros no projeto, @font-face com swap, nada do Google Fonts.
Correr: python -I tests/test_fonte.py   (sai com código 1 se alguma regra falhar)"""
import pathlib, re, sys

RAIZ = pathlib.Path(__file__).parent.parent
CSS = (RAIZ / 'style.css').read_text(encoding='utf-8')
PESOS = ('700', '800')

def main():
    falhas = []
    for p in PESOS:
        f = RAIZ / 'fonts' / f'poppins-latin-{p}-normal.woff2'
        if not f.exists() or f.read_bytes()[:4] != b'wOF2':
            falhas.append(f'{f.name}: falta ou não é woff2')
        bloco = re.search(r'@font-face\{[^}]*font-weight:%s;[^}]*\}' % p, CSS)
        if not bloco:
            falhas.append(f'@font-face Poppins {p}: falta')
        else:
            b = bloco.group(0)
            if 'font-family:"Poppins"' not in b: falhas.append(f'@font-face {p}: família não é "Poppins"')
            if 'font-display:swap' not in b: falhas.append(f'@font-face {p}: sem font-display:swap')
            if f'url(fonts/poppins-latin-{p}-normal.woff2)' not in b: falhas.append(f'@font-face {p}: src não aponta para fonts/')
    if not (RAIZ / 'fonts' / 'OFL.txt').exists():
        falhas.append('fonts/OFL.txt (licença) falta')
    extras = [f.name for f in (RAIZ / 'fonts').glob('*.woff2')] if (RAIZ / 'fonts').exists() else []
    if sorted(extras) != sorted(f'poppins-latin-{p}-normal.woff2' for p in PESOS):
        falhas.append(f'fonts/ deve ter só os pesos usados, tem: {extras}')
    for html in ('index.html', 'admin.html'):
        if re.search(r'fonts\.(googleapis|gstatic)\.com', (RAIZ / html).read_text(encoding='utf-8')):
            falhas.append(f'{html}: ainda pede fontes ao Google')
    if '--display:"Poppins","Poppins fallback",' not in CSS:
        falhas.append('token --display tem de ser "Poppins","Poppins fallback",… (recurso com métricas antes da fonte do sistema)')
    recurso = re.search(r'@font-face\{font-family:"Poppins fallback";[^}]*\}', CSS)
    if not recurso:
        falhas.append('@font-face "Poppins fallback" falta (reduz o salto quando a Poppins carrega)')
    else:
        for prop in ('size-adjust:', 'ascent-override:', 'descent-override:', 'line-gap-override:', 'src:local('):
            if prop not in recurso.group(0): falhas.append(f'"Poppins fallback" sem {prop}')
    for sel in ('h1{', '.best .t{', '.wk header h2', '.ola h2{'):
        regra = re.search(re.escape(sel) + r'[^}]*\}', CSS)
        if not regra or 'var(--display)' not in regra.group(0):
            falhas.append(f'{sel.strip("{")}: não usa var(--display)')
    print('\n'.join(falhas) if falhas else 'fonte OK: Poppins 700/800 no projeto, swap, sem Google Fonts, nos 4 títulos')
    return 1 if falhas else 0

if __name__ == '__main__':
    sys.exit(main())
