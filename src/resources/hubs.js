import NinaClient from '../client';
import axios from 'axios';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount, getConfirmTransaction, uiToNative } from '../utils';
import Release from './releases';
/**
 * @module Hub
 */

/**
 * @function fetchAll
 * @description Fetches all Hubs on Nina.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] - Pagination options.
 * @param {Boolean} [withAccountData = false] - Include full on-chain Hub accounts.
 * @example const hubs = await NinaClient.Hub.fetchAll();
 * @returns {Array} an array of all of the Hubs on Nina.
 */

const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/hubs',
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
 * @description Fetches a Hub along with its Releases, Collaborators, and Posts.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] - Include full on-chain Hub, HubRelease, HubPost, HubContent, HubCollaborator, Release, and Post accounts.
 * @example const hub = await NinaClient.Hub.fetch('ninas-picks');
 * @returns {Object} The Hub account.
 */

const fetch = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}`, undefined, withAccountData);
};

/**
 * @function fetchCollaborators
 * @description Fetches the Collaborators of a Hub.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubCollaborator accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 * @returns {Array} an array of all of the Collaborators that belong to a Hub.
 */

const fetchCollaborators = async (publicKeyOrHandle) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators`);
};

/**
 * @function fetchCollaborator
 * @description Fetches a Collaborator by Publickey.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubCollaborator accounts.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 * @returns {Object} a specific Collaborator that belongs to a Hub.
 */

const fetchHubCollaborator = async (publicKeyOrHandle, collaboratorPubkey) => {
  //TODO:  endpoint needs to be uodated, currently retrurns {success: true}
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators/${collaboratorPubkey}`);
};

/**
 * @function fetchReleases
 * @description Fetches Releases for a Hub.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubRelease, HubContent, and Release accounts.
 * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
 * @example const releases = await NinaClient.Hub.fetchReleases('ninas-picks');
 * @returns {Array} an array of all of the Releases that belong to a Hub.
 */

const fetchReleases = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/releases`, undefined, withAccountData);
};

/**
 * @function fetchPosts
 * @description Fetches Posts for a hub.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
 * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
 * @example const posts = await NinaClient.Hub.fetchPosts('ninas-picks');
 * @returns {Array} an array of all of the Posts that belong to a Hub.
 */

const fetchPosts = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/posts`, undefined, withAccountData);
};

/**
 * @function fetchHubRelease
 * @description Fetches a Release for a Hub.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub.
 * @param {String} hubReleasePublicKey - The public key of the HubRelease.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubRelease = await NinaClient.Hub.fetchHubRelease('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ);
 * @returns {Object} a specific Release from a Hub.
 */

const fetchHubRelease = async (publicKeyOrHandle, hubReleasePublicKey, withAccountData = false) => {
  return await NinaClient.get(
    `/hubs/${publicKeyOrHandle}/hubReleases/${hubReleasePublicKey}`,
    undefined,
    withAccountData
  );
};

/**
 * @function fetchHubPost
 * @description Fetches a hubPost
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub.
 * @param {String} hubPostPublicKey - The public key of the HubPost.
 * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubPost = await NinaClient.Hub.fetchHubPost('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ');
 * @returns {Object} a specific Hub Post.
 */

const fetchHubPost = async (publicKeyOrHandle, hubPostPublicKey, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubPosts/${hubPostPublicKey}`, undefined, withAccountData);
};

/**
 * @function fetchSubscriptions
 * @description Fetches the subscriptions for a Hub.
 * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
 * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
 * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
 * @returns {Array} an array of all of the Subscriptions that belong to a Hub.
 */

