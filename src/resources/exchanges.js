import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '../utils';
/**
 * @module Exchange
 */

/**
 * @function fetchAll
 * @description Fetches all exchanges.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Include full on-chain Exchange accounts.
 * @example const exchanges = await NinaClient.Exchange.fetchAll();
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/exchanges',
    {
      limit: limit || 20,
      offset: offset || 0,
      sort: sort || 'desc',
    },
    withAccountData
  );
};

/**
 * @function fetch
 * @description Fetches an exchange.
 * @param {String} publicKey The Public key of an Exchange account.
 * @param {Boolean} [withAccountData = false] Include full on-chain Exchange account.
 * @param {String} [transactionId = undefined] A transaction id from an interaction with an account -
 *        cancelling and completing Exchanges closes their on-chain accounts - by fetching a transaction
 *        we can have more context around interactions with an Exchange - useful for indexing.
 * @example const exchange = await NinaClient.Exchange.fetch('Fxv2G4cQQAeEXN2WkaSAusbNV7E1ouV9W6XHXf3DEfQ8');
 */
const fetch = async (publicKey, withAccountData = false, transactionId = undefined) => {
  return NinaClient.get(`/exchanges/${publicKey}`, transactionId ? { transactionId } : undefined, withAccountData);
};

/**
 * @function exchangeInit
 * @description Initializes an Exchange account.
 * @param {Object} client The NinaClient instance.
 * @param {String} exchangeAccount The public key of the Exchange account.
 * @param {Boolean} isSelling Whether the Exchange is selling or buying.
 * @param {String} releasePublicKey The public key of the Release account.
 * @returns {Object} the Exchange data
 */

const exchangeInit = async (client, amount, isSelling, releasePublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();

    let initializerSendingMint = null;
    let initializerExpectedMint = null;
    let expectedAmount = null;
    let initializerAmount = null;
    const release = new anchor.web3.PublicKey(releasePublicKey);
    const releaseAccount = await program.account.release.fetch(release);
    const releaseMint = releaseAccount.releaseMint;
    if (isSelling) {
      expectedAmount = new anchor.BN(amount);
      initializerSendingMint = releaseMint;
      initializerAmount = new anchor.BN(1);
      initializerExpectedMint = releaseAccount.paymentMint;
    } else {
      expectedAmount = new anchor.BN(1);
      initializerSendingMint = releaseAccount.paymentMint;
      initializerAmount = new anchor.BN(amount);
      initializerExpectedMint = releaseMint;
    }

    const exchange = anchor.web3.Keypair.generate();
    const [exchangeSigner, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [exchange.publicKey.toBuffer()],
      program.programId
    );

    const [initializerSendingTokenAccount, initializerSendingTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      initializerSendingMint
    );

    const [exchangeEscrowTokenAccount, exchangeEscrowTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      exchangeSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      initializerSendingMint
    );

    const [initializerExpectedTokenAccount, initializerExpectedTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        initializerExpectedMint
      );
    const exchangeCreateIx = await program.account.exchange.createInstruction(exchange);

    let accounts = {
      initializer: provider.wallet.publicKey,
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
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    };
    let signers = [exchange];
    let instructions = [exchangeCreateIx, exchangeEscrowTokenAccountIx];

    if (initializerExpectedTokenAccountIx) {
      instructions.push(initializerExpectedTokenAccountIx);
    }

    if (initializerSendingTokenAccountIx) {
      instructions.push(initializerSendingTokenAccountIx);
    }

    if (client.isSol(releaseAccount.paymentMint) && !isSelling) {
      const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
        provider,
        initializerAmount,
        new anchor.web3.PublicKey(client.ids.mints.wsol)
      );
      if (!instructions) {
        instructions = [...wrappedSolInstructions];
      } else {
        instructions.push(...wrappedSolInstructions);
      }
      accounts.initializerSendingTokenAccount = wrappedSolAccount;
    }
    const config = {
      expectedAmount,
      initializerAmount,
      isSelling,
    };
    const tx = await program.methods
      .exchangeInit(config, bump)
      .accounts(accounts)
      .preInstructions(instructions)
      .signers(signers)
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    for await (let signer of signers) {
      tx.partialSign(signer);
    }
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await provider.connection.getParsedTransaction(txid, 'confirmed');
    const exchangeResult = await fetch(exchange.publicKey, true, txid);
    return {
      exchange: exchangeResult,
    };
  } catch (error) {
    console.error(error);
    return {
      error,
    };
  }
};

/**
 * @function exchangeAccept
 * @description Initializes an Exchange account.
 * @param {Object} client The NinaClient instance.
 * @param {String} exchangeAccount The public key of the Exchange account.
 * @param {String} releasePublicKey The public key of the Release account.
 * @returns {Object} { exchangePublicKey: String?, error: Error?}
 * @example const {exchangePublicKey, error} = await exchangeAccept(client, exchangeAccount, releasePublicKey);
 * @returns {String} the Exchange public key
 */

