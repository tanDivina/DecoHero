// Web only: who is signed in, Sign out, and Delete account with a confirm step inside the page.
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api, pauseApiForDelete, resumeApi } from "../api";
import { deleteCurrentUser, reauthenticate, signOutUser, type Account } from "../auth";
import { t } from "../i18n";
import { color, radius, space } from "../theme";
import { Button } from "./Button";

type Step = "idle" | "confirm";

/** Read once by the sign-in screen after the reload that ends a delete. */
export const DELETED_FLASH_KEY = "decohero_deleted";

export function AccountCard({ account, onNotice }: { account: Account | null; onNotice: (msg: string) => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    // 1. Google confirms it is the same person. First thing after the click, or the popup is blocked.
    //    Firebase refuses to delete a sign-in without it, so it comes before anything is deleted.
    const confirmed = await reauthenticate();
    if (confirmed !== "ok") {
      setBusy(false);
      return onNotice(t.deleteNotConfirmed);
    }
    // 2. Stop balance refreshes and purchase polling, and let requests already sent finish:
    //    a late GET /api/me would re-create the account.
    await pauseApiForDelete();
    // 3. Server side: credits, design log, reports.
    try {
      await api.deleteAccount("");
    } catch {
      resumeApi();
      setBusy(false);
      return onNotice(t.deleteFailed);
    }
    // 4. The Google sign-in itself. If that fails the data is still gone, so sign out either way.
    const removed = await deleteCurrentUser();
    try {
      sessionStorage.setItem(DELETED_FLASH_KEY, removed ? "all" : "data");
    } catch {}
    // 5. Sign out and reload; the sign-in screen shows what happened.
    await signOutUser().catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.links}>
        <Pressable onPress={() => Linking.openURL(`${window.location.origin}/privacy`).catch(() => {})} style={styles.target} accessibilityRole="link">
          <Text style={styles.link}>{t.privacyPolicy}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${window.location.origin}/terms`).catch(() => {})} style={styles.target} accessibilityRole="link">
          <Text style={styles.link}>{t.terms}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.accountLabel}</Text>
        {!!account?.email && <Text style={styles.email} selectable>{t.signedInAs(account.email)}</Text>}
        <Text style={styles.help}>{t.creditsStayWeb}</Text>

        {step === "idle" && (
          <>
            <Button label={t.signOut} variant="quiet" onPress={() => signOutUser().catch(() => {})} />
            <Pressable onPress={() => setStep("confirm")} style={styles.target} accessibilityRole="button">
              <Text style={styles.dangerLink}>{t.deleteAccount}</Text>
            </Pressable>
          </>
        )}

        {step === "confirm" && (
          <View style={styles.confirm} accessibilityRole="alert">
            <Text style={styles.confirmTitle}>{t.deleteConfirmTitle}</Text>
            <Text style={styles.text}>{t.deleteConfirmBody}</Text>
            <Pressable
              onPress={deleteAccount}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.dangerButton, (pressed || busy) && { opacity: 0.7 }]}
            >
              <Text style={styles.dangerButtonText}>{t.deleteConfirmYes}</Text>
            </Pressable>
            <Button label={t.cancel} variant="quiet" onPress={() => setStep("idle")} disabled={busy} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(2) },
  links: { flexDirection: "row", gap: space(6) },
  target: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: color.olive, fontWeight: "600", fontSize: 16 },
  card: {
    backgroundColor: color.plaster,
    borderRadius: 6,
    padding: space(5),
    gap: space(3),
    borderWidth: 1.5,
    borderColor: color.line,
  },
  label: { fontSize: 14, fontWeight: "700", color: color.stone },
  email: { fontSize: 15, color: color.ink },
  help: { fontSize: 14, lineHeight: 20, color: color.stone },
  text: { fontSize: 15, lineHeight: 22, color: color.ink },
  dangerLink: { color: color.danger, fontSize: 15, textDecorationLine: "underline" },
  confirm: { gap: space(3), paddingTop: space(3), borderTopWidth: 1.5, borderTopColor: color.line },
  confirmTitle: { fontSize: 17, fontWeight: "700", color: color.ink },
  dangerButton: {
    minHeight: 52,
    paddingHorizontal: space(6),
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.danger,
  },
  dangerButtonText: { color: color.white, fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
});
