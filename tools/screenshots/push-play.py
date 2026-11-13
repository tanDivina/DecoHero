#!/usr/bin/env python3
"""Replaces the DecoHero Play phone screenshots with store/screenshots-v2 (EN + ES).

Touches only phoneScreenshots: no listing text, icon or feature graphic. Commits the edit, so the
change shows under Publishing overview and goes live after Play's review (or when you publish, if
managed publishing is on). Reads the service-account key from ~/.secrets/gsc_key.json at run time.

  python3 tools/screenshots/push-play.py            # dry run: lists listings and current counts
  python3 tools/screenshots/push-play.py --commit   # upload and commit
"""
import os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PKG = "com.heroapps.decohero"
KEY = os.path.expanduser("~/.secrets/gsc_key.json")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "store/screenshots-v2")
FOLDER = lambda lang: "es" if lang.startswith("es") else "en"

commit = "--commit" in sys.argv
creds = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/androidpublisher"])
svc = build("androidpublisher", "v3", credentials=creds)
edits = svc.edits()
eid = edits.insert(packageName=PKG, body={}).execute()["id"]
try:
    langs = [l["language"] for l in edits.listings().list(packageName=PKG, editId=eid).execute().get("listings", [])]
    for lang in langs:
        files = [os.path.join(SHOTS, FOLDER(lang), f"{i:02d}.png") for i in range(1, 8)]
        assert all(os.path.exists(f) for f in files), f"missing files for {lang}"
        now = edits.images().list(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots").execute().get("images", [])
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
