import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import {
  findOrCreateAssociatedTokenAccount,
  getUsdcBalance,
  createMintInstructions,
  uiToNative,
  decodeNonEncryptedByteArray,
  getConfirmTransaction,
  TOKEN_PROGRAM_ID,
} from '../utils';
import Hub from './hubs';
import axios from 'axios';

/**
 * @module Release
 */

const MAX_INT = '18446744073709551615';

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
  console.log('withAccountData', withAccountData);
  return await NinaClient.get(`/releases/${publicKey}`, undefined, withAccountData);
};

/**
 * @function fetchCollectors
 * @param {String} publicKey The public key of the release.
 * @param {Boolean} [withCollection = false] Fetch collectors collections.
 * @example const collectors = await NinaClient.Release.fetchCollectors("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
 */
const fetchCollectors = async (publicKey, withCollection = false) => {
  return await NinaClient.get(`/releases/${publicKey}/collectors${withCollection ? '?withCollection=true' : ''}`);
};

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
const fetchRevenueShareRecipients = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/releases/${publicKey}/revenueShareRecipients`, undefined, withAccountData);
};

/**
 *
 * @function purchaseViaHub
 * @param {Object} client NinaClient instance.
 * @param {String} releasePublicKey Public Key of the release.
 * @param {String} hubPublicKey Public Key of the hub.
 * @returns
 */
const purchaseViaHub = async (client, releasePublicKey, hubPublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();

    releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
    const release = await program.account.release.fetch(releasePublicKey);
    let [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    );

    let [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.releaseMint
    );

    const hub = await program.account.hub.fetch(hubPublicKey);
    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
        hubPublicKey.toBuffer(),
        releasePublicKey.toBuffer(),
      ],
      program.programId
    );
    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        hubPublicKey.toBuffer(),
        releasePublicKey.toBuffer(),
      ],
      program.programId
    );

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hubPublicKey.toBuffer()],
      program.programId
    );

    let [hubWallet] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    );

    const instructions = [];
    const solPrice = await axios.get(`https://price.jup.ag/v1/price?id=SOL`);
    let releasePriceUi = release.price.toNumber() / Math.pow(10, 6);
    let convertAmount = releasePriceUi + (releasePriceUi * hub.referralFee.toNumber()) / 1000000;
    let usdcBalance = await getUsdcBalance(provider.wallet.publicKey, provider.connection);
    if (usdcBalance < convertAmount) {
      const additionalComputeBudgetInstruction = anchor.web3.ComputeBudgetProgram.requestUnits({
        units: 400000,
        additionalFee: 0,
      });
      instructions.push(additionalComputeBudgetInstruction);
      convertAmount -= usdcBalance;
      const amt = Math.round(((convertAmount + convertAmount * 0.01) / solPrice.data.data.price) * Math.pow(10, 9));
      const { data } = await axios.get(
        `https://quote-api.jup.ag/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amt}&slippage=0.5&onlyDirectRoutes=true`
      );
      let transactionInstructions;
      for await (let d of data.data) {
        const transactions = await axios.post('https://quote-api.jup.ag/v1/swap', {
          route: d,
          userPublicKey: provider.wallet.publicKey.toBase58(),
        });
        if (!transactionInstructions) {
          transactionInstructions = anchor.web3.Transaction.from(
            Buffer.from(transactions.data.swapTransaction, 'base64')
          ).instructions;
        } else {
          const tx = anchor.web3.Transaction.from(Buffer.from(transactions.data.swapTransaction, 'base64'));
          let accountCount = tx.instructions.reduce((count, ix) => (count += ix.keys.length), 0);
          if (accountCount < transactionInstructions.reduce((count, ix) => (count += ix.keys.length), 0)) {
            transactionInstructions = tx.instructions;
          }
        }
      }
      instructions.push(...transactionInstructions);
    }
    if (receiverReleaseTokenAccountIx) {
      instructions.push(receiverReleaseTokenAccountIx);
    }

    if (instructions.length > 0) {
      request.instructions = instructions;
    }

    const tx = await program.methods
      .releasePurchaseViaHub(release.price, decodeNonEncryptedByteArray(hub.handle))
      .accounts({
        payer: provider.wallet.publicKey,
        receiver: provider.wallet.publicKey,
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
      })
      .preInstructions(instructions || [])
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);

    return txid;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 *
 * @function releasePurchase
 * @param {Object} client NinaClient instance.
 * @param {String} releasePublicKey Public Key of the release.
 * @param {String} hubPublicKey Public Key of the hub.
 * @returns
 */

