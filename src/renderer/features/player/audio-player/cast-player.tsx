import isElectron from 'is-electron';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { getSongUrl } from '/@/renderer/features/player/audio-player/hooks/use-stream-url';
import {
    usePlaybackSettings,
    usePlayerActions,
    usePlayerData,
    usePlayerMuted,
    usePlayerStore,
    usePlayerVolume,
} from '/@/renderer/store';
import { useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { logger } from '/@/renderer/utils/logger';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

const castPlayer = isElectron() ? window.api.castPlayer : null;
const castPlayerListener = isElectron() ? window.api.castPlayerListener : null;

const MIME_TYPES: Record<string, string> = {
    aac: 'audio/mp4',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    wav: 'audio/wav',
};

// Device state reported this soon after an app command still describes the old state
const COMMAND_SETTLE_MS = 2000;

const getCurrentSong = () => usePlayerStore.getState().getPlayerData().currentSong;
const getStatus = () => usePlayerStore.getState().player.status;

export function CastPlayer() {
    const { t } = useTranslation();
    const { status } = usePlayerData();
    const { mediaAutoNext, mediaPause, mediaPlay, setTimestamp, setVolume } = usePlayerActions();
    const isMuted = usePlayerMuted();
    const volume = usePlayerVolume();
    const { transcode } = usePlaybackSettings();

    // _uniqueId of the song the device currently holds
    const loadedIdRef = useRef('');
    const loadGenRef = useRef(0);
    const lastCommandAtRef = useRef(0);

    const load = useCallback(
        async (seekTo?: number) => {
            const song = getCurrentSong();
            if (!castPlayer || !song) return;
            // Without an explicit position, pick up where the app's own clock is: the local
            // player's position on handoff, or wherever the user seeked while nothing was loaded
            const start = seekTo ?? useTimestampStoreBase.getState().timestamp;
            const generation = ++loadGenRef.current;
            const url = await getSongUrl(song, transcode, undefined, true);
            // A newer load started while the URL was resolving
            if (!url || generation !== loadGenRef.current) return;

            let imageUrl: string | undefined;
            try {
                imageUrl =
                    api.controller.getImageUrl({
                        apiClientProps: { serverId: song._serverId },
                        query: {
                            id: song.albumId || song.id,
                            itemType: LibraryItem.ALBUM,
                            size: 600,
                        },
                    }) || undefined;
            } catch {
                // Artwork is optional
            }

            const format = (transcode.enabled && transcode.format) || song.container || '';
            loadedIdRef.current = song._uniqueId;
            lastCommandAtRef.current = Date.now();
            castPlayer.load({
                autoplay: getStatus() === PlayerStatus.PLAYING,
                metadata: {
                    album: song.album || undefined,
                    artist: song.artistName || song.artists?.[0]?.name || undefined,
                    imageUrl,
                    title: song.name,
                },
                mimeType: MIME_TYPES[format.toLowerCase()] ?? 'audio/mpeg',
                seekTo: start,
                url,
            });
        },
        [transcode],
    );

    const reset = useCallback(() => {
        loadGenRef.current++;
        loadedIdRef.current = '';
        castPlayer?.stop();
    }, []);

    useEffect(() => {
        if (status === PlayerStatus.PLAYING) void load();
        // Whatever takes over when this unmounts plays locally; never leave both playing
        return reset;
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return usePlayerStore.subscribe(
            (state) => state.getPlayerData().currentSong?._uniqueId,
            (id, prevId) => {
                if (id === prevId) return;
                if (getStatus() === PlayerStatus.PLAYING) void load(0);
                else loadedIdRef.current = '';
            },
        );
    }, [load]);

    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (!castPlayer) return;
        if (status === PlayerStatus.PLAYING) {
            if (loadedIdRef.current && loadedIdRef.current === getCurrentSong()?._uniqueId) {
                lastCommandAtRef.current = Date.now();
                castPlayer.play();
            } else {
                void load();
            }
        } else if (status === PlayerStatus.PAUSED) {
            lastCommandAtRef.current = Date.now();
            castPlayer.pause();
        }
    }, [status, load]);

    useEffect(() => {
        castPlayer?.volume(volume);
    }, [volume]);

    useEffect(() => {
        castPlayer?.mute(isMuted);
    }, [isMuted]);

    useEffect(() => {
        return castPlayerListener?.rendererCastVolume((_event, deviceVolume) => {
            setVolume(deviceVolume);
        });
    }, [setVolume]);

    useEffect(() => {
        return castPlayerListener?.rendererCastStatus((_event, deviceStatus) => {
            const appStatus = getStatus();
            if (appStatus === PlayerStatus.STOPPED) return;

            if (deviceStatus.playerState === 'IDLE') {
                if (!loadedIdRef.current) return;
                if (deviceStatus.idleReason === 'FINISHED') {
                    const finishedId = loadedIdRef.current;
                    loadedIdRef.current = '';
                    mediaAutoNext();
                    // Repeat-one keeps the same song, so the song-change subscription stays quiet
                    if (
                        getStatus() === PlayerStatus.PLAYING &&
                        getCurrentSong()?._uniqueId === finishedId
                    ) {
                        void load(0);
                    }
                } else if (deviceStatus.idleReason === 'ERROR') {
                    logger.error('Cast device failed to play the track', {
                        song: getCurrentSong()?.name,
                    });
                    loadedIdRef.current = '';
                    toast.error({ message: t('cast.playbackFailed') });
                    mediaPause();
                }
                return;
            }

            if (deviceStatus.currentTime !== undefined) {
                setTimestamp(Math.floor(deviceStatus.currentTime));
            }

            // Mirror play/pause done on the device or from another controller
            if (Date.now() - lastCommandAtRef.current < COMMAND_SETTLE_MS) return;
            if (deviceStatus.playerState === 'PAUSED' && appStatus === PlayerStatus.PLAYING) {
                mediaPause();
            } else if (
                deviceStatus.playerState === 'PLAYING' &&
                appStatus === PlayerStatus.PAUSED
            ) {
                mediaPlay();
            }
        });
    }, [load, mediaAutoNext, mediaPause, mediaPlay, setTimestamp, t]);

    usePlayerEvents(
        {
            onPlayerSeekToTimestamp: ({ timestamp }) => {
                // mediaStop emits a zero seek after setting STOPPED
                if (getStatus() === PlayerStatus.STOPPED || !loadedIdRef.current) return;
                lastCommandAtRef.current = Date.now();
                castPlayer?.seek(timestamp);
            },
            onPlayerStop: reset,
            onQueueCleared: reset,
            onQueueRestored: () => {
                loadedIdRef.current = '';
                if (getStatus() === PlayerStatus.PLAYING) void load();
            },
        },
        [load, reset],
    );

    return null;
}
