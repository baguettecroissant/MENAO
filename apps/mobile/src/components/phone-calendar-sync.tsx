import { useEffect } from "react";
import { AppState } from "react-native";
import { syncPhoneCalendar } from "@/lib/phone-calendar";
import { useSession } from "@/lib/session";

/**
 * Synchronisation avec le calendrier du téléphone (ADR 0203) à l'ouverture de l'application et à
 * chaque retour au premier plan, pour un compte artisan qui l'a activée. Rien ne s'affiche.
 */
export function PhoneCalendarSync() {
  const { signedIn, space } = useSession();
  const artisan = signedIn && space === "artisan";

  useEffect(() => {
    if (!artisan) return;
    void syncPhoneCalendar();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncPhoneCalendar();
    });
    return () => subscription.remove();
  }, [artisan]);

  return null;
}
