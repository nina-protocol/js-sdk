import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount, getUsdcBalance } from '../utils';
import axios from 'axios';
/** 
 * @module Release
 */

/**
 * @function fetchAll
 * Fetches all releases.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Release accounts.
 * @example const releases = await NinaClient.Release.fetchAll();
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/releases',
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
 * @param {String} publicKey The public key of the release.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Release account.
 * @example const release = await NinaClient.Release.fetch("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
 */
const fetch = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/releases/${publicKey}`, undefined, withAccountData);
};

/**
 * @function fetchCollectors
 * @param {String} publicKey The public key of the release.    
 * @param {Boolean} [withCollection = false] Fetch collectors collections.
 * @example const collectors = await NinaClient.Release.fetchCollectors("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
 */
const fetchCollectors = async (publicKey, withCollection=false) => {
  return await NinaClient.get(`/releases/${publicKey}/collectors${withCollection ? '?withCollection=true' : ''}`);
}

/** 
 * @function fetchHubs
 * @param {String} publicKey The public key of the release.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Hub and HubRelease accounts.
 * @example const hubs = await NinaClient.Release.fetchHubs("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
*/
const fetchHubs = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/releases/${publicKey}/hubs`, undefined, withAccountData);
};

/** 
 * @function fetchExchanges
 * @param {String} publicKey The public key of the release.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Exchange accounts.
 * @example const exchanges = await NinaClient.Release.fetchExchanges("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
 */
const fetchExchanges = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/releases/${publicKey}/exchanges`, undefined, withAccountData);
};

/**
 * @function fetchRevenueShareRecipients
 * @param {String} publicKey The public key of the release.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Release accounts.
 * @example const revenueShareRecipients = await NinaClient.Release.fetchRevenueShareRecipients("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
 */
const fetchRevenueShareRecipients = async (publicKey, withAccountData=false) => {
  return await NinaClient.get(`/releases/${publicKey}/revenueShareRecipients`, undefined, withAccountData);
}

/**
 * 
 * @function purchaseViaHub
 * @param {String} releasePublicKey Public Key of the release.
 * @param {String} hubPublicKey Public Key of the hub.
 * @param {Wallet} wallet Wallet to sign the transaction.
 * @param {Connection} connection Connection to Solana.
 * @param {Program} program Instance of the Nina program
 * @returns 
 */
const purchaseViaHub = async (releasePublicKey, hubPublicKey, wallet, connection, program) => {
  try {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const nina = await anchor.Program.at(program.programId.toBase58(), provider);  

    releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
    const release = await program.account.release.fetch(releasePublicKey)

    let [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
      connection,
      wallet.publicKey,
      wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    )

    let [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        connection,
        wallet.publicKey,
        wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        release.releaseMint
      )

    const hub = await program.account.hub.fetch(hubPublicKey)
    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
        hubPublicKey.toBuffer(),
        releasePublicKey.toBuffer(),
      ],
      program.programId
    )
    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        hubPublicKey.toBuffer(),
        releasePublicKey.toBuffer(),
      ],
      program.programId
    )

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
        hubPublicKey.toBuffer(),
      ],
      program.programId
    )

    let [hubWallet] = await findOrCreateAssociatedTokenAccount(
      connection,
      wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    )
    const request = {
      accounts: {
        payer: wallet.publicKey,
        receiver: wallet.publicKey,
        release: releasePublicKey,
        releaseSigner: release.releaseSigner,
        payerTokenAccount,
        receiverReleaseTokenAccount,
        royaltyTokenAccount: release.royaltyTokenAccount,
        releaseMint: release.releaseMint,
        hub: hubPublicKey,
        hubRelease,
        hubContent,
        hubSigner,
        hubWallet,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      },
    }

    const instructions = []
    const solPrice = await axios.get(
      `https://price.jup.ag/v1/price?id=SOL`
    )
    let releasePriceUi = release.price.toNumber() / Math.pow(10,6)
    let convertAmount = releasePriceUi + (releasePriceUi * hub.referralFee.toNumber() / 1000000)
    let usdcBalance = await getUsdcBalance(wallet.publicKey, connection)
    if (usdcBalance < convertAmount) {
      const additionalComputeBudgetInstruction = anchor.web3.ComputeBudgetProgram.requestUnits({
        units: 400000,
        additionalFee: 0,
      });
      instructions.push(additionalComputeBudgetInstruction)
      convertAmount -= usdcBalance
      const amt = Math.round(((convertAmount + (convertAmount * .01)) / solPrice.data.data.price) * Math.pow(10, 9))
      const { data } = await axios.get(
        `https://quote-api.jup.ag/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amt}&slippage=0.5&onlyDirectRoutes=true`
      )
      let transactionInstructions
      for await (let d of data.data) {
        const transactions = await axios.post(
          'https://quote-api.jup.ag/v1/swap', {
          route: d,
          userPublicKey: wallet.publicKey.toBase58(),
        })
        if (!transactionInstructions) {
          transactionInstructions = anchor.web3.Transaction.from(Buffer.from(transactions.data.swapTransaction, 'base64')).instructions
        } else {
          const tx = anchor.web3.Transaction.from(Buffer.from(transactions.data.swapTransaction, 'base64'))
          let accountCount = tx.instructions.reduce((count, ix) => count += ix.keys.length, 0)
          if (accountCount < transactionInstructions.reduce((count, ix) => count += ix.keys.length, 0)) {
            transactionInstructions = tx.instructions
          }
        }
      }
      instructions.push(...transactionInstructions)
    }
    if (receiverReleaseTokenAccountIx) {
      instructions.push(receiverReleaseTokenAccountIx)
    }

    if (instructions.length > 0) {
      request.instructions = instructions
    }
    const txid = await nina.rpc.releasePurchaseViaHub(
      release.price,
      NinaClient.decode(hub.handle),
      request
    )
    await connection.getParsedTransaction(txid, 'confirmed')
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}

export default {
  fetchAll,
  fetch,
  fetchCollectors,
  fetchHubs,
  fetchExchanges,
  fetchRevenueShareRecipients,
  purchaseViaHub,
}
