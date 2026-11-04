// SPDX-FileCopyrightText: JR Lanteigne <root@dnim.dev>
// SPDX-FileCopyrightText: Shiroki Satsuki <me@shirok1.dev>
// SPDX-License-Identifier: GPL-3.0-or-later
// Shown when a keyboard is present but its device node cannot be opened.
// On Linux that is almost always a missing udev rule, and without saying so
// the app just looks broken: the board is plugged in, nothing happens.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  requestInputMonitoring,
  openInputMonitoringSettings,
  revealCurrentApp,
  type InputMonitoringStatus,
} from "@/lib/backend";

// Keep in step with `packaging/70-open-akko.rules`. Rules match specific
// vendor:product pairs from the registry to avoid granting broad access.
// One paste: write the rules, reload, apply. Uses a heredoc to keep the
// complete rule set visible. Continued across lines for readability.
const UDEV_ONELINER = `cat << 'EORULES' | sudo tee /etc/udev/rules.d/70-open-akko.rules >/dev/null
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0461", ATTRS{idProduct}=="4002|4003", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="046a", ATTRS{idProduct}=="012d|0141", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="05ac", ATTRS{idProduct}=="024f", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0db0", ATTRS{idProduct}=="32c0|ebbe", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="145f", ATTRS{idProduct}=="0379|038d|038e|03b3|03b4", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="14a5", ATTRS{idProduct}=="c046", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="2ea8", ATTRS{idProduct}=="2124", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3121", ATTRS{idProduct}=="5056", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3151", ATTRS{idProduct}=="4002|4003|4007|4010|4015|4018|4035|5002|5009|5025|5029|502c|502d|502e|502f|5030|5033|5041|504c|504f|5054|5056|5068|506a|506c|5074", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3299", ATTRS{idProduct}=="273f", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="331a", ATTRS{idProduct}=="3010", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="374a", ATTRS{idProduct}=="a213|a216|a219|a225|a228|a232|a233|a236|a242|a250|a260|a262|a264|a267|a270", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="379a", ATTRS{idProduct}=="1803|1805|1806|3626|a011", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="38a9", ATTRS{idProduct}=="0006|0015|0017|0024|9016", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="38ee", ATTRS{idProduct}=="0001|0003|0005|0009|000a|0016|0040|0049", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="391d", ATTRS{idProduct}=="2001|200d|200f|2017", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3984", ATTRS{idProduct}=="03e8|03e9|03ea", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="39a8", ATTRS{idProduct}=="9016", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="39ab", ATTRS{idProduct}=="9005|9007|9008|9013|9016", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="54ab", ATTRS{idProduct}=="d022", MODE="0660", TAG+="uaccess"
EORULES
sudo udevadm control --reload-rules && sudo udevadm trigger`;

const isLinux = () =>
  navigator.userAgent.includes("Linux") && !navigator.userAgent.includes("Android");

export default function PermissionNotice({ inputMonitoring, onRefresh }: {
  inputMonitoring: InputMonitoringStatus | null;
  onRefresh: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = async (action: () => Promise<void>) => {
    setRequesting(true);
    setError(null);
    try {
      await action();
      await onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setRequesting(false);
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(UDEV_ONELINER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto rounded-xl bg-card px-4 py-3 shadow-lg ring-1 ring-foreground/10">
        <div className="flex max-w-xl flex-col gap-2 text-sm">
          <p className="font-medium">{t("The keyboard is there, but sharkfin can't open it.")}</p>
          {inputMonitoring === "unknown" || inputMonitoring === "denied" ? (
            <>
              <p className="text-muted-foreground">
                {t("macOS needs Input Monitoring permission to connect to this keyboard. Enable sharkfin in System Settings → Privacy & Security → Input Monitoring, then quit and reopen sharkfin.")}
              </p>
              <div className="flex flex-wrap gap-2">
                {inputMonitoring === "unknown" && (
                  <Button size="sm" disabled={requesting} onClick={() => runAction(requestInputMonitoring)}>
                    {t("Request input access")}
                  </Button>
                )}
                <Button size="sm" variant={inputMonitoring === "denied" ? "default" : "outline"} disabled={requesting} onClick={() => runAction(openInputMonitoringSettings)}>
                  {t("Open Input Monitoring")}
                </Button>
                <Button size="sm" variant="outline" disabled={requesting} onClick={() => runAction(revealCurrentApp)}>
                  {t("Show sharkfin in Finder")}
                </Button>
              </div>
              <p className="text-muted-foreground">
                {t("If sharkfin is missing from the list, use the + button in Input Monitoring to add the app shown in Finder.")}
              </p>
              {error && <p role="alert" className="text-destructive">{error}</p>}
            </>
          ) : isLinux() ? (
            <>
              <p className="text-muted-foreground">
                {t("On Linux the keyboard's device node belongs to root until a udev rule hands it to you. Paste this into a terminal, then unplug the keyboard and plug it back in:")}
              </p>
              <pre className="whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed">
                {UDEV_ONELINER}
              </pre>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> {t("Copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" /> {t("Copy the command")}
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t("It writes one rule file and reloads udev. Nothing else.")}
                </span>
              </div>
            </>
          ) : (
            <>
              {inputMonitoring === "granted" && (
                <p className="text-muted-foreground">
                  {t("Input Monitoring is enabled. If you just enabled it, quit and reopen sharkfin.")}
                </p>
              )}
              <p className="text-muted-foreground">
                {t("Another app may be holding the keyboard open. Close other keyboard software, then unplug the keyboard and plug it back in.")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
