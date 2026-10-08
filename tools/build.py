"""Assemble src/ into one self-contained HTML file (artifact body + standalone document)."""
import os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'src')
def read(p): return open(os.path.join(SRC, p), encoding='utf-8').read()
data = sorted(f for f in os.listdir(os.path.join(SRC, 'data')) if re.match(r'u\d+\.js$', f))
scripts = [('core/registry.js', 'CONTENT REGISTRY')] + [('data/' + f, 'GRAMMAR CONTENT + EXERCISES ' + f) for f in data] + \
          [('data/pinyin.js', 'PINYIN (generated)'), ('core/vocab.js', 'VOCABULARY CONTROL'), ('core/grader.js', 'ANSWER CHECKING'),
           ('core/store.js', 'PROGRESS STORAGE'), ('core/engine.js', 'LEARNING ENGINE'),
           ('ui/components.js', 'UI COMPONENTS'), ('ui/views.js', 'UI VIEWS'), ('ui/app.js', 'APP SHELL')]
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap">'
body = '<title>Grammar Steps HSK 1–3</title>\n' + fonts + '\n<style>\n' + read('ui/styles.css') + '\n</style>\n<div id="app"></div>\n<noscript>This course needs JavaScript enabled.</noscript>\n'
for p, label in scripts:
    body += f'<script>/* ===== {label} ({p}) ===== */\n' + read(p) + '\n</script>\n'
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(body)
full = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + body.replace('<div id="app">', '</head>\n<body>\n<div id="app">', 1) + '</body>\n</html>\n'
open(os.path.join(ROOT, 'dist', 'hsk1-3-grammar.html'), 'w', encoding='utf-8').write(full)
print('built', len(full) // 1024, 'KB')
