"""Upload the release AAB to the Play internal track (Dorien is the only tester).
Run: cd ~/DecoHero && python3 -I tools/upload-internal.py "release notes"
Reads the service-account key from ~/.secrets/gsc_key.json at run time."""
import os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PKG = "com.heroapps.decohero"
AAB = os.path.expanduser("~/DecoHero/mobile/android/app/build/outputs/bundle/release/app-release.aab")
NOTES = sys.argv[1] if len(sys.argv) > 1 else "Bug fixes and improvements."

creds = service_account.Credentials.from_service_account_file(
    os.path.expanduser("~/.secrets/gsc_key.json"),
    scopes=["https://www.googleapis.com/auth/androidpublisher"])
e = build("androidpublisher", "v3", credentials=creds, cache_discovery=False).edits()
eid = e.insert(packageName=PKG, body={}).execute()["id"]
before = e.tracks().get(packageName=PKG, editId=eid, track="internal").execute().get("releases")
print("internal before:", [(r.get("name"), r.get("versionCodes"), r.get("status")) for r in before or []])
b = e.bundles().upload(packageName=PKG, editId=eid,
                       media_body=MediaFileUpload(AAB, mimetype="application/octet-stream", resumable=True)).execute()
vc = str(b["versionCode"])
print("uploaded versionCode", vc)
e.tracks().update(packageName=PKG, editId=eid, track="internal", body={
    "track": "internal",
    "releases": [{"versionCodes": [vc], "status": "completed",
                  "releaseNotes": [{"language": "en-US", "text": NOTES}]}]}).execute()
e.commit(packageName=PKG, editId=eid).execute()
print("internal track now on versionCode", vc)
