// SPDX-FileCopyrightText: JR Lanteigne <root@dnim.dev>
// SPDX-License-Identifier: GPL-3.0-or-later
// Error notice for device connection problems with platform-specific guidance.

import { useState } from "react";
import { Check, Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  requestInputMonitoring,
  openInputMonitoringSettings,
  revealCurrentApp,
  type InputMonitoringStatus,
  type DeviceErrorKind,
} from "@/lib/backend";

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

const isWindows = () => navigator.userAgent.includes("Windows");

export default function DeviceErrorNotice({
  error,
  inputMonitoring,
  onRetry,
}: {
  error: DeviceErrorKind;
  inputMonitoring: InputMonitoringStatus | null;
  onRetry: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (error.kind === "none") {
    return null;
  }

  const runAction = async (action: () => Promise<void>) => {
    setRequesting(true);
    setActionError(null);
    try {
      await action();
      await onRetry();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setRequesting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setActionError(null);
    try {
      await onRetry();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setRetrying(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(UDEV_ONELINER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderAccessDenied = () => {
    if (inputMonitoring === "unknown" || inputMonitoring === "denied") {
      return (
        <>
          <p className="font-medium">{t("Device access denied")}</p>
          <p className="text-sm text-muted-foreground">
            {t("macOS needs Input Monitoring permission to access this keyboard.")}
          </p>
          <div className="flex flex-wrap gap-2">
            {inputMonitoring === "unknown" && (
              <Button size="sm" disabled={requesting} onClick={() => runAction(requestInputMonitoring)}>
                {t("Request permission")}
              </Button>
            )}
            <Button
              size="sm"
              variant={inputMonitoring === "denied" ? "default" : "outline"}
              disabled={requesting}
              onClick={() => runAction(openInputMonitoringSettings)}
            >
              {t("Open System Settings")}
            </Button>
            <Button size="sm" variant="outline" disabled={requesting} onClick={() => runAction(revealCurrentApp)}>
              {t("Show app in Finder")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Enable sharkfin in System Settings → Privacy & Security → Input Monitoring, then restart the app.")}
          </p>
        </>
      );
    }

    if (isLinux()) {
      return (
        <>
          <p className="font-medium">{t("Device access denied")}</p>
          <p className="text-sm text-muted-foreground">
            {t("On Linux, keyboard access requires a udev rule.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("Copy and run this command in a terminal, then unplug and replug the keyboard:")}
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
                  <Copy className="mr-1 h-3.5 w-3.5" /> {t("Copy command")}
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("This creates /etc/udev/rules.d/70-open-akko.rules and reloads udev.")}
            </span>
          </div>
        </>
      );
    }

    if (isWindows()) {
      return (
        <>
          <p className="font-medium">{t("Device access denied")}</p>
          <p className="text-sm text-muted-foreground">
            {t("The keyboard is detected but cannot be accessed.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("On Windows, this usually means another application is using the keyboard.")}
          </p>
          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t("Close other keyboard software (manufacturer's tools, RGB software, macro recorders).")}</li>
            <li>{t("Check if Windows Defender or antivirus software is blocking access.")}</li>
            <li>{t("Unplug the keyboard, wait 5 seconds, then plug it back in.")}</li>
          </ul>
        </>
      );
    }

    return (
      <>
        <p className="font-medium">{t("Device access denied")}</p>
        <p className="text-sm text-muted-foreground">
          {t("The keyboard is detected but cannot be accessed. Close other keyboard software and replug the device.")}
        </p>
      </>
    );
  };

  const renderStalled = () => (
    <>
      <p className="font-medium">{t("Keyboard firmware stalled")}</p>
      <p className="text-sm text-muted-foreground">
        {t("The keyboard stopped responding and needs to be reset.")}
      </p>
      <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
        <li>{t("Unplug the keyboard from your computer.")}</li>
        <li>{t("Wait at least 10 seconds.")}</li>
        <li>{t("Plug the keyboard back in.")}</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        {t("The firmware needs a power cycle to recover from this state.")}
      </p>
    </>
  );

  const renderKeyboardOffline = () => (
    <>
      <p className="font-medium">{t("Keyboard is asleep or off")}</p>
      <p className="text-sm text-muted-foreground">
        {t("The wireless receiver is connected but the keyboard is not responding.")}
      </p>
      <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
        <li>{t("Press any key on the keyboard to wake it.")}</li>
        <li>{t("Check that the keyboard is powered on (look for LEDs).")}</li>
        <li>{t("Connect the keyboard via USB cable for reliable communication.")}</li>
      </ul>
    </>
  );

  const renderNoResponse = () => (
    <>
      <p className="font-medium">{t("Keyboard not responding")}</p>
      <p className="text-sm text-muted-foreground">
        {t("A keyboard-like device was detected but did not respond to identification.")}
      </p>
      <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
        <li>{t("This may not be a supported keyboard.")}</li>
        <li>{t("Try unplugging and replugging the keyboard.")}</li>
        <li>{t("Make sure you're using the original USB cable.")}</li>
      </ul>
    </>
  );

  const renderContent = () => {
    switch (error.kind) {
      case "accessDenied":
        return renderAccessDenied();
      case "stalled":
        return renderStalled();
      case "keyboardOffline":
        return renderKeyboardOffline();
      case "noResponse":
        return renderNoResponse();
      default:
        return null;
    }
  };

  const getTechnicalDetails = () => {
    switch (error.kind) {
      case "accessDenied":
        return "HID device node could not be opened. Platform reported permission denied or device busy.";
      case "stalled":
        return "Control endpoint stalled. Firmware stopped responding to feature reports.";
      case "keyboardOffline":
        return "Receiver paired but keyboard offline. Status check indicates keyboard is asleep or powered off.";
      case "noResponse":
        return "Device enumerated but did not respond to identify handshake (0x8F command).";
      default:
        return "Unknown error";
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto max-w-2xl rounded-xl bg-card px-4 py-3 shadow-lg ring-1 ring-destructive/20">
        <div className="flex flex-col gap-3">
          {renderContent()}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={retrying || requesting} onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {retrying ? t("Retrying...") : t("Retry")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="text-xs"
            >
              {detailsOpen ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" /> {t("Hide details")}
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" /> {t("Technical details")}
                </>
              )}
            </Button>
          </div>

          {detailsOpen && (
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-xs font-mono text-muted-foreground">{getTechnicalDetails()}</p>
            </div>
          )}

          {actionError && (
            <p role="alert" className="text-xs text-destructive">
              {actionError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
