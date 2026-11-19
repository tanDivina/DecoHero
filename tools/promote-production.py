"""Promote a version code that is already on the internal track to production (full rollout).
Run: cd ~/DecoHero-108 && python3 -I tools/promote-production.py <versionCode> [--commit]
Without --commit it only prints the tracks. Reads the key from ~/.secrets/gsc_key.json at run time."""
import os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

PKG = "com.heroapps.decohero"
VC = sys.argv[1]
COMMIT = "--commit" in sys.argv
NOTES = {
    "en-US": "Christmas mode: take out up to 2 pieces of furniture to make room for the tree, and tick Decorate whole room for garlands, stockings and lights.\nRoom redesigns: take out furniture you don't want before restyling.\nFirst tree move is free.",
    "es-419": "Modo Navidad: quita hasta 2 muebles para hacer espacio al árbol y marca Decorar toda la sala para guirnaldas, calcetines y luces.\nRediseños: quita los muebles que no quieres antes de cambiar el estilo.\nEl primer cambio de lugar del árbol es gratis.",
    "es-ES": "Modo Navidad: quita hasta 2 muebles para hacer sitio al árbol y marca Decorar toda la sala para guirnaldas, calcetines y luces.\nRediseños: quita los muebles que no quieres antes de cambiar el estilo.\nEl primer cambio de sitio del árbol es gratis.",
}
creds = service_account.Credentials.from_service_account_file(
    os.path.expanduser("~/.secrets/gsc_key.json"),
    scopes=["https://www.googleapis.com/auth/androidpublisher"])
e = build("androidpublisher", "v3", credentials=creds, cache_discovery=False).edits()
eid = e.insert(packageName=PKG, body={}).execute()["id"]
for t in ("internal", "production"):
    rs = e.tracks().get(packageName=PKG, editId=eid, track=t).execute().get("releases") or []
    print(t, [(r.get("name"), r.get("versionCodes"), r.get("status")) for r in rs])
if not COMMIT:
    sys.exit(0)
e.tracks().update(packageName=PKG, editId=eid, track="production", body={
    "track": "production",
    "releases": [{"versionCodes": [VC], "status": "completed",
                  "releaseNotes": [{"language": k, "text": v} for k, v in NOTES.items()]}]}).execute()
e.commit(packageName=PKG, editId=eid).execute()
print("production now on versionCode", VC, "(goes live after Play review)")
