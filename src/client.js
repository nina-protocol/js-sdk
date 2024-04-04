import * as anchor from '@coral-xyz/anchor';
import axios from 'axios'
import Http from './http'
import Account from './resources/accounts'
import Exchange from './resources/exchanges'
import Hub from './resources/hubs'
import Post from './resources/posts'
import Release from './resources/releases'
import Subscription from './resources/subscriptions'
import Search from './resources/search'
import Wallet from './resources/wallet'
import Uploader from './resources/uploader'
import UploaderNode from './resources/uploaderNode'
import {
  decimalsForMint,
  isSol,
  isUsdc,
  nativeToUi,
  nativeToUiString,
  uiToNative,
  findOrCreateAssociatedTokenAccount,
  decodeNonEncryptedByteArray,
  wrapSol,
  getConfirmTransaction,
  NinaProgramAction,
  NinaProgramActionCost,
  calculatePriorityFee,
  addPriorityFeeIx,
} from './utils'

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
    this.uid = null
    this.cluster = 'mainnet'
    this.NinaProgramAction = NinaProgramAction
    this.NinaProgramActionCost = NinaProgramActionCost

    this.Account = null
    this.Exchange = null
    this.Hub = null
    this.Post = null
    this.Release = null
    this.Search = null
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
  async init({
    endpoint,
    rpcEndpoint,
    cluster,
    programId,
    uid = undefined,
    apiKey = undefined,
    wallet = {},
    isNode = false,
  }) {
    this.apiKey = apiKey
    this.uid = uid
    this.endpoint = endpoint || 'https://api.ninaprotocol.com/v1/' //NOTE: trailing slash should be removed
    this.rpcEndpoint = rpcEndpoint || 'https://api.mainnet-beta.solana.com'
    this.cluster = cluster || 'mainnet'
    this.programId = programId || 'ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4'
    this.connection = new anchor.web3.Connection(this.rpcEndpoint)
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    try {
      this.program = await anchor.Program.at(this.programId, this.provider)
    } catch (error) {
      console.error('Error initializing program:', error)
    }
    this.isNode = isNode
    this.confirmTransaction = (txid) =>
      getConfirmTransaction(txid, this.connection)
    this.calculatePriorityFee = calculatePriorityFee
    this.addPriorityFeeIx = addPriorityFeeIx

    if (uid) {
      axios.defaults.headers.common['x-id'] = uid
    }

    if (this.isNode) {
      this.Uploader = new UploaderNode()

      await this.Uploader.init({
        provider: this.provider,
        endpoint: this.endpoint,
        cluster: this.cluster,
      })
    } else {
      if (wallet && wallet.publicKey) {
        this.Uploader = new Uploader()

        await this.Uploader.init({
          provider: this.provider,
          endpoint: this.endpoint,
          cluster: this.cluster,
        })
      }
    }

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
      isNode: this.isNode,
      fileServicePublicKey: new anchor.web3.PublicKey(
        '3skAZNf7EjUus6VNNgHog44JZFsp8BBaso9pBRgYntSd',
      ),
    }

    this.Account = new Account(config)
    this.Exchange = new Exchange(config)
    this.Hub = new Hub(config)
    this.Post = new Post(config)
    this.Release = new Release(config)
    this.Subscription = new Subscription(config)
    this.Search = new Search(config)
    this.Wallet = new Wallet(config)
  }

  static isSol(mint, cluster) {
    return isSol(mint, cluster || this.cluster)
  }

  static isUsdc(mint, cluster) {
    return isUsdc(mint, cluster || this.cluster)
  }

  static wrapSol(connection, publicKey, amount, mint) {
    return wrapSol(connection, publicKey, amount, mint)
  }

  static decodeNonEncryptedByteArray(byteArray) {
    return decodeNonEncryptedByteArray(byteArray)
  }

  static getConfirmTransaction = async (txid, connection) => {
    return getConfirmTransaction(txid, connection)
  }

  static findOrCreateAssociatedTokenAccount(
    connection,
    payer,
    owner,
    systemProgramId,
    mint,
  ) {
    return findOrCreateAssociatedTokenAccount(
      connection,
      payer,
      owner,
      systemProgramId,
      mint,
    )
  }

  static nativeToUiString(
    amount,
    mint,
    cluster,
    decimalOverride = false,
    showCurrency = true,
  ) {
    return nativeToUiString(
      amount,
      mint,
      cluster || this.cluster,
      decimalOverride,
      showCurrency,
    )
  }

  static decimalsForMint(mint, cluster) {
    return decimalsForMint(mint, cluster || this.cluster)
  }

  static nativeToUi(amount, mint, cluster) {
    return nativeToUi(amount, mint, cluster || this.cluster)
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
