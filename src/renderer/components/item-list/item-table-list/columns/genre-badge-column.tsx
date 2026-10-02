import { useMemo } from 'react';

import styles from './genre-badge-column.module.css';

import {
    ColumnNullFallback,
    ColumnSkeletonVariable,
    ItemTableListInnerColumn,
    TableColumnContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { Genre } from '/@/shared/types/domain-types';
import { stringToColor } from '/@/shared/utils/string-to-color';

const MAX_GENRES = 4;

const GenreBadgeColumn = (props: ItemTableListInnerColumn) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? (props.data as any[])[props.rowIndex];
    const row: Genre[] | undefined = (rowItem as any)?.genres;

    const genres = useMemo(() => {
        if (!row) return [];
        return row.map((genre) => {
            const { color, isLight } = stringToColor(genre.name);
            return { ...genre, color, isLight };
        });
    }, [row]);

    if (Array.isArray(row)) {
        return (
            <TableColumnContainer {...props}>
                <Group className={styles.group} wrap="wrap">
                    {genres.slice(0, MAX_GENRES).map((genre) => (
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
            </TableColumnContainer>
        );
    }

    if (row === null) {
        return <ColumnNullFallback {...props} />;
    }

    return <ColumnSkeletonVariable {...props} />;
};

export { GenreBadgeColumn };
