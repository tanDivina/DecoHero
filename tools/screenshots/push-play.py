#!/usr/bin/env python3
"""Replaces the DecoHero Play phone screenshots with store/screenshots-v2 (EN + ES).

Touches only phoneScreenshots: no listing text, icon or feature graphic. Commits the edit, so the
change shows under Publishing overview and goes live after Play's review (or when you publish, if
managed publishing is on). Reads the service-account key from ~/.secrets/gsc_key.json at run time.

  python3 tools/screenshots/push-play.py            # dry run: lists listings and current counts
  python3 tools/screenshots/push-play.py --commit   # upload and commit
  --add-es   also create/update the es-419 listing (text from store/listing.md "## Español",
             feature graphic store/feature-graphic-es.png)
"""
import os, re, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PKG = "com.heroapps.decohero"
KEY = os.path.expanduser("~/.secrets/gsc_key.json")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "store/screenshots-v2")
FOLDER = lambda lang: "es" if lang.startswith("es") else "en"

commit = "--commit" in sys.argv
add_es = "--add-es" in sys.argv


def spanish_listing():
    md = open(os.path.join(ROOT, "store/listing.md"), encoding="utf-8").read()
    es = md.split("## Español", 1)[1].split("\n---", 1)[0]
    title = re.search(r"\*\*Nombre\*\*.*?`([^`]+)`", es).group(1)
    short = re.search(r"\*\*Descripción breve\*\*.*?`([^`]+)`", es, re.S).group(1)
    full = es.split("**Descripción completa:**", 1)[1].strip()
    assert len(title) <= 30 and len(short) <= 80 and len(full) <= 4000, (len(title), len(short), len(full))
    assert "\u2014" not in title + short + full, "em dash in listing"
    return {"title": title, "shortDescription": short, "fullDescription": full}
creds = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/androidpublisher"])
svc = build("androidpublisher", "v3", credentials=creds)
edits = svc.edits()
eid = edits.insert(packageName=PKG, body={}).execute()["id"]
try:
    langs = [l["language"] for l in edits.listings().list(packageName=PKG, editId=eid).execute().get("listings", [])]
    if add_es:
        body = spanish_listing()
        print(f"es-419 listing: title {len(body['title'])}/30, short {len(body['shortDescription'])}/80, full {len(body['fullDescription'])}/4000")
        print("  " + body["title"] + " | " + body["shortDescription"])
        if commit:
            edits.listings().update(packageName=PKG, editId=eid, language="es-419", body=body).execute()
            edits.images().deleteall(packageName=PKG, editId=eid, language="es-419", imageType="featureGraphic").execute()
            edits.images().upload(packageName=PKG, editId=eid, language="es-419", imageType="featureGraphic",
                                  media_body=MediaFileUpload(os.path.join(ROOT, "store/feature-graphic-es.png"), mimetype="image/png")).execute()
            print("  es-419 text + feature graphic set")
        if "es-419" not in langs:
            langs.append("es-419")
    for lang in langs:
        files = [os.path.join(SHOTS, FOLDER(lang), f"{i:02d}.png") for i in range(1, 8)]
        assert all(os.path.exists(f) for f in files), f"missing files for {lang}"
        try:
            now = edits.images().list(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots").execute().get("images", [])
        except Exception:
            now = []  # listing not created yet (dry run)
        print(f"{lang}: {len(now)} now -> 7 from {FOLDER(lang)}/")
        if not commit:
            continue
        edits.images().deleteall(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots").execute()
        for f in files:
            edits.images().upload(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots",
                                  media_body=MediaFileUpload(f, mimetype="image/png")).execute()
        print(f"  uploaded 7")
    if commit:
        edits.commit(packageName=PKG, editId=eid).execute()
        print("committed")
    else:
        edits.delete(packageName=PKG, editId=eid).execute()
        print("dry run, nothing changed (add --commit)")
except Exception:
    try: edits.delete(packageName=PKG, editId=eid).execute()
    except Exception: pass
    raise
