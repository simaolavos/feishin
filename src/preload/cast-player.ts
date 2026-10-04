import { ipcRenderer, IpcRendererEvent } from 'electron';

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

export interface CastStatus {
    currentTime?: number;
    idleReason?: 'CANCELLED' | 'ERROR' | 'FINISHED' | 'INTERRUPTED';
    playerState: 'BUFFERING' | 'IDLE' | 'PAUSED' | 'PLAYING';
}

const discover = (): Promise<CastDevice[]> => ipcRenderer.invoke('cast-discover');
const connect = (device: CastDevice): Promise<{ success: boolean; volume: number }> =>
    ipcRenderer.invoke('cast-connect', device);
const disconnect = (): Promise<void> => ipcRenderer.invoke('cast-disconnect');
const load = (data: CastLoadData) => ipcRenderer.send('cast-load', data);
const play = () => ipcRenderer.send('cast-play');
const pause = () => ipcRenderer.send('cast-pause');
const stop = () => ipcRenderer.send('cast-stop');
const seek = (seconds: number) => ipcRenderer.send('cast-seek', seconds);
const volume = (value: number) => ipcRenderer.send('cast-volume', value);
const mute = (muted: boolean) => ipcRenderer.send('cast-mute', muted);

function on<T extends (...args: any[]) => void>(channel: string, cb: T): () => void {
    ipcRenderer.on(channel, cb);
    return () => ipcRenderer.removeListener(channel, cb);
}

const rendererCastStatus = (cb: (event: IpcRendererEvent, status: CastStatus) => void) =>
    on('renderer-cast-status', cb);
const rendererCastVolume = (cb: (event: IpcRendererEvent, volume: number) => void) =>
    on('renderer-cast-volume', cb);
const rendererCastDisconnected = (cb: (event: IpcRendererEvent) => void) =>
    on('renderer-cast-disconnected', cb);

export const castPlayer = {
    connect,
    disconnect,
    discover,
    load,
    mute,
    pause,
    play,
    seek,
    stop,
    volume,
};

export const castPlayerListener = {
    rendererCastDisconnected,
    rendererCastStatus,
    rendererCastVolume,
};
