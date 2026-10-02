import clsx from 'clsx';
import { Fragment, useMemo } from 'react';

import styles from './genre-column.module.css';

import {
    ColumnNullFallback,
    ColumnSkeletonVariable,
    ItemTableListInnerColumn,
    TableColumnContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { Text } from '/@/shared/components/text/text';
import { Genre } from '/@/shared/types/domain-types';

const GenreColumn = (props: ItemTableListInnerColumn) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? (props.data as any[])[props.rowIndex];
    const row: Genre[] | undefined = (rowItem as any)?.[props.columns[props.columnIndex].id];

    const genres = useMemo(() => {
        if (!row) return [];
        return row;
    }, [row]);

    if (Array.isArray(row)) {
        return (
            <TableColumnContainer {...props}>
                <div
                    className={clsx(styles.genresContainer, {
                        [styles.compact]: props.size === 'compact',
                        [styles.large]: props.size === 'large',
                    })}
                >
                    {genres.map((genre, index) => (
                        <Fragment key={genre.id}>
                            <Text isMuted isNoSelect>
                                {genre.name}
                            </Text>
                            {index < genres.length - 1 && ', '}
                        </Fragment>
                    ))}
                </div>
            </TableColumnContainer>
        );
    }

    if (row === null) {
        return <ColumnNullFallback {...props} />;
    }

    return <ColumnSkeletonVariable {...props} />;
};

export { GenreColumn };
