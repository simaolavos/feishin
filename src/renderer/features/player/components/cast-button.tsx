import isElectron from 'is-electron';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { playerHandoff } from '../audio-player/engine/player-handoff';

import {
    usePlaybackSettings,
    usePlayerActions,
    usePlayerVolume,
    useSettingsStore,
} from '/@/renderer/store';
import { useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { AppIcon } from '/@/shared/components/icon/icon';
import { Popover } from '/@/shared/components/popover/popover';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerType } from '/@/shared/types/types';

const castPlayer = isElectron() ? window.api.castPlayer : null;
const castPlayerListener = isElectron() ? window.api.castPlayerListener : null;

type CastDevice = Awaited<ReturnType<NonNullable<typeof castPlayer>['discover']>>[number];

export const CastButton = () => {
    const { t } = useTranslation();
    const { mediaPause, setVolume } = usePlayerActions();
    const volume = usePlayerVolume();
    const { type } = usePlaybackSettings();

    const [opened, setOpened] = useState(false);
    const [devices, setDevices] = useState<CastDevice[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [deviceName, setDeviceName] = useState('');

    const isCasting = type === PlayerType.CAST;

    // Back to the player that was active before casting, at the same position and volume
    const restoreLocalPlayer = useCallback(
        (resumeAtCastPosition: boolean) => {
            const { previousLocalVolume, previousPlayerType } =
                useSettingsStore.getState().playback;
            if (resumeAtCastPosition) {
                const timestamp = useTimestampStoreBase.getState().timestamp;
                if (timestamp > 0) playerHandoff.pendingLocalSeek = timestamp;
            }
            useSettingsStore.setState((state) => {
                state.playback.type =
                    previousPlayerType && previousPlayerType !== PlayerType.CAST
                        ? previousPlayerType
                        : PlayerType.WEB;
                state.playback.previousLocalVolume = undefined;
                state.playback.previousPlayerType = undefined;
            });
            if (previousLocalVolume !== undefined) setVolume(previousLocalVolume);
        },
        [setVolume],
    );

    // The connection does not survive a restart; neither does a player type that no longer exists
    useEffect(() => {
        const persistedType = useSettingsStore.getState().playback.type;
        if (
            persistedType === PlayerType.CAST ||
            !Object.values(PlayerType).includes(persistedType)
        ) {
            restoreLocalPlayer(false);
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return castPlayerListener?.rendererCastDisconnected(() => {
            if (useSettingsStore.getState().playback.type !== PlayerType.CAST) return;
            toast.error({ message: t('cast.connectionLost') });
            // Do not start blaring from this machine because the device went away
            mediaPause();
            restoreLocalPlayer(true);
        });
    }, [mediaPause, restoreLocalPlayer, t]);

    const handleDiscover = useCallback(async () => {
        if (!castPlayer) return;
        setIsSearching(true);
        try {
            setDevices(await castPlayer.discover());
        } catch {
            setDevices([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSelect = async (device: CastDevice) => {
        if (!castPlayer) return;
        setIsConnecting(true);
        const result = await castPlayer.connect(device);
        setIsConnecting(false);
        if (!result.success) {
            toast.error({ message: t('cast.connectionFailed', { name: device.name }) });
            return;
        }
        setDeviceName(device.name);
        // Adopt the device's volume first so mounting the cast player does not change it
        setVolume(result.volume);
        useSettingsStore.setState((state) => {
            state.playback.previousLocalVolume = volume;
            state.playback.previousPlayerType = state.playback.type;
            state.playback.type = PlayerType.CAST;
        });
    };

    const handleDisconnect = async () => {
        await castPlayer?.disconnect();
        restoreLocalPlayer(true);
        setOpened(false);
    };

    if (!castPlayer) return null;

    return (
        <Popover onChange={setOpened} opened={opened} position="top">
            <Popover.Target>
                <ActionIcon
                    icon="cast"
                    iconProps={{ color: isCasting ? 'primary' : undefined, size: 'lg' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!opened && !isCasting) void handleDiscover();
                        setOpened(!opened);
                    }}
                    size="sm"
                    tooltip={{
                        label: isCasting
                            ? t('cast.castingTo', { name: deviceName })
                            : t('cast.castToDevice'),
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown onClick={(e) => e.stopPropagation()} p="md" style={{ minWidth: 280 }}>
                {isCasting ? (
                    <Stack gap="sm">
                        <Text size="sm" ta="center">
                            {t('cast.castingTo', { name: deviceName })}
                        </Text>
                        <Button onClick={handleDisconnect} size="xs" variant="outline">
                            {t('cast.disconnect')}
                        </Button>
                    </Stack>
                ) : isConnecting ? (
                    <Group justify="center">
                        <Spinner size="sm" />
                        <Text isMuted size="sm">
                            {t('cast.connecting')}
                        </Text>
                    </Group>
                ) : (
                    <Stack gap="xs">
                        {devices.map((device) => (
                            <Button
                                justify="flex-start"
                                key={device.id}
                                onClick={() => void handleSelect(device)}
                                size="sm"
                                variant="subtle"
                            >
                                {device.name}
                                {device.model && device.model !== device.name && (
                                    <Text isMuted ml="xs" size="xs">
                                        {device.model}
                                    </Text>
                                )}
                            </Button>
                        ))}
                        {isSearching ? (
                            <Group justify="center">
                                <Spinner size="sm" />
                                <Text isMuted size="sm">
                                    {t('cast.searching')}
                                </Text>
                            </Group>
                        ) : (
                            <>
                                {devices.length === 0 && (
                                    <Text isMuted size="sm" ta="center">
                                        {t('cast.noDevicesFound')}
                                    </Text>
                                )}
                                <Button
                                    leftSection={<AppIcon.refresh size={12} />}
                                    onClick={() => void handleDiscover()}
                                    size="xs"
                                    variant="outline"
                                >
                                    {t('common.refresh')}
                                </Button>
                            </>
                        )}
                    </Stack>
                )}
            </Popover.Dropdown>
        </Popover>
    );
};
