import NinaClient from '../client';
import axios from 'axios';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount, getConfirmTransaction, uiToNative } from '../utils';
import MD5 from 'crypto-js/md5';
import Release from './releases'
/**
 * @module Hub
 */

/**
 * @function fetchAll
 * @description Fetches all hubs.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub accounts.
 * @example const hubs = await NinaClient.Hub.fetchAll();
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
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub, HubRelease, HubPost, HubContent, HubCollaborator, Release, and Post accounts.
 * @example const hub = await NinaClient.Hub.fetch('ninas-picks');
 */
const fetch = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}`, undefined, withAccountData);
};

/**
 * @function fetchCollaborators
 * @description Fetches the Collaborators of a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubCollaborator accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 */
const fetchCollaborators = async (publicKeyOrHandle) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators`);
};

/**
 * @function fetchCollaborator
 * @description Fetches a Collaborator by Publickey.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubCollaborator accounts.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 */
const fetchHubCollaborator = async (publicKeyOrHandle, collaboratorPubkey) => {
  //TODO:  endpoint needs to be uodated, currently retrurns {success: true}
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators/${collaboratorPubkey}`);
};

/**
 * @function fetchReleases
 * @description Fetches Releases for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubRelease, HubContent, and Release accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const releases = await NinaClient.Hub.fetchReleases('ninas-picks');
 */
const fetchReleases = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/releases`, undefined, withAccountData);
};

/**
 * @function fetchPosts
 * @description Fetches Posts for a hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const posts = await NinaClient.Hub.fetchPosts('ninas-picks');
 */
const fetchPosts = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/posts`, undefined, withAccountData);
};

/**
 * @function fetchHubRelease
 * @description Fetches a Release for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubReleasePublicKey The public key of the HubRelease.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubRelease = await NinaClient.Hub.fetchHubRelease('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ);
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
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubPostPublicKey The public key of the HubPost.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubPost = await NinaClient.Hub.fetchHubPost('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ');
 */
const fetchHubPost = async (publicKeyOrHandle, hubPostPublicKey, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubPosts/${hubPostPublicKey}`, undefined, withAccountData);
};

/**
 * @function fetchSubscriptions
 * @description Fetches the subscriptions for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
 */