const releasePurchase = async (client, releasePublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);
    const release = await program.account.release.fetch(releasePublicKey);
    if (release.price.toNumber === 0) {
      const message = new TextEncoder().encode(releasePublicKey.toBase58());
      const messageBase64 = encodeBase64(message);
      const signature = await provider.wallet.sign(message);
      const signatureBase64 = encodeBase64(signature);
      const response = await axios.get(
        `${process.env.NINA_IDENTITY_ENDPOINT}/collect/${releasePublicKey.toBase58()}?message=${encodeURIComponent(
          messageBase64
        )}&signature=${encodeURIComponent(signatureBase64)}&publicKey=${encodeURIComponent(
          provider.wallet.publicKey.toBase58()
        )}`
      );
      return response.data.txid;
    }
    let [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    );

    let [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.releaseMint
    );
    const instructions = [];
    if (receiverReleaseTokenAccountIx) {
      instructions.push({
        instructions: [receiverReleaseTokenAccountIx],
        cleanupInstructions: [],
        signers: [],
      });
    }
    if (client.isSol(release.paymentMint)) {
      const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(provider, release.price, release.paymentMint);
      if (!request.instructions) {
        instructions = [...wrappedSolInstructions];
      } else {
        instructions.push(...wrappedSolInstructions);
      }
      payerTokenAccount = wrappedSolAccount;
    }

    const tx = await program.methods
      .releasePurchase(release.price)
      .accounts({
        payer: provider.wallet.publicKey,
        receiver: provider.wallet.publicKey,
        release: releasePublicKey,
        releaseSigner: release.releaseSigner,
        payerTokenAccount,
        receiverReleaseTokenAccount,
        royaltyTokenAccount: release.royaltyTokenAccount,
        releaseMint: release.releaseMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(instructions || [])
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    return txid;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 *
 * @function releaseInitViaHub
 * @param {Object} client the NinaClient
 * @param {String} hubPublicKey Public Key of the hub.
 * @param {Number} retailPrice Retail price of the release.
 * @param {Number} amount Amount of the release.
 * @param {Number} resalePercentage Resale percentage of the release.
 * @param {Boolean} isUsdc Is the payment in USDC or SOL.
 * @param {String} metadataUri Metadata URI of the release.
 * @param {String} artist Artist of the release.
 * @param {String} title Title of the release.
 * @param {String} catalogNumber Catalog number of the release.
 * @param {String} release Release of the release.
 * @param {String} releaseBump Release bump of the release.
 * @param {String} releaseMint Release mint of the release.
 * @param {Boolean} isOpen Is the release open or not.
 * @returns
 */

const releaseInitViaHub = async (
  client,
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
  isOpen
) => {
  try {
    const ids = NinaClient.ids;
    const { provider } = client;
    const program = await client.useProgram();
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);
    const hub = await program.account.hub.fetch(hubPubkey);
    const paymentMint = new anchor.web3.PublicKey(isUsdc ? ids.mints.usdc : ids.mints.wsol);

    const [releaseSigner, releaseSignerBump] = await anchor.web3.PublicKey.findProgramAddress(
      [release.toBuffer()],
      program.programId
    );
    const releaseMintIx = await createMintInstructions(provider, provider.wallet.publicKey, releaseMint.publicKey, 0);
    const [authorityTokenAccount, authorityTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint
    );

    const [royaltyTokenAccount, royaltyTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      releaseSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint,
      true
    );

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hubPubkey.toBuffer()],
      program.programId
    );

    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')), hubPubkey.toBuffer(), release.toBuffer()],
      program.programId
    );

    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')), hubPubkey.toBuffer(), release.toBuffer()],
      program.programId
    );

    let [hubWallet] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint
    );

    let instructions = [...releaseMintIx, royaltyTokenAccountIx];

    if (authorityTokenAccountIx) {
      instructions.push(authorityTokenAccountIx);
    }

    const editionAmount = isOpen ? MAX_INT : amount;
    const config = {
      amountTotalSupply: new anchor.BN(editionAmount),
      amountToArtistTokenAccount: new anchor.BN(0),
      amountToVaultTokenAccount: new anchor.BN(0),
      resalePercentage: new anchor.BN(resalePercentage * 10000),
      price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
      releaseDatetime: new anchor.BN(Date.now() / 1000),
    };
    const bumps = {
      release: releaseBump,
      signer: releaseSignerBump,
    };
    const metadataProgram = new anchor.web3.PublicKey(ids.programs.metaplex);
    const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('metadata'), metadataProgram.toBuffer(), releaseMint.publicKey.toBuffer()],
      metadataProgram
    );

    const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32));
    const nameBufString = nameBuf.slice(0, 32).toString();

    const symbolBuf = Buffer.from(catalogNumber.substring(0, 10));
    const symbolBufString = symbolBuf.slice(0, 10).toString();

    const metadataData = {
      name: nameBufString,
      symbol: symbolBufString,
      uri: metadataUri,
      sellerFeeBasisPoints: resalePercentage * 100,
    };

    const tx = await program.methods
      .releaseInitViaHub(config, bumps, metadataData, decodeNonEncryptedByteArray(hub.handle))
      .accounts({
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
      })
      .preInstructions(instructions)
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    tx.partialSign(releaseMint);

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);

    await getConfirmTransaction(txid, provider.connection);
    const newRelease = await Hub.fetchHubRelease(hubPubkey.toBase58(), hubRelease.toBase58());
    return newRelease;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const initializeReleaseAndMint = async (client, hubPubkey) => {
  try {
    console.log('working...');
    const program = await client.useProgram();
    const releaseMint = anchor.web3.Keypair.generate();
    const [release, releaseBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-release')), releaseMint.publicKey.toBuffer()],
      program.programId
    );
    let hubRelease;
    if (hubPubkey) {
      const [_hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
          new anchor.web3.PublicKey(hubPubkey).toBuffer(),
          release.toBuffer(),
        ],
        program.programId
      );
      hubRelease = _hubRelease;
    }
    return {
      release,
      releaseBump,
      releaseMint,
      hubRelease,
    };
  } catch (error) {
    console.warn(error);
    return false;
  }
};

