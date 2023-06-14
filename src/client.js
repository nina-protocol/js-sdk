import * as anchor from "@project-serum/anchor";
import Account from "./resources/accounts";
import Release from "./resources/releases";
import Exchange from "./resources/exchanges";
import Hub from "./resources/hubs";
import Post from "./resources/posts";
import Subscription from "./resources/subscriptions";
import Wallet from "./resources/wallet";

import utils from "./utils";
import Http from "./http";

/** Class Representing the Nina Client */
class NinaClient {
  constructor() {
    this.provider = null;
    this.program = null;
    this.endpoint = null;
    this.cluster = null;
    this.programId = null;
    this.apiKey = null;
    this.ids = null;
    this.cluster = "mainnet";

    this.Account = null;
    this.Exchange = null;
    this.Hub = null;
    this.Post = null;
    this.Release = null;
    this.Subscription = null;
    this.Wallet = null;
  }

  /**
   * Initialize the Nina Client Class Object
   * @function init
   * @param {String} endpoint - API endpoint URL (https://api.ninaprotocol.com/v1/)
   * @param {String} rpcEndpoint - Solana RPC URL (https://api.mainnet-beta.solana.com)
   * @param {String} cluster - mainnet or devnet
   * @param {String} programId - Nina Program Id (ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4)
   * @example Nina.client.init(endpoint, cluster, programId)
   */
  async init(
    endpoint,
    rpcEndpoint,
    cluster,
    programId,
    apiKey = undefined,
    wallet = {},
    connection = undefined
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint || "https://api.ninaprotocol.com/v1/"; //NOTE: trailing slash should be removed
    this.rpcEndpoint = rpcEndpoint || "https://api.mainnet-beta.solana.com";
    this.cluster = cluster || "mainnet";
    this.programId = programId || "ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4";
    connection = connection || new anchor.web3.Connection(this.cluster);
    this.provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "processed",
    });
    this.program = await anchor.Program.at(this.programId, this.provider);
    this.ids = utils.NINA_CLIENT_IDS[process.env.SOLANA_CLUSTER];

    const http = new Http({
      endpoint: this.endpoint,
      program: this.program,
      apiKey: this.apiKey,
    });

    const config = {
      http,
      program: this.program,
      provider: this.provider,
      cluster: this.cluster,
    };

    this.Account = new Account(config);
    this.Exchange = new Exchange(config);
    this.Hub = new Hub(config);
    this.Post = new Post(config);
    this.Release = new Release(config);
    this.Subscription = new Subscription(config);
    this.Wallet = new Wallet(config);
  }

  static isSol(mint) {
    return utils.isSol(mint, this.cluster);
  }

  static isUsdc(mint) {
    return utils.isUsdc(mint, this.cluster);
  }

  static nativeToUiString(
    amount,
    mint,
    decimalOverride = false,
    showCurrency = true
  ) {
    return utils.nativeToUiString(
      amount,
      mint,
      this.cluster,
      decimalOverride,
      showCurrency
    );
  }

  static decimalsForMint(mint) {
    return utils.decimalsForMint(mint, this.cluster);
  }

  static nativeToUi(amount, mint) {
    return utils.nativeToUi(amount, mint, this.cluster);
  }

  static uiToNative(amount, mint) {
    return utils.uiToNative(amount, mint, this.cluster);
  }
}

export default new NinaClient();
