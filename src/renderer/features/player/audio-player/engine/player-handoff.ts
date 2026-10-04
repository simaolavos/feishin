export const playerHandoff = {
    // Outlives remounts of the player bar: empty means no cast device is connected
    castDeviceName: '',
    pendingLocalSeek: -1,
};

export const setCastDeviceName = (name: string) => {
    playerHandoff.castDeviceName = name;
};