/**
 *
 * @function releaseInit
 * @param {Object} client the NinaClient
 * @param {Number} retailPrice Retail price of the release.
 * @param {Number} amount Amount of the release.
 * @param {Number} resalePercentage Resale percentage of the release.
 * @param {String} metadataUri Metadata URI of the release.
 * @param {String} artist Artist of the release.
 * @param {String} title Title of the release.
 * @param {String} catalogNumber Catalog number of the release.
 * @param {String} metadataUri Metadata URI of the release.
 * @param {Boolean} isUsdc Is the release priced in USDC or not.
 * @param {String} release Release of the release.
 * @param {String} releaseBump Release bump of the release.
 * @param {String} releaseMint Release mint of the release.
 * @param {Boolean} isOpen Is the release open or not.
 * @returns
 */

export const releaseInit = async (
  client,
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
  isOpen
) => {
  try {
    const ids = NinaClient.ids;
    const { provider } = client;
    const program = await client.useProgram();
    const paymentMint = new anchor.web3.PublicKey(isUsdc ? ids.mints.usdc : ids.mints.wsol);
    const publishingCreditMint = new anchor.web3.PublicKey(ids.mints.publishingCredit);

    const [releaseSigner, releaseSignerBump] = await anchor.web3.PublicKey.findProgramAddress(
      [release.toBuffer()],
      program.programId
    );

    const releaseMintIx = await createMintInstructions(provider, provider.wallet.publicKey, releaseMint.publicKey, 0);

    const [authorityTokenAccount, authorityTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint
    );

    const [royaltyTokenAccount, royaltyTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      releaseSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      paymentMint,
      true
    );

    const [authorityPublishingCreditTokenAccount, authorityPublishingCreditTokenAccountIx] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        publishingCreditMint
      );

    let instructions = [...releaseMintIx, royaltyTokenAccountIx];

    if (authorityTokenAccountIx) {
      instructions.push(authorityTokenAccountIx);
    }

    if (authorityPublishingCreditTokenAccountIx) {
      instructions.push(authorityPublishingCreditTokenAccountIx);
    }
    let now = new Date();
    const editionAmount = isOpen ? MAX_INT : amount;
    const config = {
      amountTotalSupply: new anchor.BN(editionAmount),
      amountToArtistTokenAccount: new anchor.BN(0),
      amountToVaultTokenAccount: new anchor.BN(0),
      resalePercentage: new anchor.BN(resalePercentage * 10000),
      price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
      releaseDatetime: new anchor.BN(now.getTime() / 1000),
    };

    const metadataProgram = new anchor.web3.PublicKey(ids.programs.metaplex);
    const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('metadata'), metadataProgram.toBuffer(), releaseMint.publicKey.toBuffer()],
      metadataProgram
    );

    const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32));
    const nameBufString = nameBuf.slice(0, 32).toString();

    const symbolBuf = Buffer.from(catalogNumber.substring(0, 10));
    const symbolBufString = symbolBuf.slice(0, 10).toString();

    const metadataData = {
      name: nameBufString,
      symbol: symbolBufString,
      uri: metadataUri,
      sellerFeeBasisPoints: resalePercentage * 100,
    };

    const bumps = {
      release: releaseBump,
      signer: releaseSignerBump,
    };

    const tx = await program.methods
      .releaseInit(config, bumps, metadataData)
      .accounts({
        release,
        releaseSigner,
        releaseMint: releaseMint.publicKey,
        payer: provider.wallet.publicKey,
        authority: provider.wallet.publicKey,
        authorityTokenAccount: authorityTokenAccount,
        paymentMint,
        royaltyTokenAccount,
        metadata,
        metadataProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions(instructions)
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    tx.partialSign(releaseMint);
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);

    const createdRelease = await fetch(release.toBase58());
    return createdRelease;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

/**
 * @function closeRelease
 * @param {Object} client the NinaClient
 * @param {String} releasePublicKey Public Key of the release.
 * @returns
 */

const closeRelease = async (client, releasePublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const release = await program.account.release.fetch(new anchor.web3.PublicKey(releasePublicKey));
    const tx = await program.methods
      .releaseCloseEdition()
      .accounts({
        authority: provider.wallet.publicKey,
        release: new anchor.web3.PublicKey(releasePublicKey),
        releaseSigner: release.releaseSigner,
        releaseMint: release.releaseMint,
      })
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);

    await getConfirmTransaction(txid, provider.connection);
    const closedRelease = await fetch(releasePublicKey);
    return closedRelease;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

/**
 * @function collectRoyaltyForRelease
 * @param {Object} client the NinaClient
 * @param {String} recipient Public Key of the recipient.
 * @param {String} releasePublicKey Public Key of the release.
 * @param {Object} state the NinaClient state.
 * @returns
 */

const collectRoyaltyForRelease = async (client, recipient, releasePublicKey, state) => {
  if (!releasePublicKey || !recipient) {
    return;
  }
  try {
    const { provider } = client;
    const program = await client.useProgram();

    let release;
    if (!state) {
      release = await program.account.release.fetch(new anchor.web3.PublicKey(releasePublicKey));
    } else {
      release = state.tokenData[releasePublicKey];
    }

    release.paymentMint = new anchor.web3.PublicKey(release.paymentMint);
    const [authorityTokenAccount, authorityTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    );

    let instructions;
    if (authorityTokenAccountIx) {
      instructions = [authorityTokenAccountIx];
    }

    const tx = await program.methods
      .releaseRevenueShareCollect()
      .accounts({
        authority: provider.wallet.publicKey,
        authorityTokenAccount,
        release: new anchor.web3.PublicKey(releasePublicKey),
        releaseMint: release.releaseMint,
        releaseSigner: release.releaseSigner,
        royaltyTokenAccount: release.royaltyTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .preInstructions(instructions || [])
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const collectedRelease = await fetch(releasePublicKey);
    return collectedRelease;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

/**
 * @function addRoyaltyRecipient
 * @param {Object} client
 * @param {String} recipient
 * @param {String} releasePublicKey
 */
const addRoyaltyRecipient = async (client, release, updateData, releasePublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const releasePubkey = new anchor.web3.PublicKey(releasePublicKey);
    if (!release) {
      release = await program.account.release.fetch(releasePubkey);
    }
    const recipientPublicKey = new anchor.web3.PublicKey(updateData.recipientAddress);
    const updateAmount = updateData.percentShare * 10000;

    let [newRoyaltyRecipientTokenAccount, newRoyaltyRecipientTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      recipientPublicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      new anchor.web3.PublicKey(release.paymentMint)
    );

    let [authorityTokenAccount, authorityTokenAccountIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      new anchor.web3.PublicKey(release.paymentMint)
    );

    if (newRoyaltyRecipientTokenAccountIx) {
      request.instructions = [newRoyaltyRecipientTokenAccountIx];
    }

    if (authorityTokenAccountIx) {
      request.instructions = [authorityTokenAccountIx];
    }

    const tx = await program.methods.releaseRevenueShareTransfer(new anchor.BN(updateAmount)).accounts({
      authority: provider.wallet.publicKey,
      authorityTokenAccount,
      release: releasePublicKey,
      releaseMint: new anchor.web3.PublicKey(release.releaseMint),
      releaseSigner: new anchor.web3.PublicKey(release.releaseSigner),
      royaltyTokenAccount: release.royaltyTokenAccount,
      newRoyaltyRecipient: recipientPublicKey,
      newRoyaltyRecipientTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).transaction()
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    return recipientPublicKey;
  } catch (error) {
    console.warn(error);
    return false;
  }
};

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
  releasePurchase,
  releaseInit,
  closeRelease,
  collectRoyaltyForRelease,
  addRoyaltyRecipient,
};
