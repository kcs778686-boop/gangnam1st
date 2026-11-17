"""Validate navigation, assets, distinct metadata, and one placement per photo."""
from pathlib import Path
from urllib.parse import urlparse
from collections import Counter
import json
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parents[1]/'public'
routes=json.loads((root/'routes.json').read_text())
titles=[]; descriptions=[]; photos=[]; errors=[]
for path,filename in routes.items():
    soup=BeautifulSoup((root/filename).read_text(),'html.parser')
    titles.append(soup.title.string)
    descriptions.append(soup.find('meta',attrs={'name':'description'})['content'])
    if len(soup.find_all('h1'))!=1: errors.append(f'{path}: H1')
    for script in soup.find_all('script',type='application/ld+json'): json.loads(script.string)
    for tag in soup.find_all(['a','link','script','img','source']):
        references=[]
        for attr in ['href','src']:
            if tag.get(attr): references.append(tag[attr])
        if tag.get('srcset'): references += [part.strip().split()[0] for part in tag['srcset'].split(',')]
        for ref in references:
            url=urlparse(ref)
            if url.scheme: continue
            if not url.path and url.fragment:
                if not soup.find(id=url.fragment): errors.append(f'{path}: missing anchor {ref}')
                continue
            if url.path.startswith('/assets/'):
                if not (root/url.path.lstrip('/')).is_file(): errors.append(f'{path}: missing asset {ref}')
            elif url.path and url.path not in routes: errors.append(f'{path}: missing page {ref}')
    for image in soup.find_all('img'):
        photos.append(image['src'])
        if not image.get('alt'): errors.append(f'{path}: missing alt')
    for link in soup.select('a[href^="tel:"]'):
        if link['href']!='tel:01067402737': errors.append(f'{path}: changed phone')
if len(set(titles))!=len(routes): errors.append('Duplicate titles')
if len(set(descriptions))!=len(routes): errors.append('Duplicate descriptions')
if len(photos)!=7 or len(set(photos))!=7: errors.append(f'Expected 7 unique photo placements: {Counter(photos)}')
if errors: raise SystemExit('\n'.join(errors))
print(f'PASS: {len(routes)} pages, all internal links/assets/anchors, unique titles/descriptions, 7 non-repeated photos, valid JSON-LD, preserved phone.')
