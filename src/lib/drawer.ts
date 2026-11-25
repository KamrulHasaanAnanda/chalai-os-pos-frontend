"use client";
// The cash drawer (cash-drawer spec). The drawer is plugged into the receipt printer's RJ11 port; sending the
// printer the ESC/POS "pulse" command opens it. Chrome talks to a USB printer with WebUSB (Android, Mac, Linux), or
// to a USB printer that shows up as a COM port with Web Serial (Windows). Safari / iPad has neither.
//
// The printer is chosen once per tablet (the browser asks permission); after that Chrome lists it again on every
// load, so the drawer opens with no dialog. Nothing here talks to Chalai: logging a button press is the caller's job.

import { useSyncExternalStore } from "react";

/** ESC p m t1 t2 on both drawer pins (2 and 5): 50 ms on, 500 ms off. Drawers wired to either pin open. */
const PULSE = Uint8Array.from([0x1b, 0x70, 0x00, 0x19, 0xfa, 0x1b, 0x70, 0x01, 0x19, 0xfa]);
const SAVED = "chalai-drawer";
const USB_PRINTER_CLASS = 7;

// Only the parts of WebUSB / Web Serial used here (TypeScript's DOM types don't include them).
type UsbEndpoint = { endpointNumber: number; direction: "in" | "out"; type: string };
type UsbAlternate = { interfaceClass: number; endpoints: UsbEndpoint[] };
type UsbInterface = { interfaceNumber: number; claimed: boolean; alternate: UsbAlternate; alternates: UsbAlternate[] };
type UsbDevice = {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  configuration: { interfaces: UsbInterface[] } | null;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string }>;
  forget?(): Promise<void>;
};
type Usb = { getDevices(): Promise<UsbDevice[]>; requestDevice(o: { filters: object[] }): Promise<UsbDevice> };
type SerialPort = {
  readable: unknown;
  writable: WritableStream<Uint8Array<ArrayBuffer>> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  open(o: { baudRate: number }): Promise<void>;
  forget?(): Promise<void>;
};
type Serial = { getPorts(): Promise<SerialPort[]>; requestPort(o?: object): Promise<SerialPort> };

type Saved = { kind: "usb" | "serial"; vendorId?: number; productId?: number; name: string };

export type DrawerState = {
  /** The owner turned the drawer on (restaurant setting). */
  enabled: boolean;
  /** This browser can reach a USB printer at all. */
  usb: boolean;
  serial: boolean;
  /** The printer this tablet uses, if one was chosen. */
  printer: string | null;
};

const nav = () => (typeof navigator === "undefined" ? undefined : (navigator as Navigator & { usb?: Usb; serial?: Serial }));

let state: DrawerState = { enabled: false, usb: false, serial: false, printer: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<DrawerState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVED);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ usb: !!nav()?.usb, serial: !!nav()?.serial, printer: readSaved()?.name ?? null });
}

/** The shell (or the offline till) says whether the owner turned the drawer on. */
export function setDrawerEnabled(enabled: boolean) {
  start();
  if (state.enabled !== enabled) set({ enabled });
}

export function useDrawer(): DrawerState {
  start();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

// The open connection, kept between pulses so a busy till doesn't reopen the printer each time.
let usbOut: { device: UsbDevice; endpoint: number } | null = null;
let serialPort: SerialPort | null = null;

/** The interface and bulk-out endpoint the printer takes data on (the printer class first). */
async function claimUsb(device: UsbDevice) {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  const interfaces = device.configuration?.interfaces ?? [];
  const candidates = [...interfaces].sort(
    (a, b) => Number(b.alternate.interfaceClass === USB_PRINTER_CLASS) - Number(a.alternate.interfaceClass === USB_PRINTER_CLASS),
  );
  for (const iface of candidates) {
    const out = iface.alternate.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
    if (!out) continue;
    if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
    return { device, endpoint: out.endpointNumber };
  }
  throw new Error("no_printer_endpoint");
}

async function savedUsbDevice(saved: Saved): Promise<UsbDevice | null> {
  const devices = (await nav()?.usb?.getDevices()) ?? [];
  return devices.find((d) => d.vendorId === saved.vendorId && d.productId === saved.productId) ?? null;
}

async function savedSerialPort(saved: Saved): Promise<SerialPort | null> {
  const ports = (await nav()?.serial?.getPorts()) ?? [];
  return ports.find((p) => p.getInfo().usbVendorId === saved.vendorId && p.getInfo().usbProductId === saved.productId) ?? ports[0] ?? null;
}

async function send(bytes: Uint8Array<ArrayBuffer>) {
  const saved = readSaved();
  if (!saved) throw new Error("no_printer");
  if (saved.kind === "usb") {
    if (!usbOut) {
      const device = await savedUsbDevice(saved);
      if (!device) throw new Error("printer_unplugged");
      usbOut = await claimUsb(device);
    }
    try {
      await usbOut.device.transferOut(usbOut.endpoint, bytes);
    } catch (error) {
      usbOut = null; // unplugged or reset: reconnect next time
      throw error;
    }
    return;
  }
  if (!serialPort) {
    const port = await savedSerialPort(saved);
    if (!port) throw new Error("printer_unplugged");
    if (!port.writable) await port.open({ baudRate: 9600 });
    serialPort = port;
  }
  const writer = serialPort.writable!.getWriter();
  try {
    await writer.write(bytes);
  } catch (error) {
    serialPort = null;
    throw error;
  } finally {
    writer.releaseLock();
  }
}

/**
 * Asks Chrome for the printer (needs a tap: it shows the browser's device list), then opens the drawer once to show
 * it works. Throws `cancelled` when the cashier closes the list.
 */
export async function connectPrinter(kind: "usb" | "serial"): Promise<void> {
  start();
  let saved: Saved;
  try {
    if (kind === "usb") {
      const device = await nav()!.usb!.requestDevice({ filters: [] });
      usbOut = await claimUsb(device);
      saved = { kind, vendorId: device.vendorId, productId: device.productId, name: device.productName || "USB printer" };
    } else {
      const port = await nav()!.serial!.requestPort();
      if (!port.writable) await port.open({ baudRate: 9600 });
      serialPort = port;
      const info = port.getInfo();
      saved = { kind, vendorId: info.usbVendorId, productId: info.usbProductId, name: "Serial printer" };
    }
  } catch (error) {
    if ((error as Error).name === "NotFoundError") throw new Error("cancelled");
    throw error;
  }
  localStorage.setItem(SAVED, JSON.stringify(saved));
  set({ printer: saved.name });
  await send(PULSE);
}

/** Stops using the printer on this tablet (and drops Chrome's permission for it). */
export async function forgetPrinter() {
  const saved = readSaved();
  localStorage.removeItem(SAVED);
  set({ printer: null });
  try {
    if (saved?.kind === "usb") await (usbOut?.device ?? (await savedUsbDevice(saved)))?.forget?.();
    if (saved?.kind === "serial") await (serialPort ?? (await savedSerialPort(saved)))?.forget?.();
  } catch {
    // Already gone.
  }
  usbOut = null;
  serialPort = null;
}

/** Opens the drawer now. True when the printer took the command. */
export async function openDrawer(): Promise<boolean> {
  start();
  try {
    await send(PULSE);
    return true;
  } catch {
    return false;
  }
}

/**
 * For cash payments and cash in / out: opens the drawer only when the owner turned it on and this tablet has a
 * printer. Never throws and never blocks the payment.
 */
export function openDrawerForCash() {
  start();
  if (state.enabled && readSaved()) void openDrawer();
}
