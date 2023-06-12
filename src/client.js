import * as anchor from '@project-serum/anchor';
import _ from 'lodash';
import Account from './resources/accounts';
import Release from './resources/releases';
import Exchange from './resources/exchanges';
import Hub from './resources/hubs';
import Post from './resources/posts';
import Subscription from './resources/subscriptions';

import { NINA_CLIENT_IDS } from './utils';
import Http from './http';

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
    this.Account = null;
    this.Release = null;
  }

  /**
   * Initialize the Nina Client Class Object
   * @function init
   * @param {String} endpoint - API endpoint URL (https://api.ninaprotocol.com/v1/)
   * @param {String} cluster - Solana RPC URL (https://api.mainnet-beta.solana.com)
   * @param {String} programId - Nina Program Id (ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4)
   * @example Nina.client.init(endpoint, cluster, programId)
   */
  async init(endpoint, cluster, programId, apiKey = undefined, wallet={}) {
    this.apiKey = apiKey;
    this.endpoint = endpoint || 'https://api.ninaprotocol.com/v1/'; //NOTE: trailing slash should be removed
    this.cluster = cluster || 'https://api.mainnet-beta.solana.com';
    this.programId = programId || 'ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4';
    const connection = new anchor.web3.Connection(this.cluster);
    this.provider = new anchor.AnchorProvider(
      connection,
      wallet,
      {
        commitment: 'confirmed',
        preflightCommitment: 'processed',
      }
    );
    this.program = await anchor.Program.at(this.programId, this.provider);
    this.ids = NINA_CLIENT_IDS[process.env.SOLANA_CLUSTER];
    
    const http = new Http({
      endpoint: this.endpoint,
      program: this.program,
      apiKey: this.apiKey,
    });
    const config = {
      http,
      program: this.program,
      provider: this.provider,
    }
    this.Account = new Account(config);
    this.Exchange = new Exchange(config);
    this.Hub = new Hub(config);
    this.Post = new Post(config);
    this.Release = new Release(config);
    this.Subscription = new Subscription(config);
  }
}
export default new NinaClient();