const fetchSubscriptions = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/subscriptions`, undefined, withAccountData);
};

/**
 * @function hubInit
 * @description Initializes a Hub account with Hub Credit.
 * @param {Object} client - The Nina Client instance.
 * @param {String} handle - The handle of the Hub.
 * @param {Number} publishFee - The fee to publish a Release or Post on a Hub
 * @param {Number} referralFee - The percentage of the publish fee that goes to the referrer
 * @param {Number} hubSignerBump - The bump seed for the Hub Signer.
 * @example const hub = await NinaClient.Hub.hubInit({})
 * @returns {Object} The created Hub account.
 */

const hubInit = async (client, handle, publishFee, referralFee) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const USDC_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.usdc);
    const WRAPPED_SOL_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.wsol);
    const HUB_CREDIT_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.hubCredit);

    publishFee = new anchor.BN(publishFee * 10000);
    referralFee = new anchor.BN(referralFee * 10000);
    const [hub] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub')), Buffer.from(anchor.utils.bytes.utf8.encode(handle))],
      program.programId
    );

    const [hubSigner, hubSignerBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hub.toBuffer()],
      program.programId
    );

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hub.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    let [, usdcVaultIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      USDC_MINT
    );

    let [, wrappedSolVaultIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      WRAPPED_SOL_MINT
    );
    //add IX for create
    const tx = await program.methods
      .hubInit({
        publishFee,
        referralFee,
        handle,
        hubSignerBump,
      })
      .accounts({
        authority: provider.wallet.publicKey,
        hub,
        hubSigner,
        hubCollaborator,
        hubCreditMint: HUB_CREDIT_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: NinaClient.ids.programs.token,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([usdcVaultIx, wrappedSolVaultIx])
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const createdHub = await fetch(hub.toBase58());
    return {
      createdHub: createdHub,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubUpdateConfig
 * @description Updates the configuration of a Hub.
 * @param {Object} client - The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} uri - The URI of the Hubs updated metadata.
 * @param {Number} publishFee - The fee to publish a Release or Post on a Hub
 * @param {Number} referralFee - The percentage of the publish fee that goes to the referrer
 * @example const hub = await NinaClient.Hub.hubUpdateConfig(hubPublicKey, 'https://nina.com', 0.1, 0.1, wallet, connection);
 * @returns {Object} The updated Hub account.
 */

const hubUpdateConfig = async (client, hubPublicKey, uri, publishFee, referralFee) => {
  try {
    const { provider, endpoints } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    const tx = await program.methods
      .hubUpdateConfig(uri, hub.handle, new anchor.BN(publishFee * 10000), new anchor.BN(referralFee * 10000))
      .accounts({
        authority: provider.wallet.publicKey,
        hub: hubPublicKey,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    await axios.get(endpoints.api + `/hubs/${hubPublicKey.toBase58()}/tx/${txid}`);
    const updatedHub = await fetch(hubPublicKey);
    return {
      updatedHub: updatedHub,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubAddCollaborator
 * @description Adds a collaborator to a Hub.
 * @param {Object} client The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} collaboratorPubkey - The public key of the collaborator account.
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - Integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @example await NinaClient.Hub.hubAddCollaborator(ninaClient, hubPublicKey, collaboratorPubkey, true, true, 10);
 * @returns {Object} the added collaborator of a Hub.
 */

const hubAddCollaborator = async (
  client,
  hubPublicKey,
  collaboratorPubkey,
  canAddContent,
  canAddCollaborator,
  allowance
) => {
  try {
    const { provider, endpoints } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    const [authorityHubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .hubAddCollaborator(canAddContent, canAddCollaborator, allowance, hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        authorityHubCollaborator,
        hub: hubPublicKey,
        hubCollaborator,
        collaborator: collaboratorPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);

    await getConfirmTransaction(txid, provider.connection);
    await axios.get(endpoints.api + `/hubs/${hub.handle}/collaborators/${hubCollaborator.toBase58()}`);
    // endpoint needs to be updated to return collaborator
    return {
      collaboratorPublicKey: collaboratorPubkey.toBase58(),
      hubPublicKey: hubPublicKey.toBase58(),
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubUpdateCollaboratorPermission
 * @description Updates the permissions of a collaborator on a Hub.
 * @param {Object} client - The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} collaboratorPubkey - The public key of the collaborator account.
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - Integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @example const hub = await NinaClient.Hub.hubUpdateCollaboratorPermission(ninaClient, hubPublicKey, collaboratorPubkey, true, true, 10);
 * @returns {Object} the updated account of a collaborator of a Hub.
 */

const hubUpdateCollaboratorPermission = async (
  client,
  hubPublicKey,
  collaboratorPubkey,
  canAddContent,
  canAddCollaborator,
  allowance
) => {
  try {
    const { provider, endpoints } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    const [authorityHubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .hubUpdateCollaboratorPermissions(canAddContent, canAddCollaborator, allowance, hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        authorityHubCollaborator,
        hub: hubPublicKey,
        hubCollaborator,
        collaborator: collaboratorPubkey,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await axios.get(endpoints.api + `/hubs/${hub.handle}/collaborators/${hubCollaborator.toBase58()}`);

    await getConfirmTransaction(txid, provider.connection);
    // endpoint needs to be updated to return collaborator
    return {
      collaboratorPublicKey: collaboratorPubkey.toBase58(),
      hubPublicKey: hubPublicKey.toBase58(),
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubRemoveCollaborator
 * @description Removes a collaborator from a Hub.
 * @param {Object} client - The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the Hub removing the collaborator.
 * @param {String} collaboratorPubkey - The public key of the collaborator account.
 * @example await NinaClient.Hub.hubRemoveCollaborator(ninaClient,"DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW","8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX");
 * @returns {Object} the account of the removed collaborator from the Hub.
 */

const hubRemoveCollaborator = async (client, hubPublicKey, collaboratorPubkey) => {
  try {
    const { provider, endpoints } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .hubRemoveCollaborator(hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        hub: hubPublicKey,
        hubCollaborator,
        collaborator: collaboratorPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);

    await getConfirmTransaction(txid, provider.connection);
    await axios.get(endpoints.api + `/hubs/${hub.handle}/collaborators/${hubCollaborator.toBase58()}`);
    // endpoint needs to be updated to return collaborator
    return {
      collaboratorPublicKey: collaboratorPubkey.toBase58(),
      hubPublicKey: hubPublicKey.toBase58(),
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubContentToggleVisibility
 * @description Toggles the visibility of a piece of content on a Hub.
 * @param {Object} client - The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the content's Hub.
 * @param {String} contentAccountPublicKey - The public key of the content account, which is either a Release or a Post.
 * @param {String} type - The content type. Should be either 'Release' or 'Post'.
 * @example const hub = await NinaClient.Hub.hubContentToggleVisibility(ninaClient, "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW", "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", 'Release');
 * @returns {Object} The toggled Post or Release.
 */

const hubContentToggleVisibility = async (client, hubPublicKey, contentAccountPublicKey, type) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    contentAccountPublicKey = new anchor.web3.PublicKey(contentAccountPublicKey);

    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        hubPublicKey.toBuffer(),
        contentAccountPublicKey.toBuffer(),
      ],
      program.programId
    );
    const [hubChildPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-${type.toLowerCase()}`)),
        hubPublicKey.toBuffer(),
        contentAccountPublicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .hubContentToggleVisibility(hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        hub: hubPublicKey,
        hubContent,
        contentAccount: contentAccountPublicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await provider.connection.getParsedTransaction(txid, 'finalized');

    let toggledResult;
    if (type === 'Release') {
      toggledResult = await fetchHubRelease(hubPublicKey.toBase58(), hubChildPublicKey.toBase58());
    } else if (type === 'Post') {
      toggledResult = await fetchHubPost(hubPublicKey.toBase58(), hubChildPublicKey.toBase58());
    }

    return {
      hubRelease: toggledResult,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubAddRelease
 * @description Reposts a Release to a Hub. When you repost a release, it will surface to your Hub alongside Releases you have published.
 * @param {Object} client - The Nina Client instance.
 * @param {String} hubPublicKey - The public key of the Hub.
 * @param {String} releasePublicKey - The public key of the Release.
 * @param {String} fromHub - The public key of the referenced Hub.
 * @example await NinaClient.Hubs.hubAddRelease(ninaClient, "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW");
 * @returns {Object} the Hub Release data.
 */

const hubAddRelease = async (client, hubPublicKey, releasePublicKey, fromHub) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
    releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);

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

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPublicKey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    let remainingAccounts;
    if (fromHub) {
      remainingAccounts = [
        {
          pubkey: new anchor.web3.PublicKey(fromHub),
          isWritable: false,
          isSigner: false,
        },
      ];
    }
    const tx = await program.methods
      .hubAddRelease(hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        hub: hubPublicKey,
        hubRelease,
        hubContent,
        hubCollaborator,
        release: releasePublicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);

    const hubReleaseData = await fetchHubRelease(hubPublicKey.toBase58(), hubRelease.toBase58());
    return {
      hubRelease: hubReleaseData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function collectRoyaltyForReleaseViaHub
 * @description Collects royalties on a release via Hub Dashboard.
 * @param {Object} client - The Nina Client.
 * @param {String} releasePublicKey - The public key of the Release.
 * @param {String} hubPublicKey - The public key of the Hub.
 * @example const royalty = await NinaClient.Hub.collectRoyaltyForReleaseViaHub(ninaClient, releasePublicKey, hubPublicKey);
 * @returns { Object } the Hub Release.
 */

const collectRoyaltyForReleaseViaHub = async (client, releasePublicKey, hubPublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    let hub = await program.account.hub.fetch(hubPublicKey);
    let release = await program.account.release.fetch(releasePublicKey);
    let hubMetadata = await fetch(hubPublicKey);

    const [hubWallet] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      new anchor.web3.PublicKey(hub.hubSigner),
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      release.paymentMint
    );
    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
        hubPublicKey.toBuffer(),
        releasePublicKey.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .releaseRevenueShareCollectViaHub(hubMetadata.hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        royaltyTokenAccount: release.royaltyTokenAccount,
        release: releasePublicKey,
        releaseSigner: release.releaseSigner,
        releaseMint: release.releaseMint,
        hub: hubPublicKey,
        hubRelease,
        hubSigner: hub.hubSigner,
        hubWallet,
        tokenProgram: NinaClient.ids.programs.token,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    // fetchHubRelease not returning account data so using Release.fetch for now
    const hubReleaseData = await Release.fetch(releasePublicKey.toBase58(), true);
    return {
      release: hubReleaseData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

/**
 * @function hubWithdraw
 * @description Withdraws Hub fees in the Hub dashboard.
 * @param {Object} client - The Nina Client.
 * @param {String} hubPublicKey - The public key of the Hub.
 * @example const txid = await NinaClient.Hub.hubWithdraw(ninaClient, hubPublicKey);
 * @returns { Object } the Hub account that made the withdrawal.
 */

const hubWithdraw = async (client, hubPublicKey) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
    const USDC_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.usdc);

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hubPublicKey.toBuffer()],
      program.programId
    );
    let [withdrawTarget] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      USDC_MINT
    );

    let [withdrawDestination] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      USDC_MINT
    );

    let tokenAccounts = await provider.connection.getParsedTokenAccountsByOwner(hubSigner, {
      mint: USDC_MINT,
    });

    const withdrawAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;

    const tx = await program.methods
      .hubWithdraw(new anchor.BN(uiToNative(withdrawAmount, USDC_MINT)), hub.handle)
      .accounts({
        authority: provider.wallet.publicKey,
        hub: hubPublicKey,
        hubSigner,
        withdrawTarget,
        withdrawDestination,
        withdrawMint: USDC_MINT,
        tokenProgram: NinaClient.ids.programs.token,
      })
      .transaction();
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);

    await getConfirmTransaction(txid, provider.connection);
    const hubData = await fetch(hubPublicKey.toBase58());
    return {
      hub: hubData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

export default {
  fetchAll,
  fetch,
  fetchCollaborators,
  fetchHubCollaborator,
  fetchReleases,
  fetchPosts,
  fetchHubRelease,
  fetchHubPost,
  fetchSubscriptions,
  hubInit,
  hubUpdateConfig,
  hubAddCollaborator,
  hubUpdateCollaboratorPermission,
  hubRemoveCollaborator,
  hubContentToggleVisibility,
  hubAddRelease,
  collectRoyaltyForReleaseViaHub,
  hubWithdraw,
}