#!/usr/bin/env python3
"""Servidor local do painel KRATIS 4.0 (apenas biblioteca padrão).

Uso:  python3 ferramentas/servidor_local.py [porta]
Abra http://localhost:8765 no navegador.
"""
import functools
import http.server
import pathlib
import sys

RAIZ = str(pathlib.Path(__file__).resolve().parent.parent)


class Manipulador(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # sempre a versão mais recente durante o uso local
        super().end_headers()


def principal():
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    manipulador = functools.partial(Manipulador, directory=RAIZ)
    with http.server.ThreadingHTTPServer(("127.0.0.1", porta), manipulador) as servidor:
        print(f"KRATIS 4.0 em http://localhost:{porta}  (Ctrl+C para encerrar)")
        servidor.serve_forever()


if __name__ == "__main__":
    principal()
