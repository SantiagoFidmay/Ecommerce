"""Gera paginas de ajuda e PDFs a partir dos Markdown da atividade.

Dependencia: python -m pip install -r tools/requirements-docs.txt
Uso: python tools/gerar_documentacao.py [--pdf] [--chrome CAMINHO]
"""

import argparse
from html import escape
from pathlib import Path
import shutil
import subprocess
import tempfile
import re

import markdown


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'docs' / 'implantacao'
PAGES = ROOT / 'frontend' / 'pages'
DOWNLOADS = ROOT / 'frontend' / 'ajuda'
DOCUMENTS = [
    ('02-manual-usuario', 'ajuda', 'Manual do usuário'),
    ('01-plano-treinamento', 'treinamento', 'Plano de treinamento'),
    ('03-roteiro-integrado', 'roteiro', 'Roteiro integrado'),
]


def generate():
    PAGES.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    for source, page, label in DOCUMENTS:
        renderer = markdown.Markdown(extensions=['tables', 'toc', 'sane_lists'])
        content = renderer.convert((SOURCES / f'{source}.md').read_text(encoding='utf-8'))
        navigation = ''.join(
            f'<a href="{p}.html" {"aria-current=page" if p == page else ""}>{escape(title)}</a>'
            for _, p, title in DOCUMENTS
        )
        pdf = DOWNLOADS / f'{source}.pdf'
        download = (f'<a class="help-button" href="../ajuda/{source}.pdf" download>Baixar PDF</a>'
                    if pdf.exists() else '')
        html = f'''<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{escape(label)} da Sport Kicks, versão em desenvolvimento.">
  <title>{escape(label)} | Sport Kicks</title>
  <link rel="stylesheet" href="../css/ajuda.css">
</head>
<body>
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
  <header class="help-header">
    <a class="help-brand" href="../index.html">SPORT<span>KICKS</span></a>
    <nav aria-label="Navegação da loja">
      <a href="../index.html">Início</a>
      <a href="catalogo.html">Catálogo</a>
      <a href="login.html">Entrar</a>
    </nav>
  </header>
  <div class="help-intro">
    <p class="eyebrow">CENTRAL DE AJUDA · REVISÃO 27/10/2026</p>
    <p>Orientações para usar a loja e preparar o treinamento.</p>
    <p class="help-notice"><strong>Versão em desenvolvimento.</strong> Pedidos, conta, administração e ferramentas de escolha estão disponíveis. Pagamentos e estornos são somente demonstrações, sem cobrança real. Consulte o manual atualizado.</p>
    <nav class="help-tabs" aria-label="Documentos de apoio">{navigation}</nav>
    <div class="help-actions">{download}<button type="button" onclick="window.print()">Imprimir / salvar em PDF</button></div>
  </div>
  <div class="help-layout">
    <aside aria-label="Sumário"><p class="eyebrow">NESTE DOCUMENTO</p>{renderer.toc}</aside>
    <main id="conteudo" tabindex="-1">{content}</main>
  </div>
  <footer class="help-footer">Sport Kicks · Material de apoio à implantação · Manual revisado em 27/10/2026</footer>
</body>
</html>
'''
        (PAGES / f'{page}.html').write_text(html, encoding='utf-8')
        print(f'HTML: frontend/pages/{page}.html')


def generate_pdfs(chrome):
    candidates = [chrome, shutil.which('google-chrome'), shutil.which('chromium'),
                  r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                  r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
    browser = next((p for p in candidates if p and Path(p).is_file()), None)
    if not browser:
        raise SystemExit('Navegador não encontrado. Use --chrome CAMINHO ou imprima as páginas pelo navegador.')
    for source, page, _ in DOCUMENTS:
        target = DOWNLOADS / f'{source}.pdf'
        with tempfile.TemporaryDirectory(prefix='sportkicks-docs-') as profile:
            subprocess.run([
                str(browser), '--headless', '--disable-gpu', '--no-first-run',
                '--no-default-browser-check', '--disable-extensions',
                f'--user-data-dir={profile}', '--no-pdf-header-footer',
                f'--print-to-pdf={target}', (PAGES / f'{page}.html').as_uri(),
            ], check=True, timeout=60, capture_output=True)
        if not target.exists() or target.stat().st_size < 1000:
            raise RuntimeError(f'PDF não foi gerado: {target.name}')
        print(f'PDF: frontend/ajuda/{target.name}')


def generate_engineering_pdf(chrome):
    candidates = [chrome, shutil.which('google-chrome'), shutil.which('chromium'),
                  r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                  r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
    browser = next((p for p in candidates if p and Path(p).is_file()), None)
    if not browser:
        raise SystemExit('Navegador não encontrado para exportar a engenharia.')
    source = (ROOT / 'docs' / 'engenharia.md').read_text(encoding='utf-8')
    source = re.sub(r'```mermaid.*?```', '', source, flags=re.S)
    content = markdown.markdown(source, extensions=['tables', 'fenced_code'])
    html = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="{(ROOT / 'docs').as_uri()}/"><style>
    @page{{size:A4;margin:15mm}}body{{font:12px/1.5 Arial,sans-serif;color:#172033}}h1,h2,h3{{break-after:avoid}}h1{{font-size:25px}}h2{{margin-top:25px;color:#1d4ed8}}table{{width:100%;border-collapse:collapse;font-size:10px}}th,td{{padding:6px;border:1px solid #cbd5e1;vertical-align:top;text-align:left}}th{{background:#eff6ff}}tr{{break-inside:avoid}}img{{max-width:100%;break-inside:avoid}}pre{{white-space:pre-wrap;overflow-wrap:anywhere}}a{{color:#1d4ed8}}code{{font-size:10px}}
    </style></head><body>{content}</body></html>'''
    with tempfile.TemporaryDirectory(prefix='sportkicks-engenharia-') as folder:
        page = Path(folder) / 'engenharia.html'
        page.write_text(html, encoding='utf-8')
        subprocess.run([str(browser), '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                        f'--user-data-dir={Path(folder) / "perfil"}', '--no-pdf-header-footer',
                        f'--print-to-pdf={ROOT / "docs" / "engenharia.pdf"}', page.as_uri()],
                       check=True, timeout=60, capture_output=True)
    print('PDF: docs/engenharia.pdf')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf', action='store_true')
    parser.add_argument('--chrome')
    args = parser.parse_args()
    generate()
    if args.pdf:
        generate_pdfs(args.chrome)
        generate_engineering_pdf(args.chrome)
        # Agora que existem os PDFs, disponibiliza os links de download.
        generate()
