import { CompilerConfig } from "@ton/blueprint";

export const compile: CompilerConfig = {
  targets: [
    "contracts/pool.fc",
    "contracts/common/stdlib.fc",
    "contracts/common/stdlib-ext.fc",
    "contracts/common/gas.fc",
    "contracts/common/messages.fc",
    "contracts/pool/op.fc",
    "contracts/pool/params.fc",
    "contracts/pool/errors.fc",
    "contracts/common/utils.fc",
    "contracts/pool/storage.fc",
    "contracts/pool/utils.fc",
    "contracts/pool/jetton-utils.fc",
    "contracts/pool/lp_account-utils.fc",
    "contracts/pool/amm.fc",
    "contracts/pool/get.fc",
    "contracts/pool/router-calls.fc",
    "contracts/pool/getter.fc",
  ],
};
