declare module 'castv2-client' {
    import { EventEmitter } from 'events';

    type Callback<T = unknown> = (err: Error | null, result?: T) => void;

    export interface CastMediaStatus {
        currentTime?: number;
        idleReason?: 'CANCELLED' | 'ERROR' | 'FINISHED' | 'INTERRUPTED';
        playerState: 'BUFFERING' | 'IDLE' | 'PAUSED' | 'PLAYING';
    }

    export interface CastVolume {
        level?: number;
        muted?: boolean;
    }

    export class Client extends EventEmitter {
        client: { socket?: { localAddress?: string } };
        close(): void;
        connect(options: { host: string; port: number }, callback: () => void): void;
        getVolume(callback: Callback<CastVolume>): void;
        launch(
            application: typeof DefaultMediaReceiver,
            callback: Callback<DefaultMediaReceiver>,
        ): void;
        setVolume(volume: CastVolume, callback: Callback<CastVolume>): void;
        stop(application: DefaultMediaReceiver, callback: Callback): void;
    }

    export class DefaultMediaReceiver extends EventEmitter {
        getStatus(callback: Callback<CastMediaStatus>): void;
        load(
            media: Record<string, unknown>,
            options: { autoplay?: boolean; currentTime?: number },
            callback: Callback<CastMediaStatus>,
        ): void;
        pause(callback?: Callback): void;
        play(callback?: Callback): void;
        seek(currentTime: number, callback?: Callback): void;
        stop(callback?: Callback): void;
    }
}
