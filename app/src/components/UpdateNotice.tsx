// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { ArrowDownToLine, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { BUILD } from "@/lib/backend";
import { updateApi } from "@/lib/update-backend";
import { INITIAL_UPDATE, UpdateSession } from "@/lib/update-session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function UpdateNotice() {
  const [state, setState] = useState(INITIAL_UPDATE);
  const [session] = useState(() => { let storage: Storage | undefined; try { storage = localStorage; } catch { /* Optional preferences. */ } return new UpdateSession(updateApi, setState, storage); });
  useEffect(() => {
    if (BUILD !== "app") return;
    let disposed = false, lastCheck = 0;
    const check = () => { if (!disposed) { lastCheck = Date.now(); void session.check(); } };
    const first = setTimeout(check, 8000);
    const periodic = setInterval(check, 4 * 60 * 60 * 1000);
    const focus = () => { if (lastCheck && Date.now() - lastCheck > 60 * 60 * 1000) check(); };
    window.addEventListener("focus", focus);
    void session.initialize();
    return () => { disposed = true; clearTimeout(first); clearInterval(periodic); window.removeEventListener("focus", focus); };
  }, [session]);
  if (BUILD !== "app") return null;
  const installing = state.phase === "downloading" || state.phase === "installing";
  const busy = installing || state.phase === "checking";
  const percent = state.progress?.total ? Math.min(100, Math.round(100 * state.progress.downloaded / state.progress.total)) : null;
  const title = state.available ? "Une mise à jour est disponible" : state.phase === "checking" ? "Recherche de mises à jour" : state.error ? "Vérification impossible" : "Votre logiciel est à jour";
  return <>
    <Button id="check-updates" variant="ghost" size="sm" className="h-auto w-full justify-start whitespace-normal px-1 py-2 text-left text-xs" disabled={busy} onClick={() => state.available ? session.show() : void session.check(true)}>
      {busy ? <LoaderCircle className="size-3.5 shrink-0 animate-spin" /> : state.available ? <ArrowDownToLine className="size-3.5 shrink-0 text-primary" /> : <RefreshCw className="size-3.5 shrink-0" />}
      <span>{state.available ? `Version ${state.available.version} disponible` : "Rechercher une mise à jour"}{state.currentVersion && <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Akko Studio {state.currentVersion}</span>}</span>
    </Button>
    <Dialog open={state.open} onOpenChange={open => { if (!open && !busy) session.dismiss(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onInteractOutside={e => { if (busy) e.preventDefault(); }}>
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{busy ? <LoaderCircle className="size-5 animate-spin" /> : state.available ? <ArrowDownToLine className="size-5" /> : <Check className="size-5" />}</span>
          <DialogTitle>{installing ? "Mise à jour d’Akko Studio" : title}</DialogTitle>
          <DialogDescription>{state.available ? `${state.currentVersion} → ${state.available.version}` : `Version installée : ${state.currentVersion || "…"}`}</DialogDescription>
        </DialogHeader>
        {state.available && <>
          {state.available.notes && <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">{state.available.notes}</div>}
          <p className="text-sm text-muted-foreground">{state.installKind === "manual" ? "Cette installation se met à jour depuis la page de téléchargement. Installez la version .exe sous Windows ou l’AppImage sous Linux pour bénéficier ensuite des mises à jour intégrées." : "Akko Studio redémarrera après l’installation. L’écoute audio sera arrêtée et votre éclairage habituel sera rétabli."}</p>
        </>}
        {installing && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-sm"><span>{state.phase === "installing" ? "Installation et redémarrage…" : "Téléchargement et vérification…"}</span>{percent !== null && state.phase === "downloading" && <span>{percent} %</span>}</div><div role="progressbar" aria-label="Mise à jour" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${state.phase === "installing" ? 100 : percent ?? 10}%` }} /></div></div>}
        {state.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => session.dismiss()}>{state.available ? "Plus tard" : "Fermer"}</Button>
          {state.available && <Button id="install-update" disabled={busy} onClick={() => void session.install()}>{busy && <LoaderCircle className="size-4 animate-spin" />}{state.installKind === "manual" ? "Télécharger la version" : "Mettre à jour et redémarrer"}</Button>}
          {!state.available && state.error && <Button disabled={busy} onClick={() => void session.check(true)}>Réessayer</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
