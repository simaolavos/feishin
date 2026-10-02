import { t } from 'i18next';
import isElectron from 'is-electron';
import { useCallback, useEffect } from 'react';

import { usePlayerActions, useVolumeWheelStep } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const mpvPlayerListener = isElectron() ? window.api.mpvPlayerListener : null;
const ipc = isElectron() ? window.api.ipc : null;

export const useMainPlayerListener = () => {
    const volumeWheelStep = useVolumeWheelStep();
    const {
        decreaseVolume,
        increaseVolume,
        mediaAutoNext,
        mediaNext,
        mediaPause,
        mediaPlay,
        mediaPrevious,
        mediaSkipBackward,
        mediaSkipForward,
        mediaStop,
        mediaToggleMute,
        mediaTogglePlayPause,
        toggleRepeat,
        toggleShuffle,
    } = usePlayerActions();

    const handleMpvError = useCallback(
        (message: string) => {
            toast.error({
                id: 'mpv-error',
                message,
                title: t('error.playbackError') as string,
            });
            mediaPause();
            mpvPlayer!.pause();
        },
        [mediaPause],
    );

    useEffect(() => {
        if (!mpvPlayerListener) {
            return;
        }

        mpvPlayerListener.rendererPlayPause(() => {
            mediaTogglePlayPause();
        });

        mpvPlayerListener.rendererNext(() => {
            mediaNext(false);
        });

        mpvPlayerListener.rendererNextAlbum(() => {
            mediaNext(true);
        });

        mpvPlayerListener.rendererPrevious(() => {
            mediaPrevious(false);
        });

        mpvPlayerListener.rendererPreviousAlbum(() => {
            mediaPrevious(true);
        });

        mpvPlayerListener.rendererPlay(() => {
            mediaPlay();
        });

        mpvPlayerListener.rendererPause(() => {
            mediaPause();
        });

        mpvPlayerListener.rendererStop(() => {
            mediaStop({ reset: false });
        });

        mpvPlayerListener.rendererSkipForward(() => {
            mediaSkipForward();
        });

        mpvPlayerListener.rendererSkipBackward(() => {
            mediaSkipBackward();
        });

        mpvPlayerListener.rendererToggleShuffle(() => {
            toggleShuffle();
        });

        mpvPlayerListener.rendererToggleRepeat(() => {
            toggleRepeat();
        });

        mpvPlayerListener.rendererVolumeMute(() => {
            mediaToggleMute();
        });

        mpvPlayerListener.rendererVolumeUp(() => {
            increaseVolume(volumeWheelStep);
        });

        mpvPlayerListener.rendererVolumeDown(() => {
            decreaseVolume(volumeWheelStep);
        });

        mpvPlayerListener.rendererError((message: string) => {
            handleMpvError(message);
        });

        return () => {
            ipc?.removeAllListeners('renderer-player-play-pause');
            ipc?.removeAllListeners('renderer-player-next');
            ipc?.removeAllListeners('renderer-player-previous');
            ipc?.removeAllListeners('renderer-player-play');
            ipc?.removeAllListeners('renderer-player-pause');
            ipc?.removeAllListeners('renderer-player-stop');
            ipc?.removeAllListeners('renderer-player-skip-forward');
            ipc?.removeAllListeners('renderer-player-skip-backward');
            ipc?.removeAllListeners('renderer-player-toggle-shuffle');
            ipc?.removeAllListeners('renderer-player-toggle-repeat');
            ipc?.removeAllListeners('renderer-player-volume-mute');
            ipc?.removeAllListeners('renderer-player-volume-up');
            ipc?.removeAllListeners('renderer-player-volume-down');
            ipc?.removeAllListeners('renderer-player-error');
        };
    }, [
        decreaseVolume,
        handleMpvError,
        increaseVolume,
        mediaAutoNext,
        mediaNext,
        mediaPause,
        mediaPlay,
        mediaPrevious,
        mediaSkipForward,
        mediaSkipBackward,
        mediaStop,
        mediaToggleMute,
        mediaTogglePlayPause,
        toggleRepeat,
        toggleShuffle,
        volumeWheelStep,
    ]);
};

const MainPlayerListenerHookInner = () => {
    useMainPlayerListener();
    return null;
};

export const MainPlayerListenerHook = () => {
    const isElectronEnv = isElectron();
    const mpvPlayerListener = isElectronEnv ? window.api.mpvPlayerListener : null;

    if (mpvPlayerListener === null) {
        return null;
    }

    return <MainPlayerListenerHookInner />;
};
