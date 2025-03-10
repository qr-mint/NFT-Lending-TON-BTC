import BN from "bn.js";
import {
  beginCell,
  TonClient,
  parseDict,
  DictBuilder,
  BitString,
  beginDict,
  Address,
  Cell,
  CellMessage,
  InternalMessage,
  CommonMessageInfo,
  WalletContract,
  SendMode,
  Wallet,
} from "ton";
import { SmartContract } from "ton-contract-executor";
import Prando from "prando";

export const zeroAddress = new Address(0, Buffer.alloc(32, 0));

export function randomAddress(seed: string, workchain?: number) {
  // if (seed === 'ton') {
  //   return new Address(workchain ?? 0, new Buffer(0x1a4219fe5e60d63af2a3cc7dce6fec69b45c6b5718497a6148e7c232ac87bd8a))
  // }
  const random = new Prando(seed);
  const hash = Buffer.alloc(32);
  for (let i = 0; i < hash.length; i++) {
    hash[i] = random.nextInt(0, 256);
  }
  return new Address(workchain ?? 0, hash);
}

// export const ton = new BN(0x1a4219fe5e60d63af2a3cc7dce6fec69b45c6b5718497a6148e7c232ac87bd8a.toString(10))
// export const ton = randomAddress('ton')
export const ton = Address.parseRaw("0:1a4219fe5e60d63af2a3cc7dce6fec69b45c6b5718497a6148e7c232ac87bd8a");

// console.log(ton.toString())
// used with ton-contract-executor (unit tests) to sendInternalMessage easily
export function internalMessage(params: { from?: Address; to?: Address; value?: BN; bounce?: boolean; body?: Cell }) {
  const message = params.body ? new CellMessage(params.body) : undefined;
  return new InternalMessage({
    from: params.from ?? randomAddress("sender"),
    to: params.to ?? zeroAddress,
    value: params.value ?? 0,
    bounce: params.bounce ?? true,
    body: new CommonMessageInfo({ body: message }),
  });
}

// temp fix until ton-contract-executor (unit tests) remembers c7 value between calls
export function setBalance(contract: SmartContract, balance: BN) {
  contract.setC7Config({
    balance: new BN(balance),
  });
}

