import { ReactNode } from 'react';

import styles from './row-play-control-cell.module.css';

import { Play } from '/@/shared/types/types';

export const ItemDetailRowPlayControlCell = ({
    indexContent,
    onPlay,
    showPlayControls,
}: {
    indexContent: ReactNode;
    onPlay: (playType: Play) => void;
    showPlayControls: boolean;
}) => {
    if (!showPlayControls) {
        return <>{indexContent}</>;
    }

    return (
        <div
            className={styles.cellWrapper}
            onClick={(e) => {
                e.stopPropagation();
                onPlay(Play.NOW);
            }}
            style={{ cursor: 'pointer' }}
        >
            {indexContent}
        </div>
    );
};
