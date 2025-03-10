import { TonClient, TupleBuilder, contractAddress, beginDict, ContractSource, Contract, Address, Cell, toNano, beginCell, TupleSlice } from "ton";
import { SmartContract } from "ton-contract-executor";
import BN from "bn.js";
import { expect } from "chai";
import {
  getUSDTWallet,
  logs,
  ton,
  balances_parse,
  reserves_parse,
  rates_parse,
  hex2a,
  asset_config_parse,
  asset_dynamics_parse,
  internalMessage,
  randomAddress,
  tonConfigCell,
  asset_config_collection_packed_dict,
  asset_dynamics_collection_packed_dict,
  user_principals_packed_dict,
} from "./utils";
import { op } from "./OpCodes";

import { packInitMasterMessage } from "./InitMasterMessage";
import { packMasterData } from "./MasterData";
import { masterCodeCell, userCodeCell } from "./SmartContractsCells";

let contract: SmartContract;

let usdt = randomAddress("");
const admin = Address.parseFriendly("EQDEckMP_6hTVhBLcsdMYmPDm6bLGYOTCkhqP7QrBg-1KaaD").address;
const oracle = admin;

describe("evaa master sc tests", () => {
  beforeEach(async () => {
    contract = await SmartContract.fromCell(masterCodeCell, packMasterData(userCodeCell, admin), {
      debug: true,
    });

    const userContractAddress = contractAddress({
      workchain: 0,
      initialCode: masterCodeCell,
      initialData: packMasterData(userCodeCell, admin),
    });

    console.log(userContractAddress.toFriendly());
    // usdt = randomAddress('usdt')
    usdt = (await getUSDTWallet(userContractAddress)) as Address;
    // usdt = new Address(0, usdt.hash);

    console.log(usdt.toFriendly());
    const tx = await contract.sendInternalMessage(
      internalMessage({
        value: toNano(0),
        from: admin,
        body: packInitMasterMessage(asset_config_collection_packed_dict(usdt), asset_dynamics_collection_packed_dict(usdt)),
      }) as any
    );

    // logs(tx);
  });

  it("master run init user", async () => {
    const tx = await contract.sendInternalMessage(
      internalMessage({
        value: toNano(0),
        from: admin,
        body: packInitMasterMessage(asset_config_collection_packed_dict(usdt), asset_dynamics_collection_packed_dict(usdt)),
      }) as any
    );
    // logs(tx);
    expect(tx.type).equals("success");
  });

  it("master run update token price", async () => {
    // TODO TON ADDRESS
    const tx = await contract.sendInternalMessage(
      internalMessage({
        value: toNano(0),
        from: oracle,
        body: beginCell()
          .storeUint(op.update_price, 32)
          .storeUint(0, 64)
          .storeAddress(ton) // new price
          .storeUint(100, 64) // new price
          .endCell(),
      }) as any
    );
    // logs(tx);
    expect(tx.type).equals("success");
  });

  it("master run update master config", async () => {
    const tx = await contract.sendInternalMessage(
      internalMessage({
        value: toNano(0),
        from: admin,
        body: beginCell().storeUint(op.update_config, 32).storeUint(0, 64).storeRef(asset_config_collection_packed_dict(usdt)).endCell(),
      }) as any
    );
    // logs(tx);
    expect(tx.type).equals("success");
  });

  it("master run get updated rates for usdt", async () => {
    //@ts-ignore
    const tx = await contract.invokeGetMethod("getUpdatedRates", [
      { type: "cell", value: asset_config_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
      { type: "cell", value: asset_dynamics_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
      {
        type: "cell_slice",
        value: beginCell().storeAddress(randomAddress("usdt")).endCell().toBoc({ idx: false }).toString("base64"),
      },
      { type: "int", value: "10" },
    ]);
    // logs(tx);
    // todo
    // const res = tx.result.map(e => BigInt(e));
    // expect(res[0]).equals('success'); // todo
    // expect(res[1]).equals('success');
    expect(tx.type).equals("success");
  });

  it("master run get asset data method", async () => {
    const tx = await contract.invokeGetMethod("getAssetsData", []);
    // logs(tx);
    const dict = asset_dynamics_parse((tx.result[0] as Cell).beginParse());
    // console.log(dict)
    expect(tx.type).equals("success");
  });

  it("master run get ui variables method", async () => {
    const tx = await contract.invokeGetMethod("getUIVariables", []);
    // logs(tx);
    const dict_asset_dynamics = asset_dynamics_parse((tx.result[0] as Cell).beginParse());
    console.log(dict_asset_dynamics);
    const conf = (tx.result[1] as Cell).beginParse();
    const metadata = conf.readRef().readBuffer("Main evaa pool.".length).toString();
    conf.readRef();
    const confRef = conf.readRef();
    const asset_config = asset_config_parse(confRef.readRef());
    console.log(asset_config);
    const rates = rates_parse((tx.result[2] as Cell).beginParse());
    console.log(rates);
    const reserves = reserves_parse((tx.result[3] as Cell).beginParse());
    console.log(reserves);
    expect(tx.type).equals("success");
    expect(metadata).equals("Main evaa pool.");
  });

  it("master get collateralQuote", async () => {
    //@ts-ignore
    const tx = await contract.invokeGetMethod("getCollateralQuote", [
      {
        type: "cell_slice",
        value: beginCell().storeAddress(usdt).endCell().toBoc({ idx: false }).toString("base64"),
      },
      {
        type: "cell_slice",
        value: beginCell().storeAddress(ton).endCell().toBoc({ idx: false }).toString("base64"),
      },
      { type: "int", value: "200" + "000000" },
    ]);
    logs(tx);
    // todo
    console.log(tx.result[0]?.toString());
    // const res = tx.result.map(e => BigInt(e));
    // expect([0]).equals('success'); // todo
    // expect(res[1]).equals('success');
    expect(tx.type).equals("success");
  });

  it("master run send tons", async () => {
    const tx = await contract.sendInternalMessage(
      internalMessage({
        value: toNano(1),
        from: randomAddress("user"),
        body: beginCell().endCell(),
      }) as any
    );
    logs(tx);
    expect(tx.type).equals("success");
  });
});

describe("evaa user sc tests", () => {
  let user_contract: SmartContract;
  beforeEach(async () => {
    user_contract = await SmartContract.fromCell(
      userCodeCell, // code cell from build output
      beginCell().storeAddress(randomAddress("master")).storeAddress(randomAddress("user")).storeDict(beginDict(256).endDict()).storeInt(0, 1).endCell(),
      {
        debug: true,
      }
    );

    const tx = await user_contract.sendInternalMessage(
      internalMessage({
        value: toNano(0),
        from: randomAddress("master"),
        body: beginCell().storeUint(op.init_user, 32).storeUint(0, 64).storeDict(user_principals_packed_dict(usdt)).endCell(),
      }) as any
    );
    // logs(tx);
  });

  it("user run get account asset balance", async () => {
    //@ts-ignore
    const tx = await user_contract.invokeGetMethod("getAccountAssetBalance", [
      {
        type: "cell_slice",
        value: beginCell().storeAddress(usdt).endCell().toBoc({ idx: false }).toString("base64"),
      },
      { type: "int", value: "1000134550000000000" },
      { type: "int", value: "1000432100000000000" },
    ]);
    logs(tx);
    console.log(tx.result[0]?.toString());
    expect(tx.type).equals("success");
  });

  it("user run get is liquidable", async () => {
    //@ts-ignore
    const tx = await user_contract.invokeGetMethod("getIsLiquidable", [
      { type: "cell", value: asset_config_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
      { type: "cell", value: asset_dynamics_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
    ]);
    // logs(tx);
    console.log(tx.result[0]?.toString());
    expect(tx.type).equals("success");
  });

  it("user run get agregated balances", async () => {
    //@ts-ignore
    const tx = await user_contract.invokeGetMethod("getAggregatedBalances", [
      { type: "cell", value: asset_config_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
      { type: "cell", value: asset_dynamics_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
    ]);
    logs(tx);
    console.log(tx.result[0]?.toString());
    console.log(tx.result[1]?.toString());
    expect(tx.type).equals("success");
  });

  it("user run get acc balances method", async () => {
    //@ts-ignore
    const tx = await user_contract.invokeGetMethod("getAccountBalances", [{ type: "cell", value: asset_dynamics_collection_packed_dict.toBoc({ idx: false }).toString("base64") }]);
    // logs(tx);
    console.log(balances_parse((tx.result[0] as Cell).beginParse()));
    expect(tx.type).equals("success");
  });

  it("user run get avl to borr method", async () => {
    //@ts-ignore
    const tx = await user_contract.invokeGetMethod("getAvailableToBorrow", [
      { type: "cell", value: asset_config_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
      { type: "cell", value: asset_dynamics_collection_packed_dict.toBoc({ idx: false }).toString("base64") },
    ]);
    // logs(tx);
    console.log(tx.result[0]?.toString());
    expect(tx.type).equals("success");
  });

  it("user run get test method", async () => {
    const tx = await user_contract.invokeGetMethod("test", []);
    // logs(tx);
    expect(tx.type).equals("success");
  });
});
