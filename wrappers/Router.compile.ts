import { CompilerConfig } from "@ton/blueprint";

export const compile: CompilerConfig = {
  targets: [
    "contracts/router.fc",
    "contracts/common/stdlib.fc",
    "contracts/common/stdlib-ext.fc",
    "contracts/common/gas.fc",
    "contracts/common/jetton-utils.fc",
    "contracts/common/messages.fc",
    "contracts/router/op.fc",
    "contracts/router/params.fc",
    "contracts/router/errors.fc",
    "contracts/router/storage.fc",
    "contracts/router/utils.fc",
    "contracts/common/utils.fc",
    "contracts/router/get.fc",
    "contracts/router/admin-calls.fc",
    "contracts/router/getter.fc",
  ],
};
