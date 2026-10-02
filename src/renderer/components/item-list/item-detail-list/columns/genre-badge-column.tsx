import { useMemo } from 'react';

import styles from './genre-badge-column.module.css';
import { ItemDetailListCellProps } from './types';

import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { stringToColor } from '/@/shared/utils/string-to-color';

const MAX_GENRES = 4;

export const GenreBadgeColumn = ({ song }: ItemDetailListCellProps) => {
    const genres = song.genres;

    const genresWithStyle = useMemo(() => {
        if (!genres) return [];
        return genres.slice(0, MAX_GENRES).map((genre) => {
            const { color, isLight } = stringToColor(genre.name);
            return { ...genre, color, isLight };
        });
    }, [genres]);

    if (!genresWithStyle.length) return <>&nbsp;</>;

    return (
        <Group className={styles.group} wrap="nowrap">
            {genresWithStyle.map((genre) => (
                <Badge
                    key={genre.id}
                    style={{
                        backgroundColor: genre.color,
                        color: genre.isLight ? 'black' : 'white',
                    }}
                >
                    {genre.name}
                </Badge>
            ))}
        </Group>
    );
};
