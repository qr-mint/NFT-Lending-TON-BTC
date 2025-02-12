import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from "@ton/core";

export type LpWalletConfig = {
  balance: bigint;
  ownerAddress: Address;
  jettonMasterAddress: Address;
  jettonWalletAddress: Address;
};

export function lpWalletConfigToCell(config: LpWalletConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeAddress(config.ownerAddress)
    .storeAddress(config.jettonMasterAddress)
    .storeAddress(config.jettonWalletAddress)
    .endCell();
}

export class LpWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}
  static createFromAddress(address: Address) {
    return new LpWallet(address);
  }

  static createFromConfig(config: LpWalletConfig, code: Cell, workchain = 0) {
    const data = lpWalletConfigToCell(config);
    const init = { code, data };
    return new LpWallet(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /*
      burn#595f07bc query_id:uint64 amount:(VarUInteger 16)
                    response_destination:MsgAddress custom_payload:(Maybe ^Cell)
                    = InternalMsgBody;
    */
  static burnMessage(
    jetton_amount: bigint,
    responseAddress: Address,
    customPayload: Cell | null
  ) {
    return beginCell()
      .storeUint(0x595f07bc, 32)
      .storeUint(0, 64) // op, queryId
      .storeCoins(jetton_amount)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .endCell();
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    jetton_amount: bigint,
    responseAddress: Address,
    customPayload: Cell | null
  ) {
    await provider.internal(via, {
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: LpWallet.burnMessage(jetton_amount, responseAddress, customPayload),
      value: value,
    });
  }
}