const fetchSubscriptions = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/subscriptions`, undefined, withAccountData);
};

/**
 * @function hubInit
 * @description Initializes a Hub account with Hub Credit.
 * @param {Object} client The NinaClient.
 * @param {Object} hubParams The Hub parameters. // NOTE: exand
 * @example const hub = await NinaClient.Hub.hubInit({})
 * @returns {Object} The created Hub account.
 */
const hubInit = async (client, hubParams) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const USDC_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.usdc);
    const WRAPPED_SOL_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.wsol);
    const HUB_CREDIT_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.hubCredit);

    hubParams.publishFee = new anchor.BN(hubParams.publishFee * 10000);
    hubParams.referralFee = new anchor.BN(hubParams.referralFee * 10000);
    const [hub] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub')),
        Buffer.from(anchor.utils.bytes.utf8.encode(hubParams.handle)),
      ],
      program.programId
    );

    const [hubSigner, hubSignerBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hub.toBuffer()],
      program.programId
    );
    hubParams.hubSignerBump = hubSignerBump;

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
      .hubInit(hubParams)
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
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} uri - The URI of the Hubs updated metadata.
 * @param {Number} publishFee
 * @param {Number} referralFee
 * @example const hub = await NinaClient.Hub.hubUpdateConfig(hubPublicKey, 'https://nina.com', 0.1, 0.1, wallet, connection);
 * @returns {Object} The updated Hub account.
 */
const hubUpdateConfig = async (client, hubPublicKey, uri, publishFee, referralFee) => {
  try {
    const { provider,endpoints } = client;
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
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} collaboratorPubkey - The public key of the collaborator account.
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @returns {Object} Collaborator
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
      hubPublicKey : hubPublicKey.toBase58(),
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
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey - The public key of the Hub account.
 * @param {String} collaboratorPubkey - The public key of the collaborator account.
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @example const hub = await NinaClient.Hub.hubUpdateCollaboratorPermission(hubPublicKey, collaboratorPubkey, true, true, 10, wallet, connection);
 * @returns {Object} Collaborator
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
      error
    };
  }
};

/**
 * @function hubRemoveCollaborator
 * @description Removes a collaborator from a Hub.
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey
 * @param {String} collaboratorPubkey
 * @returns {Object} Collaborator
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
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey Pulic key of the content's Hub.
 * @param {String} contentAccountPublicKey Pubkey of the content account.
 * @param {String} type Should be either 'Release' or 'Post'.
 * @example const hub = await NinaClient.Hub.hubContentToggleVisibility(ninaClient, hubPublicKey, contentAccountPublicKey, 'Release');
 * @returns {Object} The HubChildPublicKey.
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
      error
    }
  }
};

/**
 * @function hubAddRelease
 * @description Adds a Release to a Hub.
 * @param {Object} client The NinaClient.
 * @param {String} hubPublicKey
 * @param {String} releasePublicKey
 * @param {String=} fromHub
 * @returns {Object} The Hub Release Data
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
      error
    };
  }
};

/**
 * @function postInitViaHub
 * @description Creates a Post on a Hub.
 * @param {String} hubPublicKey - The public key of the Hub.
 * @param {String} slug - The slug of the Post.
 * @param {String} uri - The URI of the Post.
 * @param {String=} referenceRelease - The public key of the reference Release.
 * @param {String=} fromHub - The public key of the reference Hub.
 * @example const post = await NinaClient.Hub.postInitViaHub(ninaClient, hubPublicKey, slug, uri);
 * @returns {Object} The Post.
 */

const postInitViaHub = async (client, hubPublicKey, slug, uri, referenceRelease = undefined, fromHub) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    const { hub } = await fetch(hubPublicKey);
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    if (referenceRelease) {
      referenceRelease = new anchor.web3.PublicKey(referenceRelease);
    }
    const slugHash = MD5(slug).toString().slice(0, 32);
    const [post] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
        hubPublicKey.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode(slugHash)),
      ],
      program.programId
    );
    const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')), hubPublicKey.toBuffer(), post.toBuffer()],
      program.programId
    );
    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')), hubPublicKey.toBuffer(), post.toBuffer()],
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
    let tx;
    const params = [hub.handle, slugHash, uri];

    const request = {
      accounts: {
        author: provider.wallet.publicKey,
        hub: hubPublicKey,
        post,
        hubPost,
        hubContent,
        hubCollaborator,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    };

    if (fromHub) {
      request.remainingAccounts = [
        {
          pubkey: new anchor.web3.PublicKey(fromHub),
          isWritable: false,
          isSigner: false,
        },
      ];
    }
    if (referenceRelease) {
      let referenceReleaseHubRelease;
      request.accounts.referenceRelease = referenceRelease;

      let [_referenceReleaseHubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
          hubPublicKey.toBuffer(),
          referenceRelease.toBuffer(),
        ],
        program.programId
      );
      request.accounts.referenceReleaseHubRelease = _referenceReleaseHubRelease;
      referenceReleaseHubRelease = _referenceReleaseHubRelease;
      const [referenceReleaseHubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPublicKey.toBuffer(),
          referenceRelease.toBuffer(),
        ],
        program.programId
      );
      request.accounts.referenceReleaseHubContent = referenceReleaseHubContent;
      tx = await program.methods
        .postInitViaHubWithReferenceRelease(...params)
        .accounts(request.accounts)
        .transaction();
    } else {
      tx = await program.methods
        .postInitViaHub(...params)
        .accounts(request.accounts)
        .transaction();
    }
    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const hubPostData = await fetchHubPost(hubPublicKey.toBase58(), hubPost.toBase58());
    return {
      post: hubPostData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error
    }
  }
};

/**
 * @function postUpdateViaHub
 * @description Creates a Post on a Hub.
 * @param {String} hubPublicKey - The public key of the Hub.
 * @param {String} slug - The slug of the Post.
 * @param {String} uri - The URI of the Post.
 * @param {String=} referenceRelease - The public key of the reference Release.
 * @param {String=} fromHub - The public key of the reference Hub.
 * @example const post = await NinaClient.Hub.postInitViaHub(ninaClient, hubPublicKey, slug, uri);
 * @returns {Object} The Post.
 */

const postUpdateViaHub = async (client, hubPublicKey, slug, uri) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

    const [post] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
        hubPublicKey.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode(slug)),
      ],
      program.programId
    );

    const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')), hubPublicKey.toBuffer(), post.toBuffer()],
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

    const tx = await program.methods
      .postUpdateViaHubPost(hub.handle, slug, uri)
      .accounts({
        author: provider.wallet.publicKey,
        hub: hubPublicKey,
        post,
        hubPost,
        hubCollaborator,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const hubPostData = await fetchHubPost(hubPublicKey.toBase58(), hubPost.toBase58());

    return {
      post: hubPostData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error
    }
  }
};

/**
 * @function collectRoyaltyForReleaseViaHub
 * @description Collects royalties on a releaase via Hub Dashboard.
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
    const recipient = release.royaltyRecipients.find(
      (recipient) => recipient.recipientAuthority.toBase58() === hub.hubSigner.toBase58()
    );
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
    }
  } catch (error) {
    console.warn(error);
    return {
      error
    }
  }
};

/**
 * @function hubWithdraw
 * @description Withdraws Hub fees in Hub dashboard.
 * @param {Object} client - The Nina Client.
 * @param {String} hubPublicKey
 * @example const txid = await NinaClient.Hub.hubWithdraw(ninaClient, hubPublicKey);
 * @returns { Object } the Hub.
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
      error
    }
  }
};

export default {
  fetchAll,
  fetch,
  fetchCollaborators,
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
  postInitViaHub,
  postUpdateViaHub,
  collectRoyaltyForReleaseViaHub,
  hubWithdraw,
};
