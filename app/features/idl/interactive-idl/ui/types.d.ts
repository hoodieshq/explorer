export interface IdlAccount {
    name: string;
    isMut: boolean;
    isSigner: boolean;
    desc?: string;
}

export interface IdlArg {
    name: string;
    type: string;
    desc?: string;
}
