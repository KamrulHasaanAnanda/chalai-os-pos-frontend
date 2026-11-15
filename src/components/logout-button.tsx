"use client";
// Logout that makes the user end their work session first, then shows its report. With no session open it logs out
// straight away.
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { logout } from "@/actions/auth";
import { EndSessionDialog, ShiftReportDialog } from "@/components/session-bar";
import type { ShiftReport } from "@/lib/api/types";
import {
  endWorkSession,
  useSessionMinutes,
  useWorkSession,
} from "@/lib/work-session";

export function LogoutButton({
  userId,
  className,
  formClassName,
  children,
}: {
  userId: string;
  formClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const tSession = useTranslations("session");
  const session = useWorkSession(userId);
  const minutes = useSessionMinutes(session);
  const [asking, setAsking] = useState(false);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const ended = useRef(false);
  const open = session !== null && session !== "pending";

  const logOutNow = () => {
    ended.current = true;
    form.current?.requestSubmit();
  };

  return (
    <>
      <form
        ref={form}
        className={formClassName}
        action={logout}
        onSubmit={(ev) => {
          if (open && !ended.current) {
            ev.preventDefault();
            setAsking(true);
          }
        }}
      >
        <button
          type="submit"
          aria-label={t("logout")}
          title={t("logout")}
          className={className}
        >
          {children}
        </button>
      </form>
      {open && (
        <EndSessionDialog
          open={asking}
          session={session}
          minutes={minutes}
          title={tSession("logoutTitle")}
          body={tSession("logoutBody")}
          confirm={tSession("endAndLogout")}
          onCancel={() => setAsking(false)}
          onConfirm={async (counted) => {
            const result = await endWorkSession(userId, counted);
            if ("error" in result && result.error !== "no_open_shift") return result.error;
            setAsking(false);
            // Show the report first; closing it logs out. Ended elsewhere already: just log out.
            if ("report" in result) setReport(result.report);
            else logOutNow();
            return null;
          }}
        />
      )}
      <ShiftReportDialog
        report={report}
        closeLabel={t("logout")}
        onClose={() => {
          setReport(null);
          logOutNow();
        }}
      />
    </>
  );
}
