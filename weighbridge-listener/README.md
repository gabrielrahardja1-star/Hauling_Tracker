# Weighbridge Listener (read-only capture tool)

A tiny, **read-only** serial tool to capture the raw data sent by the **GSC SGW-3015PS**
weighbridge indicator. It only listens — it never sends anything to the indicator,
so it cannot affect the metrology-sealed device.

Goal: at the next downtime, record a minute or two of the scale's real bytes so we
can identify the exact protocol + serial settings and build the real parser.

This folder is completely separate from the Hauling_Tracker app — nothing here
touches the existing backend, frontend, or database.

## Prep before downtime (do while online)

1. **USB-serial adapter driver:** find the adapter's chipset. FTDI → built into macOS,
   nothing to do. Prolific (PL2303) or CH340 → download & install that driver now.
2. **USB-A → USB-C dongle** (the adapter is USB-A; the Mac is USB-C).
3. **Prove the Mac sees it:** plug the adapter into the Mac and run:
   ```
   ls /dev/tty.usbserial* /dev/tty.usb*
   ```
   If a device appears, the driver works. (You can also run `npm run capture -- --list`.)
4. **Backup tool:** install CoolTerm too, in case anything misbehaves on the day.

## On the day (at the scale, ~10–15 min)

1. **Close the old TruckScaleApplication completely** (frees the cable — only one
   program can use the port at a time).
2. Plug the adapter into the Mac. Find the port:
   ```
   npm run capture -- --list
   ```
   Look for something like `/dev/tty.usbserial-XXXX` (FTDI/Prolific/CH340).
3. **Start capture with auto baud detection:**
   ```
   npm run capture -- --port=/dev/tty.usbserial-XXXX
   ```
   It tries the common speed/parity combos. At the wrong ones you'll see garbage;
   at the right one it locks on and starts printing clean lines like
   `ST,GS,+00032450kg` with their HEX bytes.
4. (Optional) Have someone step on/off the scale to see the number change.
5. Let it run **1–2 minutes**. Everything is saved under `logs/`.
6. Note the settings it locked onto (shown on screen). Press **Ctrl+C** to stop.
7. **Reopen the old TruckScaleApplication** and confirm it works normally again.
8. **Send me the newest file in `logs/`** — that's all I need to build the parser.

### If auto-detect can't find clean data
- Try exact settings manually, e.g.:
  ```
  npm run capture -- --port=/dev/tty.usbserial-XXXX --baud=9600 --databits=8 --parity=none --stopbits=1
  ```
- Port opens but no data at any speed → the cable may need a **null-modem**
  (crossover) adapter. Note it; not fatal.
- "Port busy / access denied" → the old app is probably still holding the port.

## Running on Windows (the weighbridge PC)

The exact same code runs on Windows — only the port name differs (`COM3` instead
of `/dev/tty.usbserial-XXXX`). Two double-click helpers are included:

- **`list-ports.bat`** — shows the available COM ports.
- **`capture.bat COM3`** — auto-detects baud, streams, and logs to `logs\`.
  (Add exact settings if needed: `capture.bat COM3 --baud=9600 --databits=8 --parity=none --stopbits=1`.)

### The catch: that PC is offline / locked-down

The code needs Node + the `serialport` library present. Since you can't install
things on the weighbridge PC, use a **portable, no-install bundle on a USB stick.**
The serial library has a *native* piece that must be the **Windows** build, so it
has to be prepared on a Windows machine that has internet — you can't just copy the
Mac's `node_modules`.

**One-time bundle prep (on any Windows PC with internet):**
1. Install Node LTS (or download the "Windows Binary .zip" for a portable `node.exe`).
2. Copy this `weighbridge-listener` folder over (without `node_modules`).
3. In that folder run: `npm install serialport`  ← this pulls the **Windows** native binary.
4. Drop a portable **`node.exe`** into the folder (next to the `.bat` files) so the
   locked-down PC needs nothing installed. The `.bat` files auto-use it if present.
5. Copy the whole folder to a USB stick.

**On the locked-down PC:** plug in the USB stick, double-click `list-ports.bat`,
then `capture.bat COMx`. Nothing gets installed on the machine.

> If USB sticks or running `.exe` files are blocked by policy on that PC, fall back
> to the Mac path (this was our primary plan anyway).

## No hardware? Try the simulator

```
npm run sim
```
Runs a fake scale so you can see exactly how the tool behaves (auto-detect,
live view, logging) without anything plugged in.

## Tests

```
npm test
```

## Commands

| Command | What it does |
|---|---|
| `npm run capture -- --list` | List available serial ports |
| `npm run capture -- --port=NAME` | Auto-detect baud, then stream + log |
| `npm run capture -- --port=NAME --baud=9600 --databits=8 --parity=none --stopbits=1` | Use exact settings |
| `npm run sim` | Run against the built-in simulator (no hardware) |
| `npm test` | Run the self-tests |

**Safety:** read-only. It never writes to the port, so the sealed indicator is untouched.
