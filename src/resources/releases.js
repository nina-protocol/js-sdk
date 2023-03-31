import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import {findOrCreateAssociatedTokenAccount, getUsdcBalance, createMintInstructions, uiToNative, decodeNonEncryptedByteArray, getConfirmTransaction } from '../utils';
import Hub from './hubs';
import axios from 'axios';

/** 
 * @module Release
 */

const MAX_INT = '18446744073709551615'

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

const releaseInitViaHub = async (
  hubPubkey,
  retailPrice,
  amount,
  resalePercentage,
  isUsdc = true,
  metadataUri,
  artist,
  title,
  catalogNumber,
  release,
  releaseBump,
  releaseMint,
  isOpen,
  wallet,
  connection
) => {
  try {
    const ids = NinaClient.ids
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const program = await anchor.Program.at(ids.programs.nina, provider);  
    hubPubkey = new anchor.web3.PublicKey(hubPubkey)
    const hub = await program.account.hub.fetch(hubPubkey)
    const paymentMint = new anchor.web3.PublicKey(
      isUsdc ? ids.mints.usdc : ids.mints.wsol
    )

    const [releaseSigner, releaseSignerBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [release.toBuffer()],
        program.programId
      )
    const releaseMintIx = await createMintInstructions(
      provider,
      provider.wallet.publicKey,
      releaseMint.publicKey,
      0
    )
    const [authorityTokenAccount, authorityTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        paymentMint
      )

    const [royaltyTokenAccount, royaltyTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        releaseSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        paymentMint,
        true
      )

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    )

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
        hubPubkey.toBuffer(),
      ],
      program.programId
    )

    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
        hubPubkey.toBuffer(),
        release.toBuffer(),
      ],
      program.programId
    )

    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        hubPubkey.toBuffer(),
        release.toBuffer(),
      ],
      program.programId
    )

    let [hubWallet] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint
    )

    let instructions = [...releaseMintIx, royaltyTokenAccountIx]

    if (authorityTokenAccountIx) {
      instructions.push(authorityTokenAccountIx)
    }

    const editionAmount = isOpen ? MAX_INT : amount
    const config = {
      amountTotalSupply: new anchor.BN(editionAmount),
      amountToArtistTokenAccount: new anchor.BN(0),
      amountToVaultTokenAccount: new anchor.BN(0),
      resalePercentage: new anchor.BN(resalePercentage * 10000),
      price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
      releaseDatetime: new anchor.BN(Date.now() / 1000),
    }
    const bumps = {
      release: releaseBump,
      signer: releaseSignerBump,
    }
    const metadataProgram = new anchor.web3.PublicKey(ids.programs.metaplex)
    const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
      [ 
        Buffer.from('metadata'),
        metadataProgram.toBuffer(),
        releaseMint.publicKey.toBuffer(),
      ],
      metadataProgram
    )

    const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32))
    const nameBufString = nameBuf.slice(0, 32).toString()

    const symbolBuf = Buffer.from(catalogNumber.substring(0, 10))
    const symbolBufString = symbolBuf.slice(0, 10).toString()

    const metadataData = {
      name: nameBufString,
      symbol: symbolBufString,
      uri: metadataUri,
      sellerFeeBasisPoints: resalePercentage * 100,
    }


    const txid = await program.rpc.releaseInitViaHub(
      config,
      bumps,
      metadataData,
      decodeNonEncryptedByteArray(hub.handle),
      {
        accounts: {
          authority: provider.wallet.publicKey,
          release,
          releaseSigner,
          hubCollaborator,
          hub: hubPubkey,
          hubRelease,
          hubContent,
          hubSigner,
          hubWallet,
          releaseMint: releaseMint.publicKey,
          authorityTokenAccount,
          paymentMint,
          royaltyTokenAccount,
          tokenProgram: new anchor.web3.PublicKey(ids.programs.token),
          metadata,
          metadataProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [releaseMint],
        instructions,
      }
    )

    await getConfirmTransaction(txid, provider.connection)
    const newRelease =  await Hub.fetchHubRelease(
      hubPubkey.toBase58(),
      hubRelease.toBase58()
    )
    console.log('success!!!! :>> ', newRelease);
    return newRelease
  } catch (error) {
    console.log(error)
    return false
  }
}

