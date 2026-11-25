"""Verifica os efeitos do style.css: existem, duram no máximo 250 ms e só correm sem prefers-reduced-motion.
Correr: python -I tests/test_efeitos.py   (sai com código 1 se alguma regra falhar)"""
import pathlib, re, sys

CSS = (pathlib.Path(__file__).parent.parent / 'style.css').read_text(encoding='utf-8')
ABRE = '@media(prefers-reduced-motion:no-preference){'

def blocos_com_movimento(css):
    """Devolve (conteúdo dos blocos no-preference, resto do CSS sem eles)."""
    dentro, fora, i = [], [], 0
    while (j := css.find(ABRE, i)) != -1:
        fora.append(css[i:j]); k, nivel = j + len(ABRE), 1
        while nivel:
            nivel += {'{': 1, '}': -1}.get(css[k], 0); k += 1
        dentro.append(css[j + len(ABRE):k - 1]); i = k
    fora.append(css[i:])
    return ''.join(dentro), ''.join(fora)

def main():
    sys.stdout.reconfigure(encoding='utf-8')   # a consola do Windows não imprime ✓ nem ≤
    dentro, fora = blocos_com_movimento(CSS)
    falhas = []
    if re.search(r'(?<![\w-])(animation|transition)\s*:', fora):
        falhas.append('há animation/transition fora de @media(prefers-reduced-motion:no-preference)')
    for valor, unidade in re.findall(r'(\d*\.?\d+)(ms|s)\b', dentro):
        ms = float(valor) * (1 if unidade == 'ms' else 1000)
        if ms > 250: falhas.append(f'duração {valor}{unidade} > 250 ms')
    for nome in ('pop', 'desenha', 'entrada'):
        if f'@keyframes {nome}' not in CSS: falhas.append(f'@keyframes {nome} falta')
    for sel, o_que in (('.pick button.pop{', 'pop no botão tocado'), ('.pop .ok', '✓ a desenhar-se'), ('.band>.wrap', 'entrada da página')):
        if sel not in dentro: falhas.append(f'efeito "{o_que}" ({sel}) falta')
    if not re.search(r'\.pick button[^{]*\{transition:[^}]*background-color', dentro):
        falhas.append('transição de cor dos botões ao passar o rato falta')
    print('\n'.join(falhas) if falhas else 'efeitos OK: pop, ✓, entrada e transições, ≤250 ms, só sem movimento reduzido')
    return 1 if falhas else 0

if __name__ == '__main__':
    sys.exit(main())
