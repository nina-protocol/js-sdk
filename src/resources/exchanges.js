import * as anchor from '@coral-xyz/anchor';
import {
  NINA_CLIENT_IDS,
  findOrCreateAssociatedTokenAccount,
  isSol,
  wrapSol,
} from '../utils'

/**
 * @module Exchange
 */

export default class Exchange {
  constructor({ http, program, provider, cluster }) {
    this.http = http
    this.program = program
    this.provider = provider
    this.cluster = cluster
  }
  /**
   * @function fetchAll
   * @description Fetches all exchanges.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] - Pagination options.
   * @param {Boolean} [withAccountData = false] - Include full on-chain Exchange accounts.
   * @example const exchanges = await NinaClient.Exchange.fetchAll();
   * @returns {Array} an array of all of the exchanges on Nina.
   */

  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination

    return this.http.get(
      '/exchanges',
      {
        limit: limit || 20,
        offset: offset || 0,
        sort: sort || 'desc',
      },
      withAccountData,
    )
  }

  /**
   * @function fetch
   * @description Fetches an exchange.
   * @param {String} publicKey - The Public key of an Exchange account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain Exchange account.
   * @param {String} [transactionId = undefined] - A transaction id from an interaction with an account -
   *        cancelling and completing Exchanges closes their on-chain accounts - by fetching a transaction
   *        we can have more context around interactions with an Exchange - useful for indexing.
   * @example const exchange = await NinaClient.Exchange.fetch('Fxv2G4cQQAeEXN2WkaSAusbNV7E1ouV9W6XHXf3DEfQ8');
   * @returns {Object} an object containing the data pertaining to a particular Exchange.
   */

  async fetch(publicKey, withAccountData = false, transactionId = undefined) {
    return this.http.get(
      `/exchanges/${publicKey}`,
      transactionId ? { transactionId } : undefined,
      withAccountData,
    )
  }

  /**
   * @function exchangeInit
   * @description Initializes an Exchange account.
   * @param {Number} amount - The amount being offered for the Exchange.
   * @param {Boolean} isSelling - A boolean determining whether the Exchange is selling or buying a Release on the secondary market.
   * @param {String} releasePublicKey - The public key of the Release account.
   * @returns {Object} the data for the initialized Exchange.
   */

  async exchangeInit(amount, isSelling, releasePublicKey) {
    try {
      let initializerSendingMint = null
      let initializerExpectedMint = null
      let expectedAmount = null
      let initializerAmount = null
      const release = new anchor.web3.PublicKey(releasePublicKey)
      const releaseAccount = await this.program.account.release.fetch(release)
      const { releaseMint } = releaseAccount

      if (isSelling) {
        expectedAmount = new anchor.BN(amount)
        initializerSendingMint = releaseMint
        initializerAmount = new anchor.BN(1)
        initializerExpectedMint = releaseAccount.paymentMint
      } else {
        expectedAmount = new anchor.BN(1)
        initializerSendingMint = releaseAccount.paymentMint
        initializerAmount = new anchor.BN(amount)
        initializerExpectedMint = releaseMint
      }

      const exchange = anchor.web3.Keypair.generate()

      const [exchangeSigner, bump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [exchange.publicKey.toBuffer()],
          this.program.programId,
        )

      const [initializerSendingTokenAccount, initializerSendingTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          initializerSendingMint,
        )

      const [exchangeEscrowTokenAccount, exchangeEscrowTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          exchangeSigner,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          initializerSendingMint,
        )

      const [
        initializerExpectedTokenAccount,
        initializerExpectedTokenAccountIx,
      ] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        initializerExpectedMint,
      )

      const exchangeCreateIx =
        await this.program.account.exchange.createInstruction(exchange)

      const accounts = {
        initializer: this.provider.wallet.publicKey,
        releaseMint,
        initializerExpectedTokenAccount,
        initializerSendingTokenAccount,
        initializerExpectedMint,
        initializerSendingMint,
        exchangeEscrowTokenAccount,
        exchangeSigner,
        exchange: exchange.publicKey,
        release,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }

      const signers = [exchange]
      let instructions = [exchangeCreateIx, exchangeEscrowTokenAccountIx]

      if (initializerExpectedTokenAccountIx) {
        instructions.push(initializerExpectedTokenAccountIx)
      }

      if (initializerSendingTokenAccountIx) {
        instructions.push(initializerSendingTokenAccountIx)
      }

      if (isSol(releaseAccount.paymentMint) && !isSelling) {
        const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
          this.provider,
          initializerAmount,
          new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.wsol),
        )

        if (!instructions) {
          instructions = [...wrappedSolInstructions]
        } else {
          instructions.push(...wrappedSolInstructions)
        }

        accounts.initializerSendingTokenAccount = wrappedSolAccount
      }

      const config = {
        expectedAmount,
        initializerAmount,
        isSelling,
      }

      const tx = await this.program.methods
        .exchangeInit(config, bump)
        .accounts(accounts)
        .preInstructions(instructions)
        .signers(signers)
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey
      for await (const signer of signers) {
        tx.partialSign(signer)
      }

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await this.provider.connection.getParsedTransaction(txid, 'confirmed')
      const exchangeResult = await fetch(exchange.publicKey, true, txid)

      return {
        exchange: exchangeResult,
      }
    } catch (error) {
      console.error(error)

      return {
        error,
      }
    }
  }

  /**
   * @function exchangeAccept
   * @description Initializes an Exchange account.
   * @param {String} exchangePublicKey  - The public key of the Exchange.
   * @param {Boolean} isSelling - A boolean determining whether the Exchange is selling or buying a Release on the secondary market.
   * @param {Number} expectedAmount - The amount expected for the Exchange.
   * @param {String} releasePublicKey - The public key of the Release account.
   * @returns {Object} { exchangePublicKey: String?, error: Error?}
   * @example const {exchangePublicKey, error} = await exchangeAccept(client, exchangePublicKey, isSelling, expectedAmount, releasePublicKey);
   * @returns {String} the original Exchange public key.
   */

  async exchangeAccept(
    exchangePublicKey,
    isSelling,
    expectedAmount,
    releasePublicKey,
  ) {
    try {
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)

      const release = await this.program.account.release.fetch(releasePublicKey)
      exchangePublicKey = new anchor.web3.PublicKey(exchangePublicKey)

      const exchangeAccount = await this.program.account.exchange.fetch(
        exchangePublicKey,
      )

      const [takerSendingTokenAccount, takerSendingTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          exchangeAccount.initializerExpectedMint,
        )

      const [takerExpectedTokenAccount, takerExpectedTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          exchangeAccount.initializerSendingMint,
        )

      const [
        initializerExpectedTokenAccount,
        initializerExpectedTokenAccountIx,
      ] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        exchangeAccount.initializer,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        exchangeAccount.initializerExpectedMint,
      )

      const exchangeHistory = anchor.web3.Keypair.generate()

      const createExchangeHistoryIx =
        await this.program.account.exchangeHistory.createInstruction(
          exchangeHistory,
        )

      const instructions = [createExchangeHistoryIx]

      const accounts = {
        initializer: exchangeAccount.initializer,
        initializerExpectedTokenAccount,
        takerExpectedTokenAccount,
        takerSendingTokenAccount,
        exchangeEscrowTokenAccount: exchangeAccount.exchangeEscrowTokenAccount,
        exchangeSigner: exchangeAccount.exchangeSigner,
        taker: this.provider.wallet.publicKey,
        exchange: exchangePublicKey,
        exchangeHistory: exchangeHistory.publicKey,
        release: releasePublicKey,
        royaltyTokenAccount: release.royaltyTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }

      if (takerSendingTokenAccountIx) {
        instructions.push(takerSendingTokenAccountIx)
      }

      if (takerExpectedTokenAccountIx) {
        instructions.push(takerExpectedTokenAccountIx)
      }

      if (initializerExpectedTokenAccountIx) {
        instructions.push(initializerExpectedTokenAccountIx)
      }

      if (isSol(release.paymentMint) && isSelling) {
        const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
          this.provider,
          expectedAmount,
          release.paymentMint,
        )

        instructions.push(...wrappedSolInstructions)
        accounts.takerSendingTokenAccount = wrappedSolAccount
      }

      const params = {
        expectedAmount: exchangeAccount.expectedAmount,
        initializerAmount: exchangeAccount.initializerAmount,
        resalePercentage: release.resalePercentage,
        datetime: new anchor.BN(Date.now() / 1000),
      }

      const tx = await this.program.methods
        .exchangeAccept(params)
        .accounts(accounts)
        .preInstructions(instructions)
        .signers([exchangeHistory])
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey
      for await (const signer of [exchangeHistory]) {
        tx.partialSign(signer)
      }

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await this.provider.connection.getParsedTransaction(txid, 'finalized')
      await fetch(exchangePublicKey.toBase58())

      return {
        exchangePublicKey: exchangePublicKey.toBase58(),
      }
    } catch (error) {
      console.error(error)

      return {
        error,
      }
    }
  }

  /**
   * @function exchangeCancel
   * @description Cancels an initialized Exchange.
   * @param {String} exchangePublicKey - The public key of the Exchange.
   * @returns {Object} { exchangePublicKey: String?, error: Error?}
   * @example const {exchange, error} = await exchangeCancel(client, exchangeAccount);
   */

  async exchangeCancel(exchangePublicKey) {
    try {
      exchangePublicKey = new anchor.web3.PublicKey(exchangePublicKey)

      const exchange = await this.program.account.exchange.fetch(
        exchangePublicKey,
      )

      const [initializerReturnTokenAccount, initializerReturnTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          exchange.initializerSendingMint,
        )

      let instructions

      if (initializerReturnTokenAccountIx) {
        instructions.push(initializerReturnTokenAccountIx)
      }

      let tx

      const amount = exchange.isSelling
        ? new anchor.BN(1)
        : exchange.initializerAmount

      if (isSol(exchange.initializerSendingMint, this.cluster)) {
        tx = await this.program.methods
          .exchangeCancelSol(amount)
          .accounts({
            initializer: this.provider.wallet.publicKey,
            initializerSendingTokenAccount: initializerReturnTokenAccount,
            exchangeEscrowTokenAccount: exchange.exchangeEscrowTokenAccount,
            exchangeSigner: exchange.exchangeSigner,
            exchange: exchangePublicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .preInstructions(instructions || [])
          .signers([])
          .transaction()
      } else {
        tx = await this.program.methods
          .exchangeCancel(amount)
          .accounts({
            initializer: this.provider.wallet.publicKey,
            initializerSendingTokenAccount: initializerReturnTokenAccount,
            exchangeEscrowTokenAccount: exchange.exchangeEscrowTokenAccount,
            exchangeSigner: exchange.exchangeSigner,
            exchange: exchangePublicKey,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .preInstructions(instructions || [])
          .signers([])
          .transaction()
      }

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await this.provider.connection.getParsedTransaction(txid, 'confirmed')
      await fetch(exchangePublicKey.toBase58())

      return {
        exchangePublicKey: exchangePublicKey.toBase58(),
      }
    } catch (error) {
      console.error(error)

      return {
        error,
      }
    }
  }
}