// helper for end-to-end on-chain tests (normally post deploy) to allow sending InternalMessages to contracts using a wallet
export async function sendInternalMessageWithWallet(params: { walletContract: WalletContract; secretKey: Buffer; to: Address; value: BN; bounce?: boolean; body?: Cell }) {
  const message = params.body ? new CellMessage(params.body) : undefined;
  const seqno = await params.walletContract.getSeqNo();
  const transfer = params.walletContract.createTransfer({
    secretKey: params.secretKey,
    seqno: seqno,
    sendMode: SendMode.PAY_GAS_SEPARATLY + SendMode.IGNORE_ERRORS,
    order: new InternalMessage({
      to: params.to,
      value: params.value,
      bounce: params.bounce ?? false,
      body: new CommonMessageInfo({
        body: message,
      }),
    }),
  });
  await params.walletContract.client.sendExternalMessage(params.walletContract, transfer);
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    const seqnoAfter = await params.walletContract.getSeqNo();
    if (seqnoAfter > seqno) return;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const logs = (tx: any) => {
  console.log("--------------");
  console.log(tx.debugLogs);
  console.log(tx.result);
  console.log(tx.type);
  console.log(tx.exit_code);
  console.log(tx.gas_consumed);
  console.log("--------------");
};

export const user_principals_packed_dict = (usdt: Address) => {
  const user_principals = beginDict(256);

  const usdtPositionPrincipal = beginCell()
    .storeInt(-200 * 1000000, 64)
    .endCell();

  const tonPositionPrincipal = beginCell()
    .storeInt(100 * 100000000, 64)
    .endCell();

  user_principals.storeCell(ton.hash, tonPositionPrincipal);
  user_principals.storeCell(usdt.hash, usdtPositionPrincipal);

  return user_principals.endCell();
};

export const asset_dynamics_collection_packed_dict = (usdt: Address, deploy?: boolean) => {
  const asset_dynamics_collection = new DictBuilder(256);
  const tonDataCell = beginCell()
    .storeUint(deploy ? 0 : 2000000000, 64)
    .storeUint(new BN(deploy ? "DE0B6B3A7640000" : "DE253E29D831800", "hex"), 64)
    .storeUint(new BN(deploy ? "DE0B6B3A7640000" : "DE31F56D48C6000", "hex"), 64)
    .storeUint(deploy ? 0 : 40000000000, 64)
    .storeUint(deploy ? 0 : 35000000000, 64)
    .storeUint(Math.floor(new Date().getTime() / 1000), 32)
    .storeUint(deploy ? 0 : 10000000000, 64)
    .endCell();

  const usdtDataCell = beginCell()
    .storeUint(1000000000, 64)
    .storeUint(new BN("DE1311304585C00", "hex"), 64)
    .storeUint(new BN("DE23FB1C665E800", "hex"), 64)
    .storeUint(500000000, 64) //todo
    .storeUint(400000000, 64) //todo
    .storeUint(Math.floor(new Date().getTime() / 1000), 32)
    .storeUint(100000000, 64)
    .endCell();
  asset_dynamics_collection.storeCell(ton.hash, tonDataCell);
  asset_dynamics_collection.storeCell(usdt.hash, usdtDataCell);
  return asset_dynamics_collection.endCell();
};
export function bufferToBigInt(buffer: Buffer): bigint {
  const bufferHex = buffer.toString("hex");
  // Seems stupid to have string as an intermediate step
  return BigInt("0x" + bufferHex);
}
export const asset_config_collection_packed_dict = (usdt: Address) => {
  const asset_config_collection = new DictBuilder(256);
  const tonConfigCell = beginCell()
    .storeAddress(Address.parseFriendly("EQDEckMP_6hTVhBLcsdMYmPDm6bLGYOTCkhqP7QrBg-1KaaD").address)
    .storeUint(8, 8)
    .storeRef(
      beginCell()
        .storeUint(8300, 16)
        .storeUint(9000, 16)
        .storeUint(500, 16)
        .storeUint(15854895991, 64)
        .storeUint(25000000000, 64)
        .storeUint(187500000000, 64)
        .storeUint(10000000000, 64)
        .storeUint(100000000000, 64)
        .storeUint(new BN("B1A2BC2EC500000", "hex"), 64) // todo move to BN
        .endCell()
    )
    .endCell();

  const usdtConfigCell = beginCell()
    .storeAddress(Address.parseFriendly("EQDEckMP_6hTVhBLcsdMYmPDm6bLGYOTCkhqP7QrBg-1KaaD").address)
    .storeUint(6, 8)
    .storeRef(
      beginCell()
        .storeUint(8000, 16)
        .storeUint(8500, 16)
        .storeUint(700, 16)
        .storeUint(20611364789, 64)
        .storeUint(32500000000, 64)
        .storeUint(243750000000, 64)
        .storeUint(13000000000, 64)
        .storeUint(130000000000, 64)
        .storeUint(new BN("C7D713B49DA0000", "hex"), 64)
        .endCell()
    )
    .endCell();

  // console.log(usdt.hash.length)
  asset_config_collection.storeCell(ton.hash, tonConfigCell);
  // console.log(new BN(0x1a4219fe5e60d63af2a3cc7dce6fec69b45c6b5718497a6148e7c232ac87bd8a.toString(10)).bitLength())
  asset_config_collection.storeCell(usdt.hash, usdtConfigCell);
  return asset_config_collection.endCell();
};

export const asset_dynamics_parse = (dict: any) => {
  const data_dict = parseDict(dict, 256, (i) => ({
    price: BigInt(i.readUint(64).toString()),
    s_rate: BigInt(i.readUint(64).toString()),
    b_rate: BigInt(i.readUint(64).toString()),
    totalSupply: BigInt(i.readUint(64).toString()),
    totalBorrow: BigInt(i.readUint(64).toString()),
    lastAccural: BigInt(i.readUint(32).toString()),
    balance: BigInt(i.readUint(64).toString()),
  }));
  return data_dict;
};

export const asset_config_parse = (dict: any) => {
  const data_dict = parseDict(dict, 256, (src) => {
    const oracle = src.readAddress(); //store_slice(oracle)
    const decimals = BigInt(src.readUint(8).toString()); //.store_uint(decimals, 8)
    const ref = src.readRef(); //.store_ref(begin_cell()
    const collateralFactor = BigInt(ref.readUint(16).toString()); //.store_uint(collateral_factor, 16)
    const liquidationThreshold = BigInt(ref.readUint(16).toString()); //.store_uint(liquidation_threshold, 16)
    const liquidationPenalty = BigInt(ref.readUint(16).toString()); // .store_uint(liquidation_penalty, 16)
    const baseBorrowRate = BigInt(ref.readUint(64).toString()); //.store_uint(base_borrow_rate, 64)
    const borrowRateSlopeLow = BigInt(ref.readUint(64).toString()); //.store_uint(borrow_rate_slope_low, 64)
    const borrowRateSlopeHigh = BigInt(ref.readUint(64).toString()); //.store_uint(supply_rate_slope_low, 64)
    const supplyRateSlopeLow = BigInt(ref.readUint(64).toString()); //.store_uint(supply_rate_slope_low, 64)
    const supplyRateSlopeHigh = BigInt(ref.readUint(64).toString()); //.store_uint(supply_rate_slope_high, 64)
    const targeUtilization = BigInt(ref.readUint(64).toString()); //.store_uint(target_utilization, 64)

    return {
      oracle,
      decimals,
      collateralFactor,
      liquidationThreshold,
      liquidationPenalty,
      baseBorrowRate,
      borrowRateSlopeLow,
      borrowRateSlopeHigh,
      supplyRateSlopeLow,
      supplyRateSlopeHigh,
      targeUtilization,
    };
  });
  return data_dict;
};

export const rates_parse = (dict: any) => {
  const data_dict = parseDict(dict, 256, (i) => ({
    s_rate_per_second: BigInt(i.readUint(64).toString()),
    b_rate_per_second: BigInt(i.readUint(64).toString()),
  }));
  return data_dict;
};

export const reserves_parse = (dict: any) => {
  const data_dict = parseDict(dict, 256, (i) => ({
    reserve: BigInt(i.readInt(65).toString()),
  }));
  return data_dict;
};

export const balances_parse = (dict: any) => {
  const data_dict = parseDict(dict, 256, (i) => ({
    balance: BigInt(i.readInt(65).toString()),
  }));
  return data_dict;
};

export function hex2a(hexx: any) {
  var hex = hexx.toString(); //force conversion
  var str = "";
  for (var i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

export const getUSDTWallet = async (address: Address) => {
  const jettonWalletAddressMain = "EQDLqyBI-LPJZy-s2zEZFQMyF9AU-0DxDDSXc2fA-YXCJIIq"; // todo calculate jeton wallet
  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "49d23d98ab44004b72a7be071d615ea069bde3fbdb395a958d4dfcb4e5475f54",
  });

  const cell = new Cell();
  cell.bits.writeAddress(address);
  const cellBoc = cell.toBoc({ idx: false }).toString("base64");
  const { stack } = await client.callGetMethod(Address.parseFriendly(jettonWalletAddressMain).address, "get_wallet_address", [["tvm.Slice", cellBoc]]);

  return Cell.fromBoc(Buffer.from(stack[0][1].bytes, "base64"))[0].beginParse().readAddress();
};