export const initializeReleaseAndMint = async (hubPubkey, wallet, connection) => {
  try {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const releaseMint = anchor.web3.Keypair.generate()
    const [release, releaseBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-release')),
          releaseMint.publicKey.toBuffer(),
        ],
        program.programId
      )
    let hubRelease;
    if (hubPubkey) {
      const [_hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
          new anchor.web3.PublicKey(hubPubkey).toBuffer(),
          release.toBuffer(),
        ],
        program.programId
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

export const releaseCreate = async (
  retailPrice,
  amount,
  resalePercentage,
  artist,
  title,
  catalogNumber,
  metadataUri,
  isUsdc = true,
  release,
  releaseBump,
  releaseMint,
  isOpen,
  wallet,
  connection
  ) => {
  try {
    const ids = NinaClient.ids
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const program = await anchor.Program.at(ids.programs.nina, provider);
    const paymentMint = new anchor.web3.PublicKey(
      isUsdc ? ids.mints.usdc : ids.mints.wsol
    )
    const publishingCreditMint = new anchor.web3.PublicKey(
      ids.mints.publishingCredit
    )

    const [releaseSigner, releaseSignerBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [release.toBuffer()],
        program.programId
      )

    const releaseMintIx = await createMintInstructions(
      provider,
      provider.wallet.publicKey,
      releaseMint.publicKey,
      0
    )

    const [authorityTokenAccount, authorityTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        paymentMint
      )

    const [royaltyTokenAccount, royaltyTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        releaseSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        paymentMint,
        true
      )

    const [
      authorityPublishingCreditTokenAccount,
      authorityPublishingCreditTokenAccountIx,
    ] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      publishingCreditMint
    )

    let instructions = [...releaseMintIx, royaltyTokenAccountIx]

    if (authorityTokenAccountIx) {
      instructions.push(authorityTokenAccountIx)
    }

    if (authorityPublishingCreditTokenAccountIx) {
      instructions.push(authorityPublishingCreditTokenAccountIx)
    }
    let now = new Date()
    const editionAmount = isOpen ? MAX_INT : amount
    const config = {
      amountTotalSupply: new anchor.BN(editionAmount),
      amountToArtistTokenAccount: new anchor.BN(0),
      amountToVaultTokenAccount: new anchor.BN(0),
      resalePercentage: new anchor.BN(resalePercentage * 10000),
      price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
      releaseDatetime: new anchor.BN(now.getTime() / 1000),
    }

    const metadataProgram = new anchor.web3.PublicKey(ids.programs.metaplex)
    const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        metadataProgram.toBuffer(),
        releaseMint.publicKey.toBuffer(),
      ],
      metadataProgram
    )

    const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32))
    const nameBufString = nameBuf.slice(0, 32).toString()

    const symbolBuf = Buffer.from(catalogNumber.substring(0, 10))
    const symbolBufString = symbolBuf.slice(0, 10).toString()

    const metadataData = {
      name: nameBufString,
      symbol: symbolBufString,
      uri: metadataUri,
      sellerFeeBasisPoints: resalePercentage * 100,
    }

    const bumps = {
      release: releaseBump,
      signer: releaseSignerBump,
    }

    const txid = await program.rpc.releaseInitWithCredit(
      config,
      bumps,
      metadataData,
      {
        accounts: {
          release,
          releaseSigner,
          releaseMint: releaseMint.publicKey,
          payer: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          authorityTokenAccount: authorityTokenAccount,
          authorityPublishingCreditTokenAccount,
          publishingCreditMint,
          paymentMint,
          royaltyTokenAccount,
          metadata,
          metadataProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [releaseMint],
        instructions,
      }
    )
    await getConfirmTransaction(txid, provider.connection)


    const createdRelease = await fetch(release.toBase58())
    return createdRelease
    
  } catch (error) {
    console.warn(error)
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
  releaseInitViaHub,
  initializeReleaseAndMint,
  releaseCreate
}

