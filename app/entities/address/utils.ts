export const truncateAddress = (address: string, padLeft = 4, padRight: number = padLeft) => {
    if (address.length <= padLeft + padRight) {
        return address;
    }

    return `${address.slice(0, padLeft)}..${address.slice(-1 * padRight)}`;
};
