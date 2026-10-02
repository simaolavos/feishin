import { useSuspenseQuery } from '@tanstack/react-query';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { ArtistMultiSelectRow } from '/@/renderer/features/shared/components/multi-select-rows';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { useCurrentServerId } from '/@/renderer/store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { VirtualMultiSelect } from '/@/shared/components/multi-select/virtual-multi-select';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Text } from '/@/shared/components/text/text';
import { AlbumArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';

interface SubsonicSongFiltersProps {
    disableArtistFilter?: boolean;
}

export const SubsonicSongFilters = ({ disableArtistFilter }: SubsonicSongFiltersProps) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const { query, setArtistIds, setFavorite } = useSongListFilters();

    const albumArtistListQuery = useSuspenseQuery(
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

    const items = albumArtistListQuery?.data?.items;

    const selectableAlbumArtists = useMemo(() => {
        if (!items) return [];

        return items.map((artist) => ({
            albumCount: artist.albumCount,
            blurHash: artist.blurHash,
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
    }, [items]);

    const selectedArtistIds = useMemo(() => query.artistIds || [], [query.artistIds]);

    const hasFavorite = query.favorite === true;
    const hasArtist = query.artistIds && query.artistIds.length > 0;
    const isFavoriteDisabled = hasArtist;
    const isArtistDisabled = hasFavorite;
    const handleArtistFilter = useCallback(
        (e: null | string[]) => {
            if (isArtistDisabled && e !== null) return;
            setArtistIds(e ?? null);
        },
        [isArtistDisabled, setArtistIds],
    );

    const artistFilterLabel = useMemo(() => {
        return (
            <Text fw={500} size="sm">
                {t('entity.artist', { count: 2 })}
            </Text>
        );
    }, [t]);

    const toggleFilters = useMemo(
        () => [
            {
                label: t('filter.isFavorited'),
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                    if (isFavoriteDisabled && e.target.checked) return;
                    const favoriteValue = e.target.checked ? true : undefined;
                    setFavorite(favoriteValue ?? null);
                },
                value: query.favorite,
            },
        ],
        [isFavoriteDisabled, query.favorite, setFavorite, t],
    );

    return (
        <Stack px="md" py="md">
            {toggleFilters.map((filter) => (
                <Group justify="space-between" key={`ss-filter-${filter.label}`}>
                    <Text>{filter.label}</Text>
                    <Switch
                        checked={filter.value ?? false}
                        disabled={isFavoriteDisabled}
                        onChange={filter.onChange}
                    />
                </Group>
            ))}
            {!disableArtistFilter && (
                <>
                    <Divider my="md" />
                    <VirtualMultiSelect
                        disabled={isArtistDisabled}
                        displayCountType="song"
                        height={300}
                        isLoading={albumArtistListQuery.isFetching}
                        label={artistFilterLabel}
                        onChange={handleArtistFilter}
                        options={selectableAlbumArtists}
                        RowComponent={ArtistMultiSelectRow}
                        singleSelect={true}
                        value={selectedArtistIds}
                    />
                </>
            )}
        </Stack>
    );
};
