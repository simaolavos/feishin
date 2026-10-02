import clsx from 'clsx';
import { ReactNode, useCallback } from 'react';

import styles from './row-index-column.module.css';

import {
    ItemTableListInnerColumn,
    TableColumnContainer,
    TableColumnTextContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { ItemListItem } from '/@/renderer/components/item-list/types';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Flex } from '/@/shared/components/flex/flex';
import { Text } from '/@/shared/components/text/text';
import { Play } from '/@/shared/types/types';

export const RowPlayControlCell = (
    props: ItemTableListInnerColumn & {
        indexContent: ReactNode;
        onPlay: (playType: Play) => void;
        showPlayControls: boolean;
    },
) => {
    const {
        controls,
        data,
        enableExpansion,
        getRowItem,
        indexContent,
        internalState,
        itemType,
        onPlay,
        rowIndex,
        showPlayControls,
    } = props;

    const handleExpand = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const item = (getRowItem?.(rowIndex) ?? data[rowIndex]) as ItemListItem;
            const rowId = internalState.extractRowId(item);
            const index = rowId ? internalState.findItemIndex(rowId) : -1;
            controls.onExpand?.({
                event: e,
                index,
                internalState,
                item,
                itemType,
            });
        },
        [controls, data, getRowItem, internalState, itemType, rowIndex],
    );

    const getIndexDisplay = (useMutedText: boolean) => {
        const hideOnHoverClass = enableExpansion ? 'hide-on-hover' : undefined;

        if (typeof indexContent === 'number') {
            return useMutedText ? (
                <Text className={hideOnHoverClass} isMuted isNoSelect>
                    {indexContent}
                </Text>
            ) : (
                indexContent
            );
        }

        return <span className={hideOnHoverClass}>{indexContent}</span>;
    };

    const handlePlayClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onPlay(Play.NOW);
        },
        [onPlay],
    );

    const expansionTarget = (
        <div
            className={clsx(styles.playTarget, showPlayControls && styles.clickable)}
            onClick={showPlayControls ? handlePlayClick : undefined}
        >
            {getIndexDisplay(true)}
            <div className={clsx(styles.expand, 'hover-only')}>
                <ActionIcon
                    icon="arrowDownS"
                    iconProps={{ color: 'muted', size: 'md' }}
                    onClick={handleExpand}
                    size="xs"
                    variant="subtle"
                />
            </div>
        </div>
    );

    if (enableExpansion) {
        return (
            <TableColumnContainer {...props} className={styles.expansionCell}>
                <div className={styles.expansionInner}>{expansionTarget}</div>
            </TableColumnContainer>
        );
    }

    if (!showPlayControls) {
        return (
            <TableColumnTextContainer {...props}>{getIndexDisplay(false)}</TableColumnTextContainer>
        );
    }

    return (
        <TableColumnTextContainer {...props} className={styles.fullSizeContent}>
            <Flex
                className={clsx(styles.indexContent, styles.clickable)}
                justify="center"
                onClick={handlePlayClick}
                w="100%"
            >
                {getIndexDisplay(false)}
            </Flex>
        </TableColumnTextContainer>
    );
};
