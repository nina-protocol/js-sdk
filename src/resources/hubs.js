import NinaClient from '../client';
import axios from 'axios';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount, getConfirmTransaction } from '../utils';
import MD5 from 'crypto-js/md5';

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
 * @description Fetches a Hub along with it's Releases, Collaborators, and Posts.
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
 * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
 */

const fetchSubscriptions = async (publicKeyOrHandle, withAccountData = false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/subscriptions`, undefined, withAccountData);
};

/**
 * @function hubInitWithCredit
 * @description Initializes a Hub account with Hub Credit.
 * @param {Object} hubParams The Hub parameters. // NOTE: exand
 * @param {Object} wallet The wallet to use for the transaction.
 * @param {Object} connection Connection to the cluster.
 * @example const hub = await NinaClient.Hub.hubInitWithCredit({})
 */
const hubInitWithCredit = async (hubParams) => {
  try {
    const ids = NinaClient.ids;
    const program = await anchor.Program.at(ids.programs.nina, provider);
    const USDC_MINT = new anchor.web3.PublicKey(ids.mints.usdc);
    const WRAPPED_SOL_MINT = new anchor.web3.PublicKey(ids.mints.wsol);
    const HUB_CREDIT_MINT = new anchor.web3.PublicKey(ids.mints.hubCredit);

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

    let [authorityHubCreditTokenAccount] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      HUB_CREDIT_MINT
    );

    const txid = await program.methods
      .hubInitWithCredit(hubParams)
      .accounts({
        authority: wallet.publicKey,
        hub,
        hubSigner,
        hubCollaborator,
        authorityHubCreditTokenAccount,
        hubCreditMint: HUB_CREDIT_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: new anchor.web3.PublicKey(ids.programs.token),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([usdcVaultIx, wrappedSolVaultIx])
      .rpc();

    await connection.getParsedTransaction(txid, 'confirmed');
    const hubData = await fetch(hub.toBase58());
    return hubData;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubUpdateConfig
 * @description Updates the configuration of a Hub.
 * @param {String} hubPubkey - The public key of the Hub account.
 * @param {String} uri - The URI of the Hubs updated metadata.
 * @param {Number} publishFee
 * @param {Number} referralFee
 * @param {Object} wallet
 * @param {Object} connection
 * @example const hub = await NinaClient.Hub.hubUpdateConfig(hubPubkey, 'https://nina.com', 0.1, 0.1, wallet, connection);
 * @returns
 */
const hubUpdateConfig = async (client, hubPubkey, uri, publishFee, referralFee) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);

    const txid = await program.rpc.hubUpdateConfig(
      uri,
      hub.handle,
      new anchor.BN(publishFee * 10000),
      new anchor.BN(referralFee * 10000),
      {
        accounts: {
          authority: provider.wallet.publicKey,
          hub: hubPubkey,
        },
      }
    );

    await getConfirmTransaction(txid, provider.connection);
    await axios.get(`${process.env.NINA_API_ENDPOINT}/hubs/${hubPubkey.toBase58()}/tx/${txid}`);
    const updatedHub = await fetch(hubPubkey.toBase58());
    return updatedHub;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubAddCollaborator
 * @description Fetches a Release for a Hub.
 * @param {String} hubPubkey
 * @param {String} collaboratorPubkey
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @param {Object} wallet
 * @param {Object} connection
 * @returns
 */

const hubAddCollaborator = async (
  client,
  hubPubkey,
  collaboratorPubkey,
  canAddContent,
  canAddCollaborator,
  allowance
) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);
    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    const [authorityHubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const txid = await program.rpc.hubAddCollaborator(canAddContent, canAddCollaborator, allowance, hub.handle, {
      accounts: {
        authority: provider.wallet.publicKey,
        authorityHubCollaborator,
        hub: hubPubkey,
        hubCollaborator,
        collaborator: collaboratorPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });

    await getConfirmTransaction(txid, provider.connection);
    const collaborator = await fetchHubCollaborator(hub.handle, collaboratorPubkey.toBase58());
    return collaborator;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubUpdateCollaboratorPermission
 * @description Updates the permissions of a collaborator on a Hub.
 * @param {String} hubPubkey
 * @param {String} collaboratorPubkey
 * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
 * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
 * @param {Integer} allowance - integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
 * @param {Object} wallet
 * @param {Object} connection
 * @example const hub = await NinaClient.Hub.hubUpdateCollaboratorPermission(hubPubkey, collaboratorPubkey, true, true, 10, wallet, connection);
 */
const hubUpdateCollaboratorPermission = async (
  client,
  hubPubkey,
  collaboratorPubkey,
  canAddContent,
  canAddCollaborator,
  allowance
) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);
    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    const [authorityHubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const txid = await program.rpc.hubUpdateCollaboratorPermissions(
      canAddContent,
      canAddCollaborator,
      allowance,
      hub.handle,
      {
        accounts: {
          authority: provider.wallet.publicKey,
          authorityHubCollaborator,
          hub: hubPubkey,
          hubCollaborator,
          collaborator: collaboratorPubkey,
        },
      }
    );

    await getConfirmTransaction(txid, provider.connection);
    const collaborator = await fetchHubCollaborator(hub.handle, collaboratorPubkey.toBase58());
    return collaborator;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubRemoveCollaborator
 * @description Removes a collaborator from a Hub.
 * @param {String} hubPubkey
 * @param {String} collaboratorPubkey
 * @param {Object} wallet
 * @param {Object} connection
 * @returns
 */

const hubRemoveCollaborator = async (client, hubPubkey, collaboratorPubkey) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);

    collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey);
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        collaboratorPubkey.toBuffer(),
      ],
      program.programId
    );
    console.log(provider.wallet.publicKey.toBase58());
    const txid = await program.rpc.hubRemoveCollaborator(hub.handle, {
      accounts: {
        authority: provider.wallet.publicKey,
        hub: hubPubkey,
        hubCollaborator,
        collaborator: collaboratorPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });

    await getConfirmTransaction(txid, provider.connection);
    const collaborator = await fetchHubCollaborator(hub.handle, collaboratorPubkey.toBase58());
    return collaborator;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubContentToggleVisibility
 * @description Toggles the visibility of a piece of content on a Hub.
 * @param {String} hubPubkey Pulic key of the content's Hub.
 * @param {String} contentAccountPubkey Pubkey of the content account.
 * @param {String} type Should be either 'Release' or 'Post'.
 * @param {Object} wallet
 * @param {Object} connection
 * @returns
 */

const hubContentToggleVisibility = async (client, hubPubkey, contentAccountPubkey, type) => {
  try {
    const { provider } = client;

    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);

    contentAccountPubkey = new anchor.web3.PublicKey(contentAccountPubkey);

    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        hubPubkey.toBuffer(),
        contentAccountPubkey.toBuffer(),
      ],
      program.programId
    );
    const [hubChildPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-${type.toLowerCase()}`)),
        hubPubkey.toBuffer(),
        contentAccountPubkey.toBuffer(),
      ],
      program.programId
    );
    const txid = await program.rpc.hubContentToggleVisibility(hub.handle, {
      accounts: {
        authority: provider.wallet.publicKey,
        hub: hubPubkey,
        hubContent,
        contentAccount: contentAccountPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    await provider.connection.getParsedTransaction(txid, 'finalized');
    return hubChildPublicKey;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function hubAddRelease
 * @description Adds a Release to a Hub.
 * @param {String} hubPubkey
 * @param {String} releasePubkey
 * @param {String=} fromHub
 * @param {Object} wallet
 * @param {Object} connection
 * @returns
 */

const hubAddRelease = async (client, hubPubkey, releasePubkey, fromHub, wallet, connection) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);
    releasePubkey = new anchor.web3.PublicKey(releasePubkey);

    const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')), hubPubkey.toBuffer(), releasePubkey.toBuffer()],
      program.programId
    );

    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')), hubPubkey.toBuffer(), releasePubkey.toBuffer()],
      program.programId
    );

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const request = {
      accounts: {
        authority: provider.wallet.publicKey,
        hub: hubPubkey,
        hubRelease,
        hubContent,
        hubCollaborator,
        release: releasePubkey,
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
    await program.rpc.hubAddRelease(hub.handle, request);
    await getConfirmTransaction(txid, provider.connection);

    const hubReleaseData = await fetchHubRelease(hubPubkey.toBase58(), hubRelease.toBase58());
    return hubReleaseData;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @function postInitViaHub
 * @description Creates a Post on a Hub.
 * @param {String} hubPubkey
 * @param {String} slug
 * @param {String} uri
 * @param {String=} referenceRelease
 * @param {String=} fromHub
 * @param {Object} wallet
 * @param {Object} connection
 * @returns
 */

const postInitViaHub = async (client, hubPubkey, slug, uri, referenceRelease = undefined, fromHub) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);

    if (referenceRelease) {
      referenceRelease = new anchor.web3.PublicKey(referenceRelease);
    }

    const slugHash = MD5(slug).toString().slice(0, 32);
    const [post] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
        hubPubkey.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode(slugHash)),
      ],
      program.programId
    );
    const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')), hubPubkey.toBuffer(), post.toBuffer()],
      program.programId
    );
    const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')), hubPubkey.toBuffer(), post.toBuffer()],
      program.programId
    );
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hubPubkey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    let txid;
    const params = [hub.handle, slugHash, uri];

    const request = {
      accounts: {
        author: provider.wallet.publicKey,
        hub: hubPubkey,
        post,
        hubPost,
        hubContent,
        hubCollaborator,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    };
    if (fromHub && fromHub !== hubPubkey.toBase58()) {
      request.remainingAccounts = [
        {
          pubkey: new anchor.web3.PublicKey(fromHub),
          isWritable: false,
          isSigner: false,
        },
      ];
    }

    let referenceReleaseHubRelease;
    if (referenceRelease) {
      request.accounts.referenceRelease = referenceRelease;
      let [_referenceReleaseHubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
          hubPubkey.toBuffer(),
          referenceRelease.toBuffer(),
        ],
        program.programId
      );
      request.accounts.referenceReleaseHubRelease = _referenceReleaseHubRelease;
      referenceReleaseHubRelease = _referenceReleaseHubRelease;

      const [referenceReleaseHubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPubkey.toBuffer(),
          referenceRelease.toBuffer(),
        ],
        program.programId
      );
      request.accounts.referenceReleaseHubContent = referenceReleaseHubContent;
      txid = await program.rpc.postInitViaHubWithReferenceRelease(...params, request);
    } else {
      txid = await program.rpc.postInitViaHub(...params, request);
    }
    await getConfirmTransaction(txid, provider.connection);
    return {
      hubPost,
      referenceReleaseHubRelease,
    };
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hubWithdraw = async (client, hubPubkey) => {
  try {
    const { provider } = client;
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    const { hub } = await fetch(hubPubkey);
    hubPubkey = new anchor.web3.PublicKey(hubPubkey);
    const USDC_MINT = new anchor.web3.PublicKey(NinaClient.ids.mints.usdc);

    const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')), hubPubkey.toBuffer()],
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

    const withdrawAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;

    const txid = await program.rpc.hubWithdraw(new anchor.BN(withdrawAmount), hub.handle, {
      accounts: {
        authority: provider.wallet.publicKey,
        hub: hubPubkey,
        hubSigner,
        withdrawTarget,
        withdrawDestination,
        withdrawMint: USDC_MINT,
        tokenProgram: NinaClient.ids.programs.token,
      },
    });
    await getConfirmTransaction(txid, provider.connection);

    return true;
  } catch (error) {
    console.log(error);
    return false;
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
  hubInitWithCredit,
  hubUpdateConfig,
  hubAddCollaborator,
  hubUpdateCollaboratorPermission,
  hubRemoveCollaborator,
  hubContentToggleVisibility,
  hubAddRelease,
  postInitViaHub,
  hubWithdraw,
};
