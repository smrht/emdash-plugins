#!/bin/bash
# Checkt of publish-check openbaar in de EmDash-registry staat; meldt dat 1x via Telegram en haalt dan de cron weg.
cd /home/agent/emdash-plugins/packages/publish-check || exit 1
J=$(corepack pnpm exec emdash-plugin info emdashplugins.bsky.social publish-check --version 0.2.0 --json 2>/dev/null)
echo "$(date -Is) $(echo "$J" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("public"),d.get("release",{}).get("state"))' 2>/dev/null)" >> /home/agent/emdash-plugins/scripts/watch-registry.log
PUB=$(echo "$J" | python3 -c 'import json,sys;d=json.load(sys.stdin);print("1" if d.get("public") else "0")' 2>/dev/null)
STATE=$(echo "$J" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("release",{}).get("state",""))' 2>/dev/null)
if [ "$PUB" = "1" ] || [ "$STATE" = "rejected" ] || [ "$STATE" = "blocked" ]; then
  python3 - "$PUB" "$STATE" <<'P'
import sys,urllib.request,urllib.parse
sys.path.insert(0,'/home/agent/sites-beheer/scripts/alerting')
import gsc_sweep_telegram as g
tok,chat=g.load_credentials()
msg=("Publish Check staat nu openbaar in de EmDash-registry: https://plugins.emdashcms.com/plugins/@emdashplugins.bsky.social/publish-check"
     if sys.argv[1]=="1" else f"Publish Check registry-review: status {sys.argv[2]}. Zie emdash-plugin info.")
g.send_message(tok,chat,msg)
P
  crontab -l | grep -v watch-registry.sh | crontab -
fi
