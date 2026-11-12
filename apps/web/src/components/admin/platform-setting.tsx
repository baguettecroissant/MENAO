import { Button, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { setPlatformSetting } from "@/lib/admin/settings-actions";

const t = fr.admin.settings;

/** Notes des clients visibles des artisans (F-23) : décision [À VALIDER], activée par un admin. */
export function ClientRatingsSetting({ visible }: { visible: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-input border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1">
        <p className="font-medium">
          {t.clientRatingsVisible}{" "}
          <StatusBadge tone={visible ? "success" : "neutral"}>{visible ? t.on : t.off}</StatusBadge>
        </p>
        <p className="text-sm text-muted-foreground">{t.clientRatingsVisibleHelp}</p>
      </div>
      <form action={setPlatformSetting}>
        <input type="hidden" name="key" value="client_ratings_visible" />
        <input type="hidden" name="value" value={visible ? "false" : "true"} />
        <Button type="submit" variant="secondary" block={false}>
          {visible ? t.disable : t.enable}
        </Button>
      </form>
    </div>
  );
}
