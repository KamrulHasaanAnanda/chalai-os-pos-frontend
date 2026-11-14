"use client";
// Logout that makes the user end their work session first. With no session open it logs out straight away.
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { logout } from "@/actions/auth";
import { EndSessionDialog } from "@/components/session-bar";
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
  const form = useRef<HTMLFormElement>(null);
  const ended = useRef(false);
  const open = session !== null && session !== "pending";

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
          onConfirm={() => {
            endWorkSession(userId);
            setAsking(false);
            // The session is ended, so let this submit go through to the logout action.
            ended.current = true;
            form.current?.requestSubmit();
          }}
        />
      )}
    </>
  );
}