const exchangeAccept = async (client, exchange, releasePublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const releaseKey = new anchor.web3.PublicKey(releasePublicKey);
    const release = await program.account.release.fetch(releaseKey);
    const exchangePubkey = new anchor.web3.PublicKey(exchange.publicKey);
    const exchangeAccount = await program.account.exchange.fetch(exchangePubkey);
    const [takerSendingTokenAccount, takerSendingTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      exchangeAccount.initializerExpectedMint
    );

    const [takerExpectedTokenAccount, takerExpectedTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      exchangeAccount.initializerSendingMint
    );

    const [initializerExpectedTokenAccount, initializerExpectedTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        exchangeAccount.initializer,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        exchangeAccount.initializerExpectedMint
      );

    const exchangeHistory = anchor.web3.Keypair.generate();
    const createExchangeHistoryIx = await program.account.exchangeHistory.createInstruction(exchangeHistory);
    let instructions = [createExchangeHistoryIx];
    let accounts = {
      initializer: exchangeAccount.initializer,
      initializerExpectedTokenAccount,
      takerExpectedTokenAccount,
      takerSendingTokenAccount,
      exchangeEscrowTokenAccount: exchangeAccount.exchangeEscrowTokenAccount,
      exchangeSigner: exchangeAccount.exchangeSigner,
      taker: provider.wallet.publicKey,
      exchange: new anchor.web3.PublicKey(exchange.publicKey),
      exchangeHistory: exchangeHistory.publicKey,
      release: new anchor.web3.PublicKey(releasePublicKey),
      royaltyTokenAccount: release.royaltyTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    };

    if (takerSendingTokenAccountIx) {
      instructions.push(takerSendingTokenAccountIx);
    }
    if (takerExpectedTokenAccountIx) {
      instructions.push(takerExpectedTokenAccountIx);
    }
    if (initializerExpectedTokenAccountIx) {
      instructions.push(initializerExpectedTokenAccountIx);
    }

    if (client.isSol(release.paymentMint) && exchange.isSelling) {
      const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
        provider,
        exchange.expectedAmount,
        release.paymentMint
      );
      instructions.push(...wrappedSolInstructions);
      accounts.takerSendingTokenAccount = wrappedSolAccount;
    }
    const params = {
      expectedAmount: exchangeAccount.expectedAmount,
      initializerAmount: exchangeAccount.initializerAmount,
      resalePercentage: release.resalePercentage,
      datetime: new anchor.BN(Date.now() / 1000),
    };

    const tx = await program.methods
      .exchangeAccept(params)
      .accounts(accounts)
      .preInstructions(instructions)
      .signers([exchangeHistory])
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    for await (let signer of [exchangeHistory]) {
      tx.partialSign(signer);
    }
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await provider.connection.getParsedTransaction(txid, 'finalized');
    await fetch(exchangePubkey.toBase58());
    return {
      exchangePublicKey: exchangePubkey.toBase58(),
    };
  } catch (error) {
    console.error(error);
    return {
      error,
    };
  }
};

/**
 * @function exchangeCancel
 * @description Cancels an initialized Exchange.
 * @param {Object} client The NinaClient instance.
 * @param {String} exchangeAccount The public key of the Exchange account.
 * @returns {Object} { exchangePublicKey: String?, error: Error?}
 * @example const {exchange, error} = await exchangeCancel(client, exchangeAccount);
 * @returns {String} the Exchange public key
 */

const exchangeCancel = async (client, exchange) => {
  try {
    const exchangePublicKey = new anchor.web3.PublicKey(exchange.publicKey);
    const { provider } = client;
    const program = await client.useProgram();
    exchange = await program.account.exchange.fetch(exchangePublicKey);
    const [initializerReturnTokenAccount, initializerReturnTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      exchange.initializerSendingMint
    );

    let instructions;
    if (initializerReturnTokenAccountIx) {
      instructions.push(initializerReturnTokenAccountIx);
    }

    let tx;
    const params = new anchor.BN(exchange.isSelling ? 1 : exchange.initializerAmount.toNumber());
    if (client.isSol(exchange.initializerSendingMint)) {
      tx = await program.methods
        .exchangeCancelSol(params)
        .accounts({
          initializer: provider.wallet.publicKey,
          initializerSendingTokenAccount: initializerReturnTokenAccount,
          exchangeEscrowTokenAccount: exchange.exchangeEscrowTokenAccount,
          exchangeSigner: exchange.exchangeSigner,
          exchange: exchangePublicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions || [])
        .signers([])
        .transaction();
    } else {
      tx = await program.methods
        .exchangeCancel(params)
        .accounts({
          initializer: provider.wallet.publicKey,
          initializerSendingTokenAccount: initializerReturnTokenAccount,
          exchangeEscrowTokenAccount: exchange.exchangeEscrowTokenAccount,
          exchangeSigner: exchange.exchangeSigner,
          exchange: exchangePublicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions || [])
        .signers([])
        .transaction();
    }
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await provider.connection.getParsedTransaction(txid, 'confirmed');
    await fetch(exchangePublicKey.toBase58());
    return {
      exchangePublicKey: exchangePublicKey.toBase58(),
    };
  } catch (error) {
    console.error(error);
    return {
      error,
    };
  }
};

export default {
  fetchAll,
  fetch,
  exchangeInit,
  exchangeAccept,
  exchangeCancel,
};
