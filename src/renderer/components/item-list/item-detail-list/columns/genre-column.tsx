import { Fragment } from 'react';

import { ItemDetailListCellProps } from '/@/renderer/components/item-list/item-detail-list/columns/types';
import { Text } from '/@/shared/components/text/text';

const TEXT_PROPS = { isMuted: true, isNoSelect: true, size: 'sm' as const } as const;

export const GenreColumn = ({ song }: ItemDetailListCellProps) => {
    const genres = song.genres ?? [];
    if (!genres.length) return <>&nbsp;</>;

    return (
        <>
            {genres.map((genre, index) => (
                <Fragment key={genre.id}>
                    <Text component="span" {...TEXT_PROPS}>
                        {genre.name}
                    </Text>
                    {index < genres.length - 1 && ', '}
                </Fragment>
            ))}
        </>
    );
};
