import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    targets: [
        'contracts/jetton/imports/stdlib.fc',
        'contracts/jetton/imports/params.fc',
        'contracts/jetton/imports/op-codes.fc',
        'contracts/jetton/imports/discovery-params.fc',
        'contracts/jetton/imports/jetton-utils.fc',
        'contracts/jetton/jetton-minter.fc',
    ],
};
