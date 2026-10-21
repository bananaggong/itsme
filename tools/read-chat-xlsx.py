"""Read our two authoring tables using Python's standard library; no Excel install needed."""
import json
import posixpath
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'

def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        if sum(item.file_size for item in archive.infolist()) > 20_000_000:
            raise ValueError('20MB 이하의 질문 양식을 사용해주세요. 사진은 엑셀에 삽입하지 않고 파일 경로로 연결합니다.')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(t.text or '' for t in si.findall('.//s:t', NS)) for si in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        relationships = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            name = sheet.attrib['name']
            if name not in ['질문 목록', '답변 순서']:
                continue
            target = relationships[sheet.attrib[REL]]
            file = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl', target))
            rows = []
            for row in ET.fromstring(archive.read(file)).findall('s:sheetData/s:row', NS):
                values = {}
                for cell in row.findall('s:c', NS):
                    if cell.find('s:f', NS) is not None:
                        raise ValueError(f'{name} {cell.attrib["r"]}: 수식 대신 글이나 숫자를 직접 입력해주세요.')
                    column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                    raw = cell.find('s:v', NS)
                    value = raw.text if raw is not None and raw.text else ''
                    if cell.attrib.get('t') == 's':
                        value = strings[int(value)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        value = ''.join(t.text or '' for t in cell.findall('.//s:t', NS))
                    values[column] = value
                rows.append(values)
            sheets[name] = rows
        return sheets

try:
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(read_workbook(sys.argv[1]), ensure_ascii=False))
except Exception as error:
    sys.stderr.reconfigure(encoding='utf-8')
    print(str(error), file=sys.stderr)
    sys.exit(1)
