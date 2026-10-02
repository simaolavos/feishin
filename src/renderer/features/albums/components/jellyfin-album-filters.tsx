import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { ArtistMultiSelectRow } from '/@/renderer/features/shared/components/multi-select-rows';
import { TagFilters } from '/@/renderer/features/shared/components/tag-filter';
import { useCurrentServerId } from '/@/renderer/store';
import { useAppStore, useAppStoreActions } from '/@/renderer/store/app.store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { VirtualMultiSelect } from '/@/shared/components/multi-select/virtual-multi-select';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { YesNoSelect } from '/@/shared/components/yes-no-select/yes-no-select';
import { useDebouncedCallback } from '/@/shared/hooks/use-debounced-callback';
import { AlbumArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';

interface JellyfinAlbumFiltersProps {
    disableArtistFilter?: boolean;
}

export const JellyfinAlbumFilters = ({ disableArtistFilter }: JellyfinAlbumFiltersProps) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();

    const {
        query,
        setAlbumArtist,
        setCompilation,
        setCustom,
        setFavorite,
        setMaxYear,
        setMinYear,
    } = useAlbumListFilters();

    const yesNoFilter = useMemo(() => {
        const filters = [
            {
                label: t('filter.isFavorited'),
                onChange: (favoriteValue?: boolean) => {
                    setFavorite(favoriteValue ?? null);
                },
                value: query.favorite,
            },
        ];

        if (query.artistIds?.length) {
            filters.push({
                label: t('filter.isCompilation'),
                onChange: (compilationValue?: boolean) => {
                    setCompilation(compilationValue ?? null);
                },
                value: query.compilation,
            });
        }
        return filters;
    }, [
        t,
        query.favorite,
        query.artistIds?.length,
        query.compilation,
        setFavorite,
        setCompilation,
    ]);

    const handleMinYearFilter = useMemo(
        () => (e: number | string) => {
            // Handle empty string, null, undefined, or invalid numbers as clearing
            if (e === '' || e === null || e === undefined || isNaN(Number(e))) {
                setMinYear(null);
                return;
            }

            const year = typeof e === 'number' ? e : Number(e);
            // If it's a valid number within range, set it; otherwise clear
            if (!isNaN(year) && isFinite(year) && year >= 1700 && year <= 2300) {
                setMinYear(year);
            } else {
                setMinYear(null);
            }
        },
        [setMinYear],
    );

    const handleMaxYearFilter = useMemo(
        () => (e: number | string) => {
            // Handle empty string, null, undefined, or invalid numbers as clearing
            if (e === '' || e === null || e === undefined || isNaN(Number(e))) {
                setMaxYear(null);
                return;
            }

            const year = typeof e === 'number' ? e : Number(e);
            // If it's a valid number within range, set it; otherwise clear
            if (!isNaN(year) && isFinite(year) && year >= 1700 && year <= 2300) {
                setMaxYear(year);
            } else {
                setMaxYear(null);
            }
        },
        [setMaxYear],
    );

    const albumArtistListQuery = useQuery(
        artistsQueries.albumArtistList({
            options: {
                gcTime: 1000 * 60 * 2,
                staleTime: 1000 * 60 * 1,
            },
            query: {
                sortBy: AlbumArtistListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId,
        }),
    );

    const selectableAlbumArtists = useMemo(() => {
        if (!albumArtistListQuery?.data?.items) return [];

        return albumArtistListQuery?.data?.items?.map((artist) => ({
            albumCount: artist.albumCount,
            blurHash: artist.blurHash,
            dominantColor: artist.dominantColor,
            imageUrl: getItemImageUrl({
                id: artist.id,
                itemType: LibraryItem.ARTIST,
                type: 'table',
            }),
            label: artist.name,
            songCount: artist.songCount,
            thumbHash: artist.thumbHash,
            value: artist.id,
        }));
    }, [albumArtistListQuery.data?.items]);

    const handleAlbumArtistFilter = useCallback(
        (e: null | string[]) => {
            setAlbumArtist(e ?? null);
        },
        [setAlbumArtist],
    );

    const debouncedHandleMinYearFilter = useDebouncedCallback(handleMinYearFilter, 300);
    const debouncedHandleMaxYearFilter = useDebouncedCallback(handleMaxYearFilter, 300);

    const artistSelectMode = useAppStore((state) => state.artistSelectMode);
    const { setArtistSelectMode } = useAppStoreActions();

    const selectedArtistIds = useMemo(() => query.artistIds || [], [query.artistIds]);
    const handleArtistSelectModeChange = useCallback(
        (value: string) => {
            const newMode = value as 'multi' | 'single';
            setArtistSelectMode(newMode);

            if (newMode === 'single' && selectedArtistIds.length > 1) {
                setAlbumArtist([selectedArtistIds[0]]);
            }
        },
        [selectedArtistIds, setAlbumArtist, setArtistSelectMode],
    );

    const artistFilterLabel = useMemo(() => {
        return (
            <Group gap="xs" justify="space-between" w="100%">
                <Text fw={500} size="sm">
                    {t('entity.artist', { count: 2 })}
                </Text>
                <SegmentedControl
                    data={[
                        {
                            label: t('common.filter_single'),
                            value: 'single',
                        },
                        {
                            label: t('common.filter_multiple'),
                            value: 'multi',
                        },
                    ]}
                    onChange={handleArtistSelectModeChange}
                    size="xs"
                    value={artistSelectMode}
                />
            </Group>
        );
    }, [artistSelectMode, handleArtistSelectModeChange, t]);

    return (
        <Stack px="md" py="md">
            {yesNoFilter.map((filter) => (
                <YesNoSelect
                    key={`jf-filter-${filter.label}`}
                    label={filter.label}
                    onChange={(e) => filter.onChange(e ? e === 'true' : undefined)}
                    value={filter.value ? filter.value.toString() : undefined}
                />
            ))}
            {!disableArtistFilter && (
                <>
                    <Divider my="md" />
                    <VirtualMultiSelect
                        displayCountType="album"
                        height={300}
                        isLoading={albumArtistListQuery.isFetching}
                        label={artistFilterLabel}
                        onChange={handleAlbumArtistFilter}
                        options={selectableAlbumArtists}
                        RowComponent={ArtistMultiSelectRow}
                        singleSelect={artistSelectMode === 'single'}
                        value={selectedArtistIds}
                    />
                </>
            )}
            <Divider my="md" />
            <Group grow>
                <NumberInput
                    hideControls={false}
                    label={t('filter.fromYear')}
                    max={2300}
                    min={1700}
                    onChange={(e) => debouncedHandleMinYearFilter(e)}
                    required={!!query.minYear}
                    value={query.minYear ?? undefined}
                />
                <NumberInput
                    hideControls={false}
                    label={t('filter.toYear')}
                    max={2300}
                    min={1700}
                    onChange={(e) => debouncedHandleMaxYearFilter(e)}
                    required={!!query.minYear}
                    value={query.maxYear ?? undefined}
                />
            </Group>
            <TagFilters query={query} setCustom={setCustom} type={LibraryItem.ALBUM} />
        </Stack>
    );
};
