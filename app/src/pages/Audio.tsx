// SPDX-License-Identifier: GPL-3.0-or-later
import { AudioLines, Mic, Monitor, RefreshCw, SlidersHorizontal } from "lucide-react";
import { PageHeader, Section, Banner } from "@/components/Page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ConnectedDevice, BUILD } from "@/lib/backend";
import { type AudioTrack } from "@/lib/audio-backend";
import { audioProfile } from "@/lib/keyboard-profile";
import { useAudio } from "@/components/AudioProvider";
import { cn } from "@/lib/utils";

export default function AudioPage({ device }: { device: ConnectedDevice | null }) {
  const audio = useAudio();
  const { config, status, busy, sources } = audio;
  const profile = audioProfile(device);
  const columns = profile?.columns ?? [];
  const microphoneColumns = profile?.microphoneColumns ?? [];
  const supported = BUILD === "app" && !!profile;
  const color = "#" + config.color.map(v => v.toString(16).padStart(2, "0")).join("");
  const update = (key: "output" | "microphone", patch: Partial<AudioTrack>, commit = false) => audio.change({ ...config, [key]: { ...config[key], ...patch } }, commit);
  const tracks = [
    { key: "output", kind: "system", icon: Monitor, title: "Sortie audio", subtitle: "Musique, jeux et vidéos", meter: status.output },
    { key: "microphone", kind: "microphone", icon: Mic, title: "Entrée microphone", subtitle: "Votre voix sur sa zone dédiée", meter: status.microphone },
  ] as const;
  return <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
    <PageHeader title="Audio et microphone" hint="Le son du PC sur le clavier, votre voix sur la zone microphone.">
      <div className={cn("flex items-center gap-3 rounded-xl px-4 py-2.5", status.running ? "bg-primary/10" : "bg-muted/60")}>
        <AudioLines className="size-4 text-primary" />
        <Label htmlFor="audio-mode" className="cursor-pointer">Mode audio</Label>
        <Switch id="audio-mode" checked={status.running} disabled={busy || !supported} onCheckedChange={value => void audio.setMode(value)} />
        {busy && <span className="text-xs text-muted-foreground">Application…</span>}
      </div>
    </PageHeader>
    {!supported && <Banner>{device && device.link === "usb" ? "Le mode audio n’a pas encore été validé pour ce modèle de clavier." : "Branchez un clavier compatible en USB pour activer le mode audio."}</Banner>}
    {audio.sourceError && <Banner>{audio.sourceError}</Banner>}
    <div className="rounded-2xl bg-muted/40 px-5 py-5">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><Monitor className="size-3.5" />{config.microphone.enabled ? "Zone principale · sortie audio" : "Tout le clavier · sortie audio"}</span>
        {config.microphone.enabled && <span className="flex items-center gap-2 text-foreground"><Mic className="size-3.5" />Zone micro</span>}
      </div>
      <div aria-label="Niveaux audio envoyés au clavier" role="img" className="flex h-24 items-end gap-1.5">
        {columns.map((wireColumn, column) => <div key={column} className={cn("flex h-full flex-1 flex-col-reverse gap-1", microphoneColumns.includes(wireColumn) && config.microphone.enabled && "ml-4")}>
          {Array.from({ length: 6 }, (_, row) => <div key={row} className={cn("min-h-0 flex-1 rounded-sm", row < (status.bands[wireColumn] ?? 0) ? "opacity-100" : "opacity-10")} style={{ background: config.rainbow ? `hsl(${190 + column * 12} 85% 60%)` : color }} />)}
        </div>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{status.running ? "Le mode reste actif pendant la navigation et lorsque la fenêtre est réduite." : "Préparez les deux sources, puis activez le mode audio. Vos effets habituels restent disponibles en mode Effets."}</p>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {tracks.map(({ key, kind, icon: Icon, title, subtitle, meter }) => {
        const track = config[key];
        const trackSources = sources.filter(s => s.kind === kind);
        const state = !track.enabled ? "Désactivé" : !status.running ? "Prêt" : meter.error ? "Source indisponible" : meter.ready ? "En direct" : "Connexion…";
        return <Card key={key} className={cn("gap-5 shadow-none ring-1", track.enabled ? "ring-primary/25" : "ring-foreground/10")}>
          <CardHeader className="grid-cols-[1fr_auto] items-center">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></span><div><CardTitle>{title}</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div></div>
            <Switch aria-label={`Activer ${title.toLowerCase()}`} checked={track.enabled} disabled={busy} onCheckedChange={enabled => update(key, { enabled }, true)} />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><span className={cn("size-1.5 rounded-full", status.running && meter.ready && track.enabled ? "bg-primary" : "bg-muted-foreground/35")} />{state}</span><span className="tabular-nums text-muted-foreground">{Math.round(meter.level * 100)} %</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${meter.level * 100}%` }} /></div>
            <div className="space-y-2"><Label htmlFor={`${key}-source`}>{key === "output" ? "Casque ou enceintes" : "Microphone à utiliser"}</Label>
              <div className="flex min-w-0 gap-2"><Select disabled={busy} value={track.sourceId || undefined} onValueChange={sourceId => update(key, { sourceId }, true)}><SelectTrigger id={`${key}-source`} className="min-w-0 flex-1" aria-label={`Source ${title.toLowerCase()}`}><SelectValue placeholder="Choisir une source" /></SelectTrigger><SelectContent>{trackSources.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon" disabled={busy} aria-label={`Actualiser ${title.toLowerCase()}`} onClick={() => void audio.refresh()}><RefreshCw className="size-4" /></Button></div>
              {!trackSources.length && <p className="text-xs text-muted-foreground">Aucun périphérique disponible. Vérifiez les réglages audio du système.</p>}
            </div>
            {meter.error && <Banner>{meter.error}</Banner>}
            {key === "output" ? <div className="space-y-2"><Label>Animation de la sortie</Label><div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">{([['spectrum', 'Égaliseur'], ['volume', 'Volume'], ['bass', 'Basses']] as const).map(([value, text]) => <Button key={value} size="sm" disabled={busy} variant={track.effect === value ? "secondary" : "ghost"} className="px-1 text-xs" onClick={() => update(key, { effect: value }, true)}>{text}</Button>)}</div></div>
              : <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-medium">Zone réservée au micro</p><div className="mt-2 flex flex-wrap gap-1">{(profile?.microphoneKeys ?? []).map(label => <span key={label} className="rounded-md bg-background px-2 py-1 text-[11px] text-muted-foreground shadow-xs">{label}</span>)}</div></div>}
            <div className="space-y-3"><div className="flex justify-between"><Label htmlFor={`${key}-gain`}>Sensibilité</Label><span className="text-xs tabular-nums text-muted-foreground">×{track.gain.toFixed(2)}</span></div><Slider id={`${key}-gain`} disabled={busy} min={0.25} max={8} step={0.25} value={[track.gain]} onValueChange={([gain]) => update(key, { gain })} onValueCommit={([gain]) => update(key, { gain }, true)} /></div>
            <div className="space-y-3"><div className="flex justify-between"><Label htmlFor={`${key}-release`}>Extinction</Label><span className="text-xs tabular-nums text-muted-foreground">{track.releaseMs} ms</span></div><Slider id={`${key}-release`} disabled={busy} min={20} max={600} step={10} value={[track.releaseMs]} onValueChange={([releaseMs]) => update(key, { releaseMs })} onValueCommit={([releaseMs]) => update(key, { releaseMs }, true)} /><div className="flex gap-2">{([['Vif', 40], ['Naturel', 100], ['Doux', 250]] as const).map(([label, releaseMs]) => <Button key={label} variant="ghost" size="xs" disabled={busy} onClick={() => update(key, { releaseMs }, true)}>{label}</Button>)}</div></div>
            <details className="group"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" />Seuil de silence <span className="ml-auto tabular-nums">{track.floorDb} dB</span></summary><div className="mt-4 space-y-3"><Slider aria-label={`Seuil de silence ${title.toLowerCase()}`} disabled={busy} min={-80} max={-15} step={1} value={[track.floorDb]} onValueChange={([floorDb]) => update(key, { floorDb })} onValueCommit={([floorDb]) => update(key, { floorDb }, true)} /><p className="text-xs text-muted-foreground">Augmentez le seuil pour ignorer le souffle et les bruits faibles.</p></div></details>
          </CardContent>
        </Card>;
      })}
    </div>
    <Section title="Style lumineux commun" hint={status.running ? "Revenez au mode Effets pour modifier les couleurs ou la luminosité. Les deux sources partagent le style du clavier." : "Les deux zones partagent les couleurs et la luminosité du clavier."}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-xl bg-muted/40 p-4">
        <div className="flex items-center gap-3"><Switch id="audio-rainbow" disabled={busy || status.running} checked={config.rainbow} onCheckedChange={rainbow => audio.change({ ...config, rainbow })} /><Label htmlFor="audio-rainbow">Arc-en-ciel</Label></div>
        {!config.rainbow && <div className="flex items-center gap-3"><Label htmlFor="audio-color">Couleur</Label><Input id="audio-color" type="color" className="h-9 w-14 p-1" disabled={busy || status.running} value={color} onChange={e => { const value = parseInt(e.target.value.slice(1), 16); audio.change({ ...config, color: [(value >> 16) & 255, (value >> 8) & 255, value & 255] }); }} /></div>}
        <div className="flex min-w-56 flex-1 items-center gap-4"><Label htmlFor="audio-brightness">Luminosité</Label><Slider id="audio-brightness" className="max-w-48" disabled={busy || status.running} min={0} max={4} step={1} value={[config.brightness]} onValueChange={([brightness]) => audio.change({ ...config, brightness })} /><span className="text-xs text-muted-foreground">{config.brightness}/4</span></div>
      </div>
    </Section>
    <p className="text-xs text-muted-foreground">Analyse locale, sans enregistrement sonore. Le mode Effets et la fermeture de la fenêtre rétablissent votre éclairage précédent.</p>
  </div>;
}
