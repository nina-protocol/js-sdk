import * as anchor from '@coral-xyz/anchor';
import axios from 'axios'
import CryptoJS from 'crypto-js'
import Promise from 'promise'
import {
  MAX_U64,
  NINA_CLIENT_IDS,
  decodeNonEncryptedByteArray,
  findOrCreateAssociatedTokenAccount,
  getConfirmTransaction,
  isSol,
  readFileChunked,
  uiToNative,
  wrapSol,
  getLatestBlockhashWithRetry,
  addPriorityFeeIx,
  fetchWithRetry,
  simulateWithRetry,
  sleep,
} from '../utils'
import { createInitializeMint2Instruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import UploaderNode from './uploaderNode';
import Uploader from './uploader';

/**
 * @module Release
 */

export default class Release {
  constructor({ program, provider, http, cluster, isNode, fileServicePublicKey }) {
    this.program = program
    this.provider = provider
    this.http = http
    this.cluster = cluster
    this.isNode = isNode
    this.fileServicePublicKey = fileServicePublicKey
  }
  /**
   * @function fetchAll
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Release accounts.
   * @example const releases = await NinaClient.Release.fetchAll();
   * @returns {Array} an array of all of the Releases on Nina.
   */
  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination

    return this.http.get(
      '/releases',
      {
        limit: limit || 20,
        offset: offset || 0,
        sort: sort || 'desc',
        ...pagination,
      },
      withAccountData,
    )
  }

  /**
   * @function fetch
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Release account and include in the response object.
   * @example const release = await NinaClient.Release.fetch("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Object} an object containing the Release data.
   */

  async fetch(publicKey, query = {}, withAccountData = false) {
    return this.http.get(`/releases/${publicKey}`, query, withAccountData)
  }

  /**
   * @function fetchCollectors
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withCollection = false] - A boolean determining wether or not to fetch collectors' collections and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const collectors = await NinaClient.Release.fetchCollectors("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the collectors of a Release.
   */

  async fetchCollectors(publicKey, pagination = {}, withCollection = false) {
    return this.http.get(
      `/releases/${publicKey}/collectors${
        withCollection ? '?withCollection=true' : ''
      }`,
      pagination,
    )
  }

  /**
   * @function fetchHubs
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Hub account and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const hubs = await NinaClient.Release.fetchHubs("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Hubs that a Release belongs to.
   */

  async fetchHubs(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/releases/${publicKey}/hubs`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchExchanges
   * @param {String} publicKey - The public key of the release.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Exchange account and include in the response object.
   * @example const exchanges = await NinaClient.Release.fetchExchanges("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Exchanges that belong to a Release.
   */

  async fetchExchanges(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/releases/${publicKey}/exchanges`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchRevenueShareRecipients
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Release account and royalty recipients and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const revenueShareRecipients = await fetchRevenueShareRecipients("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Revenue Share Recipients that belong to a Release.
   */

  async fetchRevenueShareRecipients(
    publicKey,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/releases/${publicKey}/revenueShareRecipients`,
      pagination,
      withAccountData,
    )
  }

  /**
   *
   * @function releasePurchase
   * @description Purchases a Release outside of a Hub.
   * @param {Object} client - The Nina Client instance.
   * @param {String} releasePublicKey - The public key of the Release being purchased.
   * @example await NinaClient.Releases.releasePurchase(ninaClient, "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW");
   * @returns {String} the Release that was Purchased.
   */

  async purchase(releasePublicKey, hubPublicKey = undefined) {
    try {
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)
      const release = await this.program.account.release.fetch(releasePublicKey)
      let [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        release.paymentMint,
      )
      const [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          release.releaseMint,
        )

      const instructions = []

      if (receiverReleaseTokenAccountIx) {
        instructions.push({
          instructions: [receiverReleaseTokenAccountIx],
          cleanupInstructions: [],
          signers: [],
        })
      }

      if (isSol(release.paymentMint, this.cluster)) {
        const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
          this.provider,
          release.price,
          release.paymentMint,
        )

        instructions.push(...wrappedSolInstructions)
        payerTokenAccount = wrappedSolAccount
      }

      const accounts = {
        payer: this.provider.wallet.publicKey,
        receiver: this.provider.wallet.publicKey,
        release: releasePublicKey,
        releaseSigner: release.releaseSigner,
        payerTokenAccount,
        receiverReleaseTokenAccount,
        royaltyTokenAccount: release.royaltyTokenAccount,
        releaseMint: release.releaseMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      }

      let tx

      if (hubPublicKey) {
        const hub = await this.program.account.hub.fetch(hubPublicKey)

        const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
            hubPublicKey.toBuffer(),
            releasePublicKey.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
            hubPublicKey.toBuffer(),
            releasePublicKey.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
            hubPublicKey.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubWallet] = await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          hubSigner,
          anchor.web3.SystemProgram.programId,
          release.paymentMint,
        )
        accounts.hub = new anchor.web3.PublicKey(hubPublicKey)
        accounts.hubRelease = hubRelease
        accounts.hubContent = hubContent
        accounts.hubSigner = hubSigner
        accounts.hubWallet = hubWallet

        tx = await this.program.methods
          .releasePurchaseViaHub(
            release.price,
            decodeNonEncryptedByteArray(hub.handle),
          )
          .accounts(accounts)
          .preInstructions(instructions)
          .transaction()
      } else {
        tx = await this.program.methods
          .releasePurchase(release.price)
          .accounts(accounts)
          .preInstructions(instructions || [])
          .transaction()
      }

      tx.recentBlockhash = (
        await this.provider.connection.getLatestBlockhashAndContext()
      ).value.blockhash
      tx.feePayer = this.provider.wallet.publicKey
      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )
      await getConfirmTransaction(txid, this.provider.connection)
      await axios.get(
        `${
          this.http.endpoint
        }/accounts/${this.provider.wallet.publicKey.toBase58()}/collected?txId=${txid}`,
      )
      const newRelease = await this.fetch(releasePublicKey.toBase58(), true)

      return {
        release: newRelease,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function initializeReleaseAndMint
   * @description Initializes a release and mints the first edition.
   * @param {Object} client - The Nina Client instance.
   * @param {String} hubPublicKey - The public key of the Hub that the Release will be initialized to, if applicable.
   * @example await NinaClient.Releases.initializeReleaseAndMint(ninaClient, "2CMyS4k6HQvLVdA2DxB6em3izhNw7uq2hzX7E4f7UJ3f");
   * @returns {Object} the Release, Release bump, Release mint, and Hub Release.
   */

  async initializeReleaseAndMint(hubPublicKey) {
    try {
      const releaseMint = anchor.web3.Keypair.generate()

      const [release, releaseBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-release')),
            releaseMint.publicKey.toBuffer(),
          ],
          this.program.programId,
        )

      let hubRelease

      if (hubPublicKey) {
        const [_hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId,
        )

        hubRelease = _hubRelease
      }

      return {
        release,
        releaseBump,
        releaseMint,
        hubRelease,
      }
    } catch (error) {
      console.warn(error)

      return false
    }
  }

  /**
   *
   * @function releaseInit
   * @description Initializes and creates a Release without a Hub. Once a Release is created, it can be listened to or purchased.
   * @param {Number} retailPrice - The retail price of the Release.
   * @param {Number} amount - The number of editions available for a Release.
   * @param {Number} resalePercentage - The resale percentage of the Release. When a Release is resold on an Exchange, the authority of the Release receives this percentage of the resale price.
   * @param {String} artist - The name of the artist for the Release.
   * @param {String} title - The title of the Release.
   * @param {String} catalogNumber - The catalog number of the Release. Similar to the categorical system that record labels use i.e. NINA001.
   * @param {String} metadataUri - The Arweave URI of the Metadata JSON for the Release.
   * @param {Boolean} isUsdc - A boolean determining wether the Release priced in USDC or not.
   * @param {String} release - The PDA derived from releaseMint that will become the Release Account via initializeReleaseAndMint().
   * @param {String} releaseBump - The Release bump from Release PDA.
   * @param {String} releaseMint - The Release mint of the Release.
   * @param {Boolean} isOpen - A boolean determining if the Release is open or not. If a Release is open, the Release will have an unlimited number of editions.
   * @example const release = await NinaClient.Releases.releaseInit(ninaClient, 10, 100, 20, "dBridge", "Pantheon", "TRUETO004", "https://arweave.net/797hCskMy6lndMc4rN7ovp7NfNsDCJhNdKaCSrl_G0U", true, release, releaseBump, releaseMint, false);
   * @returns {Object} the created Release.
   */

  // TODO: this doesn't follow asTx pattern
  async releaseInit(
    authority,
    retailPrice,
    amount,
    resalePercentage,
    title,
    description,
    catalogNumber,
    isOpen,
    artworkFile,
    audioFiles,
    isUsdc,
    trackMap,
    hubPublicKey = undefined,
    tags = [],
    simulate=false
  ) {
    try {
      const { release, releaseBump, releaseMint } =
        await this.initializeReleaseAndMint()

        if (simulate) {
          const simulationResponse = await simulateWithRetry(this.simulateReleaseInit({
            release,
            releaseBump,
            releaseMint,
            authority,
            retailPrice,
            amount,
            resalePercentage,
            title,
            description,
            catalogNumber,
            isOpen,
            isUsdc,
            hubPublicKey,
          }))
          if (simulationResponse?.value?.err) {
            console.warn('simulationResponse', simulationResponse)
            throw new Error(`Error while simulating Release Init: ${JSON.stringify(simulationResponse.value)}`)
          }
        }
      let ninaUploader
      if (this.isNode) {
        ninaUploader = new UploaderNode()
      } else {
        ninaUploader = new Uploader()
      }

      ninaUploader = await ninaUploader.init({
        provider: this.provider,
        endpoint: this.http.endpoint,
        cluster: this.cluster,
      });
      if (!ninaUploader.hasBalanceForFiles([artworkFile, ...audioFiles])) {
        throw new Error('Insufficient upload balance for files')
      }

      if (!ninaUploader.isValidArtworkFile(artworkFile)) {
        throw new Error('Invalid artwork file')
      }

      for (const audioFile of audioFiles) {
        if (!ninaUploader.isValidAudioFile(audioFile)) {
          throw new Error('Invalid audio files')
        }
      }
      
      const totalFiles = audioFiles.length + 2
      const artworkTx = await ninaUploader.uploadFile(artworkFile, 0, totalFiles)
      const files = []
      for await (const audioFile of audioFiles) {
        const trackTx = await ninaUploader.uploadFile(audioFile, files.length + 1, totalFiles)
        files.push({
          uri: `https://www.arweave.net/${trackTx}`,
          track: trackMap[audioFile.originalname].trackNumber,
          track_title: trackMap[audioFile.originalname].title,
          duration: trackMap[audioFile.originalname].duration,
          type: 'audio/mpeg',
        })
      }
      
      const metadataJson = this.createReleaseMetadataJson({
        releasePublicKey: release.toBase58(),
        title,
        sellerFeeBasisPoints: resalePercentage,
        catalogNumber,
        description,
        files,
        artworkTx,
        tags,
      })
      const metadataBuffer = await ninaUploader.convertMetadataJSONToBuffer(metadataJson)
      const metadataTx = await ninaUploader.uploadFile(metadataBuffer, totalFiles - 1, totalFiles, 'metadata.json')

      const paymentMint = new anchor.web3.PublicKey(
        isUsdc ? NINA_CLIENT_IDS[this.cluster].mints.usdc : NINA_CLIENT_IDS[this.cluster].mints.wsol,
      )

      const [releaseSigner, releaseSignerBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [release.toBuffer()],
          this.program.programId,
        )

      const lamports = await getMinimumBalanceForRentExemptMint(this.provider.connection);

      const releaseMintCreateIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: releaseMint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })


      const releaseMintInitializeIx = createInitializeMint2Instruction(
        releaseMint.publicKey,
        0,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        TOKEN_PROGRAM_ID,
      )

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          new anchor.web3.PublicKey(authority),
          anchor.web3.SystemProgram.programId,
          paymentMint,
        )

      const [royaltyTokenAccount, royaltyTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          releaseSigner,
          anchor.web3.SystemProgram.programId,
          paymentMint,
          true,
        )
      const instructions = [addPriorityFeeIx, releaseMintCreateIx, releaseMintInitializeIx, royaltyTokenAccountIx]

      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx)
      }

      const now = new Date()
      const editionAmount = isOpen ? MAX_U64 : amount

      const config = {
        amountTotalSupply: new anchor.BN(editionAmount),
        amountToArtistTokenAccount: new anchor.BN(0),
        amountToVaultTokenAccount: new anchor.BN(0),
        resalePercentage: new anchor.BN(resalePercentage * 10000),
        price: new anchor.BN(uiToNative(retailPrice, paymentMint, this.cluster)),
        releaseDatetime: new anchor.BN(now.getTime() / 1000),
      }

      const metadataProgram = new anchor.web3.PublicKey(
        NINA_CLIENT_IDS[this.cluster].programs.metaplex,
      )

      const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          metadataProgram.toBuffer(),
          releaseMint.publicKey.toBuffer(),
        ],
        metadataProgram,
      )

      const nameBuf = Buffer.from(title.replaceAll(/[^\w\s]/gi, '').substring(0, 32))
      const nameBufString = nameBuf.slice(0, 32).toString()
      const symbolBuf = Buffer.from(catalogNumber.replaceAll(/[^\w\s]/gi, '').substring(0, 10))
      const symbolBufString = symbolBuf.slice(0, 10).toString()

      const metadataData = {
        name: nameBufString,
        symbol: symbolBufString,
        uri: `https://arweave.net/${metadataTx}`,
        sellerFeeBasisPoints: resalePercentage * 100,
      }

      const bumps = {
        release: releaseBump,
        signer: releaseSignerBump,
      }

      const accounts = {
        release,
        releaseSigner,
        releaseMint: releaseMint.publicKey,
        payer: this.provider.wallet.publicKey,
        authority: new anchor.web3.PublicKey(authority),
        authorityTokenAccount,
        paymentMint,
        royaltyTokenAccount,
        metadata,
        metadataProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }

      let tx

      if (hubPublicKey) {
        const hub = await this.program.account['hub'].fetch(
          new anchor.web3.PublicKey(hubPublicKey),
        )

        const [hubCollaborator] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from(
                anchor.utils.bytes.utf8.encode('nina-hub-collaborator'),
              ),
              new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
              new anchor.web3.PublicKey(authority).toBuffer(),
            ],
            this.program.programId,
          )

        const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          ],
          this.program.programId,
        )

        const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubWallet] = await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          hubSigner,
          anchor.web3.SystemProgram.programId,
          paymentMint,
        )

        accounts.hub = new anchor.web3.PublicKey(hubPublicKey)
        accounts.hubSigner = hubSigner
        accounts.hubCollaborator = hubCollaborator
        accounts.hubRelease = hubRelease
        accounts.hubContent = hubContent
        accounts.hubWallet = hubWallet
          
        releaseInitIx = await this.program.methods
          .releaseInitViaHubV0(
            config,
            bumps,
            metadataData,
          )
          .accounts(accounts)
          .instruction()
      } else {
        releaseInitIx = await this.program.methods
          .releaseInit(config, bumps, metadataData)
          .accounts(accounts)
          .instruction()

      }
      instructions.push(releaseInitIx)

      const latestBlockhash = await this.provider.connection.getLatestBlockhashAndContext()
      const lastValidBlockHeight = latestBlockhash.context.slot + 150

      const lookupTableAddress = this.cluster === 'mainnet' ? 'AGn3U5JJoN6QXaaojTow2b3x1p4ucPs8SbBpQZf6c1o9' : 'Bx9XmjHzZikpThnPSDTAN2sPGxhpf41pyUmEQ1h51QpH'
      const lookupTablePublicKey = new anchor.web3.PublicKey(lookupTableAddress)
      const lookupTableAccount = await this.provider.connection.getAddressLookupTable(lookupTablePublicKey);
      
      const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: this.provider.wallet.publicKey,
        recentBlockhash: latestBlockhash.value.blockhash,
        instructions: instructions,
      }).compileToV0Message([lookupTableAccount.value]);
      tx = new anchor.web3.VersionedTransaction(messageV0)
      tx.sign([releaseMint])
      const signedTx = await this.provider.wallet.signTransaction(tx);
      const rawTx = signedTx.serialize()
      let blockheight = await this.provider.connection.getBlockHeight();

      let txid
      let attempts = 0
      while (blockheight < lastValidBlockHeight && !txid && attempts < 50) {
        try {
          attempts+=1
          const tx = await this.provider.connection.sendRawTransaction(rawTx);
          await getConfirmTransaction(tx, this.provider.connection)
          txid = tx
        } catch (error) {
          console.log('failed attempted to send release init tx: ', error)
          await sleep(500)
          blockheight = await this.provider.connection.getBlockHeight();
          console.log('failed attempted to send release init tx, retrying from blockheight: ', blockheight)
        }
      }
      await getConfirmTransaction(txid, this.provider.connection)
      await sleep(2500)
      const createdRelease = await this.fetch(release.toBase58(), { txid })
      return {
        release: createdRelease,
        releasePublicKey: release.toBase58(),
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  async simulateReleaseInit({
    release,
    releaseBump,
    releaseMint,
    authority,
    retailPrice,
    amount,
    resalePercentage,
    title,
    catalogNumber,
    isOpen,
    isUsdc,
    hubPublicKey = undefined,
  }) {
    try {
      const paymentMint = new anchor.web3.PublicKey(
        isUsdc ? NINA_CLIENT_IDS[this.cluster].mints.usdc : NINA_CLIENT_IDS[this.cluster].mints.wsol,
      )

      const [releaseSigner, releaseSignerBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [release.toBuffer()],
          this.program.programId,
        )

      const lamports = await getMinimumBalanceForRentExemptMint(this.provider.connection);

      const releaseMintCreateIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: releaseMint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })


      const releaseMintInitializeIx = createInitializeMint2Instruction(
        releaseMint.publicKey,
        0,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        TOKEN_PROGRAM_ID,
      )

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          new anchor.web3.PublicKey(authority),
          anchor.web3.SystemProgram.programId,
          paymentMint,
        )

      const [royaltyTokenAccount, royaltyTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          releaseSigner,
          anchor.web3.SystemProgram.programId,
          paymentMint,
          true,
        )

      const instructions = [addPriorityFeeIx, releaseMintCreateIx, releaseMintInitializeIx, royaltyTokenAccountIx]

      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx)
      }

      const now = new Date()
      const editionAmount = isOpen ? MAX_U64 : amount

      const config = {
        amountTotalSupply: new anchor.BN(editionAmount),
        amountToArtistTokenAccount: new anchor.BN(0),
        amountToVaultTokenAccount: new anchor.BN(0),
        resalePercentage: new anchor.BN(resalePercentage * 10000),
        price: new anchor.BN(uiToNative(retailPrice, paymentMint, this.cluster)),
        releaseDatetime: new anchor.BN(now.getTime() / 1000),
      }

      const metadataProgram = new anchor.web3.PublicKey(
        NINA_CLIENT_IDS[this.cluster].programs.metaplex,
      )

      const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          metadataProgram.toBuffer(),
          releaseMint.publicKey.toBuffer(),
        ],
        metadataProgram,
      )

      const nameBuf = Buffer.from(`${title}`.substring(0, 32))
      const nameBufString = nameBuf.slice(0, 32).toString()
      const symbolBuf = Buffer.from(catalogNumber.substring(0, 10))
      const symbolBufString = symbolBuf.slice(0, 10).toString()

      const metadataData = {
        name: nameBufString,
        symbol: symbolBufString,
        uri: `https://arweave.net/simulation`,
        sellerFeeBasisPoints: resalePercentage * 100,
      }

      const bumps = {
        release: releaseBump,
        signer: releaseSignerBump,
      }

      const accounts = {
        release,
        releaseSigner,
        releaseMint: releaseMint.publicKey,
        payer: this.provider.wallet.publicKey,
        authority: new anchor.web3.PublicKey(authority),
        authorityTokenAccount,
        paymentMint,
        royaltyTokenAccount,
        metadata,
        metadataProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }

      let tx
      let releaseInitIx
      if (hubPublicKey) {
        const hub = await this.program.account['hub'].fetch(
          new anchor.web3.PublicKey(hubPublicKey),
        )

        const [hubCollaborator] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from(
                anchor.utils.bytes.utf8.encode('nina-hub-collaborator'),
              ),
              new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
              new anchor.web3.PublicKey(authority).toBuffer(),
            ],
            this.program.programId,
          )

        const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          ],
          this.program.programId,
        )

        const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId,
        )

        const [hubWallet] = await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          hubSigner,
          anchor.web3.SystemProgram.programId,
          paymentMint,
        )

        accounts.hub = new anchor.web3.PublicKey(hubPublicKey)
        accounts.hubSigner = hubSigner
        accounts.hubCollaborator = hubCollaborator
        accounts.hubRelease = hubRelease
        accounts.hubContent = hubContent
        accounts.hubWallet = hubWallet
          
        releaseInitIx = await this.program.methods
          .releaseInitViaHubV0(
            config,
            bumps,
            metadataData,
          )
          .accounts(accounts)
          .instruction()

      } else {
        releaseInitIx = await this.program.methods
          .releaseInit(
            config,
            bumps,
            metadataData,
          )
          .accounts(accounts)
          .instruction()
      }
      instructions.push(releaseInitIx)
      
      const latestBlockhash = await getLatestBlockhashWithRetry(this.provider.connection)
      const lookupTableAddress = this.cluster === 'mainnet' ? 'AGn3U5JJoN6QXaaojTow2b3x1p4ucPs8SbBpQZf6c1o9' : 'Bx9XmjHzZikpThnPSDTAN2sPGxhpf41pyUmEQ1h51QpH'
      const lookupTablePublicKey = new anchor.web3.PublicKey(lookupTableAddress)
      const lookupTableAccount = await this.provider.connection.getAddressLookupTable(lookupTablePublicKey);
      const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: this.provider.wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: instructions,
      }).compileToV0Message([lookupTableAccount.value]);
      tx = new anchor.web3.VersionedTransaction(messageV0)
      tx.sign([releaseMint])
      const signedTx = await this.provider.wallet.signTransaction(tx);
      const simulationResponse = await this.provider.connection.simulateTransaction(signedTx);
      return simulationResponse
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function closeRelease
   * @description Sets the remaining amount of a Release to 0. After this is called, the Release is no longer for sale.
   * @param {String} releasePublicKey - The public key of the Release being closed.
   * @example await NinaClient.Releases.closeRelease(ninaClient, "f9mMsu26rtMtH55zR31rHABZkkeRwTLuGhKMXZdwG9z");
   * @returns {Object} The data of the closed Release.
   */

  async closeRelease(releasePublicKey, asTx=false) {
    try {
      const release = await this.program.account.release.fetch(
        new anchor.web3.PublicKey(releasePublicKey),
      )

      const payer = asTx ? this.fileServicePublicKey : this.provider.wallet.publicKey
      const tx = await this.program.methods
        .releaseCloseEdition()
        .accounts({
          payer,
          authority: this.provider.wallet.publicKey,
          release: new anchor.web3.PublicKey(releasePublicKey),
          releaseSigner: release.releaseSigner,
          releaseMint: release.releaseMint,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getLatestBlockhashAndContext()
      ).value.blockhash
      tx.feePayer = payer

      const signedTx = await this.provider.wallet.signTransaction(tx);
      if (asTx) {
        const serializedTx = signedTx.serialize({ verifySignatures: false }).toString('base64')
        return serializedTx
      }

      const txid = await this.provider.wallet.sendTransaction(
        signedTx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const closedRelease = await this.fetch(releasePublicKey)

      return {
        release: closedRelease,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function collectRoyaltyForRelease
   * @description Collects the royalty for a Release. Royalties can be in the form of sales on a Release page, or from a Release being resold on an Exchange.
   * @param {String} recipient - The public key of the recipient receiving the royalty.
   * @param {String} releasePublicKey - The public key of the Release.
   * @example collectRoyaltyForRelease(ninaClient, "52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ", "HYCQ2Nk1CuMSLyusY7yYrQ3Zp221S3UnzNwSuXYmUWy7")
   * @returns {Object} the Release with Account data.
   */

  async collectRoyaltyForRelease(recipient, releasePublicKey, asTx=false) {
    if (!releasePublicKey || !recipient) {
      return
    }

    try {
      const release = await this.program.account.release.fetch(
        new anchor.web3.PublicKey(releasePublicKey),
      )

      release.paymentMint = new anchor.web3.PublicKey(release.paymentMint)

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          new anchor.web3.PublicKey(recipient),
          anchor.web3.SystemProgram.programId,
          release.paymentMint,
        )

      let instructions

      if (authorityTokenAccountIx) {
        instructions = [authorityTokenAccountIx]
      }

      const payer = asTx ? this.fileServicePublicKey : this.provider.wallet.publicKey
      const tx = await this.program.methods
        .releaseRevenueShareCollect()
        .accounts({
          payer,
          authority: new anchor.web3.PublicKey(recipient),
          authorityTokenAccount,
          release: new anchor.web3.PublicKey(releasePublicKey),
          releaseMint: release.releaseMint,
          releaseSigner: release.releaseSigner,
          royaltyTokenAccount: release.royaltyTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions || [])
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getLatestBlockhashAndContext()
      ).value.blockhash
      tx.feePayer = payer

      const signedTx = await this.provider.wallet.signTransaction(tx);
      if (asTx) {
        const serializedTx = signedTx.serialize({ verifySignatures: false }).toString('base64')
        return serializedTx
      }

      const txid = await this.provider.wallet.sendTransaction(
        signedTx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const collectedRelease = await this.fetch(releasePublicKey, true)

      return {
        release: collectedRelease,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function collectRoyaltyForReleaseViaHub
   * @description Collects royalties on a release via Hub Dashboard.
   * @param {Object} client - The Nina Client.
   * @param {String} releasePublicKey - The public key of the Release.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @example const royalty = await NinaClient.Hub.collectRoyaltyForReleaseViaHub(ninaClient, releasePublicKey, hubPublicKey);
   * @returns { Object } the Hub Release.
   */

  async collectRoyaltyForReleaseViaHub(releasePublicKey, hubPublicKey, asTx=false) {
    try {
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)

      const hub = await this.program.account.hub.fetch(hubPublicKey)
      const release = await this.program.account.release.fetch(releasePublicKey)
      const hubMetadata = await this.fetch(hubPublicKey)

      const [hubWallet] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        new anchor.web3.PublicKey(hub.hubSigner),
        anchor.web3.SystemProgram.programId,
        release.paymentMint,
      )

      const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
          hubPublicKey.toBuffer(),
          releasePublicKey.toBuffer(),
        ],
        this.program.programId,
      )

      const payer = asTx ? this.fileServicePublicKey : this.provider.wallet.publicKey
      const tx = await this.program.methods
        .releaseRevenueShareCollectViaHub(hubMetadata.hub.handle)
        .accounts({
          payer,
          authority: this.provider.wallet.publicKey,
          royaltyTokenAccount: release.royaltyTokenAccount,
          release: releasePublicKey,
          releaseSigner: release.releaseSigner,
          releaseMint: release.releaseMint,
          hub: hubPublicKey,
          hubRelease,
          hubSigner: hub.hubSigner,
          hubWallet,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getLatestBlockhashAndContext()
      ).value.blockhash
      tx.feePayer = payer

      const signedTx = await this.provider.wallet.signTransaction(tx);
      if (asTx) {
        const serializedTx = signedTx.serialize({ verifySignatures: false }).toString('base64')
        return serializedTx
      }

      const txid = await this.provider.wallet.sendTransaction(
        signedTx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      // fetchHubRelease not returning account data so using Release.fetch for now
      const releaseAccount = await this.fetch(releasePublicKey.toBase58(), true)

      return {
        release: releaseAccount,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function addRoyaltyRecipient
   * @description Adds a royalty recipient to a Release. Royalty recipients are paid out their percentage when a Release is purchased or resold on an Exchange.
   * @param {String} recipientAddress - The public key of the royalty recipient.
   * @param {Number} percentShare - The percentage of the royalties of a Release that the recipient will receive. For example, if the percentage is 50, the recipient will receive 50% of the royalties from the sale of a Release or Exchange.
   * @param {String} releasePublicKey - The public key of the Release.
   * @example await NinaClient.Releases.addRoyaltyRecipient(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX", 50, "HYCQ2Nk1CuMSLyusY7yYrQ3Zp221S3UnzNwSuXYmUWy7")
   * @returns {Object} the Release with Account data.
   */

  async addRoyaltyRecipient(recipientAddress, percentShare, releasePublicKey, asTx=false) {
    try {
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)

      const release = await this.program.account.release.fetch(releasePublicKey)
      const recipientPublicKey = new anchor.web3.PublicKey(recipientAddress)
      const updateAmount = percentShare * 10000
      const instructions = []
      const [
        newRoyaltyRecipientTokenAccount,
        newRoyaltyRecipientTokenAccountIx,
      ] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        recipientPublicKey,
        anchor.web3.SystemProgram.programId,
        release.paymentMint,
      )
      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          release.paymentMint,
        )
      if (newRoyaltyRecipientTokenAccountIx) {
        instructions.push(newRoyaltyRecipientTokenAccountIx)
      }
      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx)
      }

      const payer = asTx ? this.fileServicePublicKey : this.provider.wallet.publicKey
      const tx = await this.program.methods
        .releaseRevenueShareTransfer(new anchor.BN(updateAmount))
        .accounts({
          payer,
          authority: this.provider.wallet.publicKey,
          authorityTokenAccount,
          release: releasePublicKey,
          releaseMint: release.releaseMint,
          releaseSigner: release.releaseSigner,
          royaltyTokenAccount: release.royaltyTokenAccount,
          newRoyaltyRecipient: recipientPublicKey,
          newRoyaltyRecipientTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .preInstructions(instructions)
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getLatestBlockhashAndContext()
      ).value.blockhash
      tx.feePayer = payer

      const signedTx = await this.provider.wallet.signTransaction(tx);
      if (asTx) {
        const serializedTx = signedTx.serialize({ verifySignatures: false }).toString('base64')
        return serializedTx
      }

      const txid = await this.provider.wallet.sendTransaction(
        signedTx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const updatedRelease = await this.fetch(releasePublicKey, true)

      return {
        release: updatedRelease,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  createReleaseMetadataJson({
    releasePublicKey,
    title,
    sellerFeeBasisPoints,
    catalogNumber,
    description,
    files,
    artworkTx,
    tags,
  }) {
    const metadata = {
      name: title,
      symbol: catalogNumber,
      description,
      seller_fee_basis_points: sellerFeeBasisPoints,
      image: `https://www.arweave.net/${artworkTx}`,
      animation_url: `${files[0].uri}?ext=mp3`,
      external_url: `https://ninaprotocol.com/${releasePublicKey}`,
      attributes: [],
      collection: {
        name: `${title} (Nina)`,
        family: 'Nina',
      },
      properties: {
        tags,
        title,
        date: new Date(),
        files,
        category: 'audio',
      },
    }

    return metadata
  }

  async getMd5FileHash(file, progress) {
    return new Promise((resolve, reject) => {
      let md5 = CryptoJS.algo.MD5.create()
      readFileChunked(
        file,
        (chunk, offset, total) => {
          md5 = md5.update(CryptoJS.enc.Latin1.parse(chunk))

          if (progress) {
            progress(offset / total)
          }
        },
        (err) => {
          if (err) {
            reject(err)
          } else {
            const hash = md5.finalize()
            resolve(hash.toString())
          }
        },
      )
    })
  }
}
