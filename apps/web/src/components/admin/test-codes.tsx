"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button, Field, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createTestCode, deleteTestAccount, disableTestCode } from "@/lib/admin/test-code-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.settingsPage.testCodes;

export type TestCodeRow = {
  id: string;
  code: string;
  expiresOn: string;
  expired: boolean;
  uses: number;
  max_uses: number;
  disabled: boolean;
  createdBy: string | null;
};
export type TestAccountRow = {
  artisan_id: string;
  nom: string;
  code: string;
  status: string;
  createdOn: string;
};

/**
 * Réglages › Codes d'essai (lot 82, ADR 0392) : créer un code, voir son état, le désactiver ;
 * puis les comptes d'essai, supprimables en un clic.
 */
export function TestCodes({
  codes,
  accounts,
}: {
  codes: TestCodeRow[];
  accounts: TestAccountRow[];
}) {
  const [state, action, pending] = useActionState(createTestCode, initialFormState);
  return (
    <div className="flex flex-col gap-5">
      <form
        key={state.success ?? "form"}
        action={action}
        noValidate
        className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
      >
        <Field
          label={t.code}
          name="code"
          hint={t.codeHint}
          defaultValue={state.values?.code ?? ""}
          autoCapitalize="none"
          spellCheck={false}
        />
        <Field
          label={t.days}
          name="days"
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          defaultValue={state.values?.days ?? "7"}
        />
        <Field
          label={t.uses}
          name="uses"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          defaultValue={state.values?.uses ?? "10"}
        />
        <Button type="submit" size="md" block={false} disabled={pending} className="sm:mb-6">
          <Plus aria-hidden="true" className="size-4" />
          {t.create}
        </Button>
      </form>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[0.9375rem]">
            <thead className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">
              <tr>
                <th className="py-2 font-bold">{t.head.code}</th>
                <th className="py-2 font-bold">{t.head.by}</th>
                <th className="py-2 font-bold">{t.head.used}</th>
                <th className="py-2 font-bold">{t.head.validity}</th>
                <th className="py-2 font-bold">{t.head.state}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const state = c.disabled
                  ? "desactive"
                  : c.expired
                    ? "expire"
                    : c.uses >= c.max_uses
                      ? "epuise"
                      : "actif";
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-3">
                      <span className="inline-flex items-center gap-2">
                        <b className="font-mono text-sm">{c.code}</b>
                        <button
                          type="button"
                          aria-label={c.code}
                          onClick={() => void navigator.clipboard?.writeText(c.code)}
                          className={`rounded-sm text-muted-foreground hover:text-foreground ${focusRing}`}
                        >
                          <Copy aria-hidden="true" className="size-3.5" />
                        </button>
                      </span>
                    </td>
                    <td className="py-3">{c.createdBy ?? "—"}</td>
                    <td className="py-3">{t.usedCount(c.uses, c.max_uses)}</td>
                    <td className="py-3 text-label">
                      {c.expired ? t.expiredOn(c.expiresOn) : t.until(c.expiresOn)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-chip px-2 py-0.5 text-xs font-semibold ${
                          state === "actif"
                            ? "bg-success-soft text-success"
                            : "bg-background text-label"
                        }`}
                      >
                        {t.states[state]}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {state === "actif" && (
                        <form action={disableTestCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            aria-label={t.disableLabel(c.code)}
                            className={`rounded-sm text-sm font-semibold text-danger hover:underline ${focusRing}`}
                          >
                            {t.disable}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-border pt-5">
        <h3 className="text-lg font-bold tracking-tight">{t.accountsTitle}</h3>
        <p className="text-sm text-label">{t.accountsLead}</p>
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noAccounts}</p>
      ) : (
        <ul className="flex flex-col">
          {accounts.map((a) => (
            <li
              key={a.artisan_id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-3 text-[0.9375rem] first:border-t-0"
            >
              <span className="rounded-chip bg-violet-soft px-1.5 py-0.5 text-xs font-bold text-violet">
                {t.badge}
              </span>
              <b className="min-w-0 flex-1">{a.nom}</b>
              <span className="font-mono text-sm text-muted-foreground">{a.code}</span>
              <span>{t.accountStatus[a.status] ?? a.status}</span>
              <span className="text-muted-foreground">{a.createdOn}</span>
              <form
                action={deleteTestAccount}
                onSubmit={(e) => {
                  if (!window.confirm(t.deleteConfirm)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={a.artisan_id} />
                <button
                  type="submit"
                  aria-label={t.deleteLabel(a.nom)}
                  className={`inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-danger hover:underline ${focusRing}`}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  {t.delete}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
