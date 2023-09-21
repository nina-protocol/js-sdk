import * as anchor from '@coral-xyz/anchor';
import Http from './http'
import Account from './resources/accounts'
import Exchange from './resources/exchanges'
import Hub from './resources/hubs'
import Post from './resources/posts'
import Release from './resources/releases'
import Subscription from './resources/subscriptions'
import Wallet from './resources/wallet'
import {
  decimalsForMint,
  isSol,
  isUsdc,
  nativeToUi,
  nativeToUiString,
  uiToNative,
} from './utils'
import EventEmitter from 'events';

/** Class Representing the Nina Client */
class NinaClient {
  constructor() {
    this.provider = null
    this.program = null
    this.endpoint = null
    this.cluster = null
    this.programId = null
    this.connection = null
    this.apiKey = null
    this.eventEmitter = null
    this.cluster = 'mainnet'

    this.Account = null
    this.Exchange = null
    this.Hub = null
    this.Post = null
    this.Release = null
    this.Subscription = null
    this.Uploader = null
    this.Wallet = null
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
    isNode = false,
  ) {
    this.apiKey = apiKey
    this.endpoint = endpoint || 'https://api.ninaprotocol.com/v1/' //NOTE: trailing slash should be removed
    this.rpcEndpoint = rpcEndpoint || 'https://api.mainnet-beta.solana.com'
    this.cluster = cluster || 'mainnet'
    this.programId = programId || 'ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4'
    this.connection = new anchor.web3.Connection(this.rpcEndpoint)
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    this.program = await anchor.Program.at(this.programId, this.provider)
    this.eventEmitter = new EventEmitter()
    this.isNode = isNode

    const http = new Http({
      endpoint: this.endpoint,
      program: this.program,
      apiKey: this.apiKey,
    })

    const config = {
      http,
      program: this.program,
      provider: this.provider,
      cluster: this.cluster,
      eventEmitter: this.eventEmitter,
      isNode: this.isNode,
    }

    this.Account = new Account(config)
    this.Exchange = new Exchange(config)
    this.Hub = new Hub(config)
    this.Post = new Post(config)
    this.Release = new Release(config)
    this.Subscription = new Subscription(config)
    this.Wallet = new Wallet(config)
  }

  static isSol(mint) {
    return isSol(mint, this.cluster)
  }

  static isUsdc(mint) {
    return isUsdc(mint, this.cluster)
  }

  static nativeToUiString(
    amount,
    mint,
    decimalOverride = false,
    showCurrency = true,
  ) {
    return nativeToUiString(
      amount,
      mint,
      this.cluster,
      decimalOverride,
      showCurrency,
    )
  }

  static decimalsForMint(mint) {
    return decimalsForMint(mint, this.cluster)
  }

  static nativeToUi(amount, mint) {
    return nativeToUi(amount, mint, this.cluster)
  }

  static uiToNative(amount, mint) {
    return uiToNative(amount, mint, this.cluster)
  }

  static truncateAddress(address) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  static formatYYYYMMDD(date) {
    return new Date(date).toISOString().slice(0, 10).replaceAll('-', '/')
  }

  static percentToUi(percent) {
    return percent / 10000
  }

  static formatDuration(duration) {
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration - hours * 3600) / 60)
    const seconds = duration - hours * 3600 - minutes * 60
    let formattedDuration = ''

    if (hours > 0) {
      formattedDuration += `${hours}h`
    }

    if (minutes > 0) {
      formattedDuration += `${minutes}m`
    }

    if (seconds > 0) {
      formattedDuration += `${seconds}s`
    }

    return formattedDuration
  }
}

export default new NinaClient()
