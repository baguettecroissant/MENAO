#!/usr/bin/env bash
# CI sur le Mac de développement (ADR 0053) : la CI utilise son propre Supabase (projet
# « menao-ci », ports 553xx au lieu de 543xx) et l'application sur le port $E2E_PORT, pour ne
# jamais toucher l'instance ni le serveur de développement du poste. Ne modifie que la copie de
# travail de la CI (supabase/config.toml), jamais le dépôt.
set -euo pipefail

port="${E2E_PORT:-3100}"
config="supabase/config.toml"

sed -i.bak -E \
  -e 's/^project_id = "menao"$/project_id = "menao-ci"/' \
  -e 's/^(port|shadow_port) = 543([0-9]{2})$/\1 = 553\2/' \
  -e 's/^inspector_port = 8083$/inspector_port = 8093/' \
  -e "s#(localhost|127\\.0\\.0\\.1):3000#\\1:${port}#g" \
  "$config"
rm -f "$config.bak"

# Contrôle : aucune trace de l'instance du poste ne doit subsister.
if grep -Eq '^project_id = "menao"$|^(port|shadow_port) = 543|:3000' "$config"; then
  echo "isoler-supabase : configuration non isolée" >&2
  exit 1
fi
grep -E '^(project_id|port|shadow_port|inspector_port|site_url|additional_redirect_urls)' "$config"
