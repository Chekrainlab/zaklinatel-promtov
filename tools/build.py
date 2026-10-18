#!/usr/bin/env python3
"""Собирает архив для загрузки в Яндекс Игры: dist/kodolesie-yandex.zip.

В архив попадают только файлы игры. В index.html добавляется загрузчик SDK
<script src="/sdk.js">, как требует документация Яндекса (требование 1.19.1).
Запуск: python3 tools/build.py
"""
import pathlib, re, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "kodolesie-yandex.zip"
FILES = ["index.html", *sorted(str(p.relative_to(ROOT)) for d in ("css", "js", "fonts") for p in (ROOT / d).rglob("*") if p.is_file())]

def main():
    OUT.parent.mkdir(exist_ok=True)
    total = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for name in FILES:
            # Требование 1.22: в именах файлов нет пробелов и кириллицы.
            assert re.fullmatch(r"[A-Za-z0-9_./-]+", name), f"недопустимое имя файла: {name}"
            data = (ROOT / name).read_bytes()
            if name == "index.html":
                html = data.decode()
                assert "<head>" in html
                html = html.replace("<head>", '<head>\n  <script src="/sdk.js"></script>', 1)
                data = html.encode()
            total += len(data)
            z.writestr(name, data)
    # Требование 1.21: не больше 100 МБ в распакованном виде.
    assert total < 100 * 1024 * 1024
    print(f"{OUT.relative_to(ROOT)}: {len(FILES)} файлов, {total / 1024:.0f} КБ без сжатия, {OUT.stat().st_size / 1024:.0f} КБ архив")

if __name__ == "__main__":
    main()
