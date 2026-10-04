import { Bonjour } from 'bonjour-service';
import { CastMediaStatus, Client, DefaultMediaReceiver } from 'castv2-client';
import { lookup } from 'dns/promises';
import { app, ipcMain } from 'electron';
import { isIP } from 'net';

import { getMainWindow } from '../../../index';

import log from '/@/main/logger';

export interface CastDevice {
    host: string;
    id: string;
    model: string;
    name: string;
    port: number;
}

export interface CastLoadData {
    autoplay: boolean;
    metadata: { album?: string; artist?: string; imageUrl?: string; title: string };
    mimeType: string;
    seekTo: number;
    url: string;
}

const DISCOVERY_MS = 3000;
const CONNECT_TIMEOUT_MS = 8000;
// Device volume reports this soon after the app set the volume are echoes of a slider drag.
const VOLUME_ECHO_MS = 1000;

let client: Client | null = null;
let player: DefaultMediaReceiver | null = null;
let pollInterval: NodeJS.Timeout | null = null;
let lastVolumeSetAt = 0;

const send = (channel: string, payload?: unknown) =>
    getMainWindow()?.webContents.send(channel, payload);

const sendStatus = (status?: CastMediaStatus) => {
    if (status) send('renderer-cast-status', status);
};

// The device fetches the stream itself and resolves names through Google DNS, so URLs
// that only work on this machine or through the LAN's DNS are rewritten to plain IPs.
export async function toDeviceUrl(raw: string, localAddress?: string): Promise<string> {
    try {
        const url = new URL(raw);
        const hostname = url.hostname.replace(/^\[|\]$/g, '');
        const isLoopback = (h: string) => h === 'localhost' || h === '::1' || h.startsWith('127.');
        const isPrivate = (h: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);

        let target = hostname;
        // An https host cannot be swapped for an IP without breaking its certificate
        if (!isLoopback(hostname) && !isIP(hostname) && url.protocol === 'http:') {
            const { address } = await lookup(hostname, { family: 4 });
            if (isLoopback(address) || isPrivate(address)) target = address;
        }
        if (isLoopback(target)) target = localAddress || target;
        if (target === hostname) return raw;
        url.hostname = target;
        return url.toString();
    } catch {
        return raw;
    }
}

function connect(device: CastDevice): Promise<number> {
    return new Promise((resolve, reject) => {
        const c = new Client();
        let settled = false;
        const fail = (err: unknown) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                c.close();
            } catch {
                // Socket never opened
            }
            reject(err);
        };
        const timer = setTimeout(() => fail(new Error('Connection timed out')), CONNECT_TIMEOUT_MS);

        c.on('error', (err) => (client === c ? connectionLost(err) : fail(err)));
        c.connect({ host: device.host, port: device.port }, () => {
            c.launch(DefaultMediaReceiver, (launchErr, receiver) => {
                if (launchErr || !receiver) return fail(launchErr);
                c.getVolume((_volumeErr, volume) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    client = c;
                    player = receiver;
                    receiver.on('status', sendStatus);
                    // Another sender took over the device, or the receiver app was stopped
                    receiver.on('close', () => {
                        if (player === receiver) connectionLost('Receiver closed');
                    });
                    c.on('status', (status: { volume?: { level?: number } }) => {
                        const level = status.volume?.level;
                        if (level === undefined) return;
                        if (Date.now() - lastVolumeSetAt < VOLUME_ECHO_MS) return;
                        send('renderer-cast-volume', Math.round(level * 100));
                    });
                    // Status events only fire on state changes; poll for the position.
                    pollInterval = setInterval(() => {
                        try {
                            receiver.getStatus((_err, status) => sendStatus(status));
                        } catch {
                            // Connection is going away
                        }
                    }, 1000);
                    resolve(Math.round((volume?.level ?? 0.5) * 100));
                });
            });
        });
    });
}

function connectionLost(reason: unknown) {
    log.warn('[Cast] Connection lost', reason);
    teardown(false);
    send('renderer-cast-disconnected');
}

