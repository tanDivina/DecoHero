#!/usr/bin/env python3
"""Replaces the DecoHero Play phone screenshots with a screenshot set (EN + ES).

By default touches only phoneScreenshots: no listing text, icon or feature graphic. Commits the edit, so the
change shows under Publishing overview and goes live after Play's review (or when you publish, if
managed publishing is on). Reads the service-account key from ~/.secrets/gsc_key.json at run time.

  python3 tools/screenshots/push-play.py            # dry run: lists listings and current counts
  python3 tools/screenshots/push-play.py --commit   # upload and commit
  --set NAME use store/screenshots-NAME/{en,es}/01.png... (default v2; Play takes 2 to 8 per language).
             With --set the feature graphic is swapped too: store/screenshots-NAME/feature-graphic-{en,es}.png
             if the set has one, else the regular store/feature-graphic-{en,es}.png. So a seasonal swap is
               push-play.py --set xmas --commit     (around Nov 25)
             and the revert, which also puts the regular feature graphic back, is
               push-play.py --set v2 --commit       (around Jan 2)
  --brand    only the icon (store/play-icon-512.png) and feature graphics (store/feature-graphic-<lang>.png,
             made by tools/screenshots/brand.mjs) for every listing; screenshots untouched
  --text     also set the full description of every listing from store/listing.md ("## English" for en-*,
             "## Español" for es-*). Title and short description are left as they are in Play.
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
FOLDER = lambda lang: "es" if lang.startswith("es") else "en"


def arg(name):
    if name not in sys.argv:
        return None
    i = sys.argv.index(name)
    if i + 1 >= len(sys.argv) or sys.argv[i + 1].startswith("--"):
        sys.exit(f"{name} needs a value")
    return sys.argv[i + 1]


SET = arg("--set")
SHOTS = os.path.join(ROOT, f"store/screenshots-{SET or 'v2'}")
if not os.path.isdir(SHOTS):
    sys.exit(f"no screenshot set at {os.path.relpath(SHOTS, ROOT)}")


def set_files(lang):
    folder = os.path.join(SHOTS, FOLDER(lang))
    files = sorted(os.path.join(folder, f) for f in os.listdir(folder) if re.fullmatch(r"\d\d\.png", f)) if os.path.isdir(folder) else []
    if not 2 <= len(files) <= 8:
        sys.exit(f"{os.path.relpath(folder, ROOT)}: {len(files)} screenshots (01.png, 02.png ...), Play needs 2 to 8")
    return files


def set_feature(lang):
    own = os.path.join(SHOTS, f"feature-graphic-{FOLDER(lang)}.png")
    return own if os.path.exists(own) else os.path.join(ROOT, f"store/feature-graphic-{FOLDER(lang)}.png")

commit = "--commit" in sys.argv
add_es = "--add-es" in sys.argv
brand = "--brand" in sys.argv
text = "--text" in sys.argv


def full_description(lang):
    md = open(os.path.join(ROOT, "store/listing.md"), encoding="utf-8").read()
    head, marker = ("## Español", "**Descripción completa:**") if lang.startswith("es") else ("## English", "**Full description:**")
    full = md.split(head, 1)[1].split("\n---", 1)[0].split(marker, 1)[1].strip()
    assert 0 < len(full) <= 4000, len(full)
    assert "\u2014" not in full, "em dash in listing"
    return full


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
    for lang in langs if text else []:
        full = full_description(lang)
        try:
            live = edits.listings().get(packageName=PKG, editId=eid, language=lang).execute().get("fullDescription", "")
        except Exception:
            live = ""  # listing not created yet (dry run with --add-es)
        print(f"{lang}: full description {len(full)}/4000, {'same as Play' if full == live else 'differs from Play'}")
        if commit and full != live:
            edits.listings().patch(packageName=PKG, editId=eid, language=lang, body={"fullDescription": full}).execute()
            print("  full description set")
    for lang in langs if brand else []:
        fg = os.path.join(ROOT, f"store/feature-graphic-{FOLDER(lang)}.png")
        print(f"{lang}: icon play-icon-512.png, feature graphic {os.path.basename(fg)}")
        if commit:
            for kind, f in (("icon", os.path.join(ROOT, "store/play-icon-512.png")), ("featureGraphic", fg)):
                edits.images().deleteall(packageName=PKG, editId=eid, language=lang, imageType=kind).execute()
                edits.images().upload(packageName=PKG, editId=eid, language=lang, imageType=kind,
                                      media_body=MediaFileUpload(f, mimetype="image/png")).execute()
            print("  uploaded")
    for lang in [] if brand else langs:
        files = set_files(lang)
        try:
            now = edits.images().list(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots").execute().get("images", [])
        except Exception:
            now = []  # listing not created yet (dry run)
        print(f"{lang}: {len(now)} now -> {len(files)} from {os.path.relpath(SHOTS, ROOT)}/{FOLDER(lang)}/")
        if SET:
            print(f"  feature graphic -> {os.path.relpath(set_feature(lang), ROOT)}")
        if not commit:
            continue
        edits.images().deleteall(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots").execute()
        for f in files:
            edits.images().upload(packageName=PKG, editId=eid, language=lang, imageType="phoneScreenshots",
                                  media_body=MediaFileUpload(f, mimetype="image/png")).execute()
        print(f"  uploaded {len(files)}")
        if SET:
            edits.images().deleteall(packageName=PKG, editId=eid, language=lang, imageType="featureGraphic").execute()
            edits.images().upload(packageName=PKG, editId=eid, language=lang, imageType="featureGraphic",
                                  media_body=MediaFileUpload(set_feature(lang), mimetype="image/png")).execute()
            print("  feature graphic uploaded")
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
