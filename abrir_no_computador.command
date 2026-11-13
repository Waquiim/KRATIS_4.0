#!/bin/bash
# Abre o painel KRATIS 4.0 neste computador (duplo clique no macOS).
cd "$(dirname "$0")" || exit 1
PORTA=8765
( sleep 1; open "http://localhost:$PORTA" ) &
exec python3 ferramentas/servidor_local.py "$PORTA"