function teardown(stopReceiver: boolean) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = null;
    const c = client;
    const p = player;
    client = null;
    player = null;
    if (!c) return;
    try {
        if (stopReceiver && p) c.stop(p, () => c.close());
        else c.close();
    } catch (err) {
        log.warn('[Cast] Failed to close connection cleanly', err);
    }
}

// Media session requests throw when nothing is loaded yet
const withPlayer = (action: string, fn: (p: DefaultMediaReceiver) => void) => {
    if (!player) return;
    try {
        fn(player);
    } catch (err) {
        log.debug(`[Cast] ${action} ignored`, err);
    }
};

ipcMain.handle('cast-discover', () => {
    return new Promise<CastDevice[]>((resolve) => {
        const devices = new Map<string, CastDevice>();
        const bonjour = new Bonjour(undefined, (err: unknown) =>
            log.error('[Cast] Discovery failed', err),
        );
        bonjour.find({ type: 'googlecast' }, (service) => {
            const id = service.txt?.id ?? service.name;
            devices.set(id, {
                host: service.addresses?.find((a) => isIP(a) === 4) ?? service.host,
                id,
                model: service.txt?.md ?? '',
                name: service.txt?.fn ?? service.name,
                // Speaker groups listen on their own port, not 8009
                port: service.port,
            });
        });
        setTimeout(() => {
            bonjour.destroy();
            log.info(`[Cast] Found ${devices.size} device(s)`);
            resolve([...devices.values()].sort((a, b) => a.name.localeCompare(b.name)));
        }, DISCOVERY_MS);
    });
});

ipcMain.handle('cast-connect', async (_event, device: CastDevice) => {
    teardown(true);
    try {
        const volume = await connect(device);
        log.info(`[Cast] Connected to ${device.name}`);
        return { success: true, volume };
    } catch (err) {
        log.error(`[Cast] Failed to connect to ${device.name}`, err);
        return { success: false, volume: 0 };
    }
});

ipcMain.handle('cast-disconnect', () => {
    log.info('[Cast] Disconnected');
    teardown(true);
});

ipcMain.on('cast-load', async (_event, data: CastLoadData) => {
    const p = player;
    const localAddress = client?.client.socket?.localAddress;
    if (!p) return;
    const [url, imageUrl] = await Promise.all([
        toDeviceUrl(data.url, localAddress),
        data.metadata.imageUrl ? toDeviceUrl(data.metadata.imageUrl, localAddress) : undefined,
    ]);
    if (player !== p) return;
    try {
        p.load(
            {
                contentId: url,
                contentType: data.mimeType,
                metadata: {
                    albumName: data.metadata.album,
                    artist: data.metadata.artist,
                    images: imageUrl ? [{ url: imageUrl }] : [],
                    metadataType: 3, // MUSIC_TRACK
                    title: data.metadata.title,
                },
                streamType: 'BUFFERED',
            },
            { autoplay: data.autoplay, currentTime: data.seekTo },
            (err) => {
                // "Load cancelled" only means a newer load replaced this one
                if (err?.message !== 'Load failed') return;
                log.error(`[Cast] Device could not load ${data.metadata.title}`);
                sendStatus({ idleReason: 'ERROR', playerState: 'IDLE' });
            },
        );
    } catch (err) {
        log.error('[Cast] Load failed', err);
    }
});

ipcMain.on('cast-play', () => withPlayer('play', (p) => p.play()));
ipcMain.on('cast-pause', () => withPlayer('pause', (p) => p.pause()));
ipcMain.on('cast-stop', () => withPlayer('stop', (p) => p.stop()));
ipcMain.on('cast-seek', (_event, seconds: number) => withPlayer('seek', (p) => p.seek(seconds)));

ipcMain.on('cast-volume', (_event, value: number) => {
    lastVolumeSetAt = Date.now();
    client?.setVolume({ level: Math.min(100, Math.max(0, value)) / 100 }, () => {});
});

ipcMain.on('cast-mute', (_event, muted: boolean) => {
    client?.setVolume({ muted }, () => {});
});

app.on('before-quit', () => teardown(true));
