import * as anchor from '@project-serum/anchor'
import axios from 'axios'
import MD5 from 'crypto-js/md5'
import {
  NINA_CLIENT_IDS,
  findOrCreateAssociatedTokenAccount,
  getConfirmTransaction,
  uiToNative,
} from '../utils'

/**
 * @module Hub
 */

export default class Hub {
  constructor({ http, program, provider, cluster }) {
    this.http = http
    this.program = program
    this.provider = provider
    this.cluster = cluster
  }

  /**
   * @function fetchAll
   * @description Fetches all Hubs on Nina.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] - Pagination options.
   * @param {Boolean} [withAccountData = false] - Include full on-chain Hub accounts.
   * @example const hubs = await NinaClient.Hub.fetchAll();
   * @returns {Array} an array of all of the Hubs on Nina.
   */

  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination

    return this.http.get(
      '/hubs',
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
   * @description Fetches a Hub along with its Releases, Collaborators, and Posts.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain Hub, HubRelease, HubPost, HubContent, HubCollaborator, Release, and Post accounts.
   * @example const hub = await NinaClient.Hub.fetch('ninas-picks');
   * @returns {Object} The Hub account.
   */

  async fetch(publicKeyOrHandle, withAccountData = false) {
    return this.http.get(`/hubs/${publicKeyOrHandle}`, undefined, withAccountData)
  }

  /**
   * @function fetchCollaborators
   * @description Fetches the Collaborators of a Hub.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubCollaborator accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
   * @returns {Array} an array of all of the Collaborators that belong to a Hub.
   */

  async fetchCollaborators(
    publicKeyOrHandle,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/collaborators`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchCollaborator
   * @description Fetches a Collaborator by Publickey.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubCollaborator accounts.
   * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
   * @returns {Object} a specific Collaborator that belongs to a Hub.
   */

  async fetchHubCollaborator(publicKeyOrHandle, collaboratorPubkey) {
    //TODO:  endpoint needs to be uodated, currently retrurns {success: true}
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/collaborators/${collaboratorPubkey}`,
    )
  }

  /**
   * @function fetchReleases
   * @description Fetches Releases for a Hub.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubRelease, HubContent, and Release accounts.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const releases = await NinaClient.Hub.fetchReleases('ninas-picks');
   * @returns {Array} an array of all of the Releases that belong to a Hub.
   */

  async fetchReleases(
    publicKeyOrHandle,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/releases`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchPosts
   * @description Fetches Posts for a hub.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const posts = await NinaClient.Hub.fetchPosts('ninas-picks');
   * @returns {Array} an array of all of the Posts that belong to a Hub.
   */

  async fetchPosts(
    publicKeyOrHandle,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/posts`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchHubRelease
   * @description Fetches a Release for a Hub.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub.
   * @param {String} hubReleasePublicKey - The public key of the HubRelease.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
   * @example const hubRelease = await NinaClient.Hub.fetchHubRelease('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ);
   * @returns {Object} a specific Release from a Hub.
   */

  async fetchHubRelease(
    publicKeyOrHandle,
    hubReleasePublicKey,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/hubReleases/${hubReleasePublicKey}`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchHubPost
   * @description Fetches a hubPost
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub.
   * @param {String} hubPostPublicKey - The public key of the HubPost.
   * @param {Boolean} [withAccountData = false] - Include full on-chain HubPost, HubContent, and Post accounts.
   * @example const hubPost = await NinaClient.Hub.fetchHubPost('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ');
   * @returns {Object} a specific Hub Post.
   */

  async fetchHubPost(
    publicKeyOrHandle,
    hubPostPublicKey,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/hubPosts/${hubPostPublicKey}`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchSubscriptions
   * @description Fetches the subscriptions for a Hub.
   * @param {String} publicKeyOrHandle - The public key or handle of the Hub account.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
   * @returns {Array} an array of all of the Subscriptions that belong to a Hub.
   */

  async fetchSubscriptions(
    publicKeyOrHandle,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/hubs/${publicKeyOrHandle}/subscriptions`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function hubInit
   * @description Initializes a Hub account with Hub Credit.
   * @param {String} handle - The handle of the Hub.
   * @param {Number} publishFee - The fee to publish a Release or Post on a Hub
   * @param {Number} referralFee - The percentage of the publish fee that goes to the referrer
   * @param {Number} hubSignerBump - The bump seed for the Hub Signer.
   * @example const hub = await NinaClient.Hub.hubInit({})
   * @returns {Object} The created Hub account.
   */

  async hubInit(handle, publishFee, referralFee) {
    try {
      publishFee = new anchor.BN(publishFee * 10000)
      referralFee = new anchor.BN(referralFee * 10000)

      const [hub] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub')),
          Buffer.from(anchor.utils.bytes.utf8.encode(handle)),
        ],
        this.program.programId,
      )

      const [hubSigner, hubSignerBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
            hub.toBuffer(),
          ],
          this.program.programId,
        )

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hub.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId,
      )

      const [, usdcVaultIx] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        hubSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
      )

      const [, wrappedSolVaultIx] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        hubSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.wsol),
      )

      //add IX for create
      const tx = await this.program.methods
        .hubInit({
          publishFee,
          referralFee,
          handle,
          hubSignerBump,
        })
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub,
          hubSigner,
          hubCollaborator,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .preInstructions([usdcVaultIx, wrappedSolVaultIx])
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const createdHub = await fetch(hub.toBase58())

      return {
        createdHub,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubUpdateConfig
   * @description Updates the configuration of a Hub.
   * @param {String} hubPublicKey - The public key of the Hub account.
   * @param {String} uri - The URI of the Hubs updated metadata.
   * @param {Number} publishFee - The fee to publish a Release or Post on a Hub
   * @param {Number} referralFee - The percentage of the publish fee that goes to the referrer
   * @example const hub = await NinaClient.Hub.hubUpdateConfig(hubPublicKey, 'https://nina.com', 0.1, 0.1, wallet, connection);
   * @returns {Object} The updated Hub account.
   */

  async hubUpdateConfig(hubPublicKey, uri, publishFee, referralFee) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)

      const tx = await this.program.methods
        .hubUpdateConfig(
          uri,
          hub.handle,
          new anchor.BN(publishFee * 10000),
          new anchor.BN(referralFee * 10000),
        )
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub: hubPublicKey,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      await axios.get(
        `${this.http.endpoint}/hubs/${hubPublicKey.toBase58()}/tx/${txid}`,
      )
      const updatedHub = await fetch(hubPublicKey)

      return {
        updatedHub,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubAddCollaborator
   * @description Adds a collaborator to a Hub.
   * @param {String} hubPublicKey - The public key of the Hub account.
   * @param {String} collaboratorPubkey - The public key of the collaborator account.
   * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
   * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
   * @param {Integer} allowance - Integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
   * @example await NinaClient.Hub.hubAddCollaborator(ninaClient, hubPublicKey, collaboratorPubkey, true, true, 10);
   * @returns {Object} the added collaborator of a Hub.
   */

  async hubAddCollaborator(
    hubPublicKey,
    collaboratorPubkey,
    canAddContent,
    canAddCollaborator,
    allowance,
  ) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
      collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey)

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          collaboratorPubkey.toBuffer(),
        ],
        this.program.programId,
      )

      const [authorityHubCollaborator] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(
              anchor.utils.bytes.utf8.encode('nina-hub-collaborator'),
            ),
            hubPublicKey.toBuffer(),
            this.provider.wallet.publicKey.toBuffer(),
          ],
          this.program.programId,
        )

      const tx = await this.program.methods
        .hubAddCollaborator(
          canAddContent,
          canAddCollaborator,
          allowance,
          hub.handle,
        )
        .accounts({
          authority: this.provider.wallet.publicKey,
          authorityHubCollaborator,
          hub: hubPublicKey,
          hubCollaborator,
          collaborator: collaboratorPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      await axios.get(
        `${this.http.endpoint}/hubs/${
          hub.handle
        }/collaborators/${hubCollaborator.toBase58()}`,
      )

      // endpoint needs to be updated to return collaborator
      return {
        collaboratorPublicKey: collaboratorPubkey.toBase58(),
        hubPublicKey: hubPublicKey.toBase58(),
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubUpdateCollaboratorPermission
   * @description Updates the permissions of a collaborator on a Hub.
   * @param {String} hubPublicKey - The public key of the Hub account.
   * @param {String} collaboratorPubkey - The public key of the collaborator account.
   * @param {Boolean} canAddContent - Boolean indicating if the collaborator can add content to the Hub.
   * @param {Boolean} canAddCollaborator - Boolean indicating if the collaborator can add collaborators to the Hub.
   * @param {Integer} allowance - Integer indicating the amount of Hub actions the collaborator can execute (-1 for unlimited).
   * @example const hub = await NinaClient.Hub.hubUpdateCollaboratorPermission(ninaClient, hubPublicKey, collaboratorPubkey, true, true, 10);
   * @returns {Object} the updated account of a collaborator of a Hub.
   */

  async hubUpdateCollaboratorPermission(
    hubPublicKey,
    collaboratorPubkey,
    canAddContent,
    canAddCollaborator,
    allowance,
  ) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
      collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey)

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          collaboratorPubkey.toBuffer(),
        ],
        this.program.programId,
      )

      const [authorityHubCollaborator] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(
              anchor.utils.bytes.utf8.encode('nina-hub-collaborator'),
            ),
            hubPublicKey.toBuffer(),
            this.provider.wallet.publicKey.toBuffer(),
          ],
          this.program.programId,
        )

      const tx = await this.program.methods
        .hubUpdateCollaboratorPermissions(
          canAddContent,
          canAddCollaborator,
          allowance,
          hub.handle,
        )
        .accounts({
          authority: this.provider.wallet.publicKey,
          authorityHubCollaborator,
          hub: hubPublicKey,
          hubCollaborator,
          collaborator: collaboratorPubkey,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await axios.get(
        `${this.http.endpoint}/hubs/${
          hub.handle
        }/collaborators/${hubCollaborator.toBase58()}`,
      )

      await getConfirmTransaction(txid, this.provider.connection)

      // endpoint needs to be updated to return collaborator
      return {
        collaboratorPublicKey: collaboratorPubkey.toBase58(),
        hubPublicKey: hubPublicKey.toBase58(),
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubRemoveCollaborator
   * @description Removes a collaborator from a Hub.
   * @param {String} hubPublicKey - The public key of the Hub removing the collaborator.
   * @param {String} collaboratorPubkey - The public key of the collaborator account.
   * @example await NinaClient.Hub.hubRemoveCollaborator(ninaClient,"DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW","8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX");
   * @returns {Object} the account of the removed collaborator from the Hub.
   */

  async hubRemoveCollaborator(hubPublicKey, collaboratorPubkey) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)

      collaboratorPubkey = new anchor.web3.PublicKey(collaboratorPubkey)

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          collaboratorPubkey.toBuffer(),
        ],
        this.program.programId,
      )

      const tx = await this.program.methods
        .hubRemoveCollaborator(hub.handle)
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          hubCollaborator,
          collaborator: collaboratorPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      await axios.get(
        `${this.http.endpoint}/hubs/${
          hub.handle
        }/collaborators/${hubCollaborator.toBase58()}`,
      )

      // endpoint needs to be updated to return collaborator
      return {
        collaboratorPublicKey: collaboratorPubkey.toBase58(),
        hubPublicKey: hubPublicKey.toBase58(),
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubContentToggleVisibility
   * @description Toggles the visibility of a piece of content on a Hub.
   * @param {String} hubPublicKey - The public key of the content's Hub.
   * @param {String} contentAccountPublicKey - The public key of the content account, which is either a Release or a Post.
   * @param {String} type - The content type. Should be either 'Release' or 'Post'.
   * @example const hub = await NinaClient.Hub.hubContentToggleVisibility(ninaClient, "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW", "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", 'Release');
   * @returns {Object} The toggled Post or Release.
   */

  async hubContentToggleVisibility(
    hubPublicKey,
    contentAccountPublicKey,
    type,
  ) {
    try {
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
      const hub = this.program.account.hub.fetch(hubPublicKey)
      contentAccountPublicKey = new anchor.web3.PublicKey(
        contentAccountPublicKey,
      )

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPublicKey.toBuffer(),
          contentAccountPublicKey.toBuffer(),
        ],
        this.program.programId,
      )

      const [hubChildPublicKey] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(
              anchor.utils.bytes.utf8.encode(`nina-hub-${type.toLowerCase()}`),
            ),
            hubPublicKey.toBuffer(),
            contentAccountPublicKey.toBuffer(),
          ],
          this.program.programId,
        )

      const tx = await this.program.methods
        .hubContentToggleVisibility(hub.handle)
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          hubContent,
          contentAccount: contentAccountPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await this.provider.connection.getParsedTransaction(txid, 'finalized')

      let toggledResult

      if (type === 'Release') {
        toggledResult = await this.fetchHubRelease(
          hubPublicKey.toBase58(),
          hubChildPublicKey.toBase58(),
        )
      } else if (type === 'Post') {
        toggledResult = await this.fetchHubPost(
          hubPublicKey.toBase58(),
          hubChildPublicKey.toBase58(),
        )
      }

      return {
        hubRelease: toggledResult,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubAddRelease
   * @description Reposts a Release to a Hub. When you repost a release, it will surface to your Hub alongside Releases you have published.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @param {String} releasePublicKey - The public key of the Release.
   * @param {String} fromHub - The public key of the referenced Hub.
   * @example await NinaClient.Hubs.hubAddRelease(ninaClient, "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", "9XxDDBePiuR1y1M1gkxnbv7AAu6WqaHKMsxUwGirMZwP", "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW");
   * @returns {Object} the Hub Release data.
   */

  async hubAddRelease(hubPublicKey, releasePublicKey, fromHub) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey)

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

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId,
      )

      let remainingAccounts

      if (fromHub) {
        remainingAccounts = [
          {
            pubkey: new anchor.web3.PublicKey(fromHub),
            isWritable: false,
            isSigner: false,
          },
        ]
      }

      const tx = await this.program.methods
        .hubAddRelease(hub.handle)
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          hubRelease,
          hubContent,
          hubCollaborator,
          release: releasePublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts(remainingAccounts)
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)

      const hubReleaseData = await this.fetchHubRelease(
        hubPublicKey.toBase58(),
        hubRelease.toBase58(),
      )

      return {
        hubRelease: hubReleaseData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function hubWithdraw
   * @description Withdraws Hub fees in the Hub dashboard.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @example const txid = await NinaClient.Hub.hubWithdraw(ninaClient, hubPublicKey);
   * @returns { Object } the Hub account that made the withdrawal.
   */

  async hubWithdraw(hubPublicKey) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)

      const USDC_MINT = new anchor.web3.PublicKey(
        NINA_CLIENT_IDS[this.cluster].mints.usdc,
      )

      const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
          hubPublicKey.toBuffer(),
        ],
        this.program.programId,
      )

      const [withdrawTarget] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        hubSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        USDC_MINT,
      )

      const [withdrawDestination] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        USDC_MINT,
      )

      const tokenAccounts =
        await this.provider.connection.getParsedTokenAccountsByOwner(
          hubSigner,
          {
            mint: USDC_MINT,
          },
        )

      const withdrawAmount =
        tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount

      const tx = await this.program.methods
        .hubWithdraw(
          new anchor.BN(uiToNative(withdrawAmount, USDC_MINT)),
          hub.handle,
        )
        .accounts({
          authority: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          hubSigner,
          withdrawTarget,
          withdrawDestination,
          withdrawMint: USDC_MINT,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const hubData = await fetch(hubPublicKey.toBase58())

      return {
        hub: hubData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function postInitViaHub
   * @description Creates a Post on a Hub.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @param {String} slug - The slug of the Post.
   * @param {String} uri - The URI of the Post.
   * @param {String} fromHub - The public key of the referenced Hub.
   * @param {String} referenceRelease - The public key of the Release referenced in the post.
   * @example const post = await NinaClient.Hub.postInitViaHub(ninaClient, hubPublicKey, slug, uri);
   * @returns {Object} The created Post.
   */

  async postInitViaHub(
    hubPublicKey,
    slug,
    uri,
    fromHub,
    referenceRelease = undefined,
  ) {
    try {
      const { hub } = await fetch(hubPublicKey)
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)

      if (referenceRelease) {
        referenceRelease = new anchor.web3.PublicKey(referenceRelease)
      }

      const slugHash = MD5(slug).toString().slice(0, 32)

      const [post] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
          hubPublicKey.toBuffer(),
          Buffer.from(anchor.utils.bytes.utf8.encode(slugHash)),
        ],
        this.program.programId,
      )

      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId,
      )

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId,
      )

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId,
      )

      let tx
      const params = [hub.handle, slugHash, uri]

      const request = {
        accounts: {
          author: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          post,
          hubPost,
          hubContent,
          hubCollaborator,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }

      if (fromHub) {
        request.remainingAccounts = [
          {
            pubkey: new anchor.web3.PublicKey(fromHub),
            isWritable: false,
            isSigner: false,
          },
        ]
      }

      if (referenceRelease) {
        request.accounts.referenceRelease = referenceRelease

        const [_referenceReleaseHubRelease] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
              hubPublicKey.toBuffer(),
              referenceRelease.toBuffer(),
            ],
            this.program.programId,
          )

        request.accounts.referenceReleaseHubRelease =
          _referenceReleaseHubRelease

        const [referenceReleaseHubContent] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
              hubPublicKey.toBuffer(),
              referenceRelease.toBuffer(),
            ],
            this.program.programId,
          )

        request.accounts.referenceReleaseHubContent = referenceReleaseHubContent
        tx = await this.program.methods
          .postInitViaHubWithReferenceRelease(...params)
          .accounts(request.accounts)
          .transaction()
      } else {
        tx = await this.program.methods
          .postInitViaHub(...params)
          .accounts(request.accounts)
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

      await getConfirmTransaction(txid, this.provider.connection)

      const hubPostData = await this.fetchHubPost(
        hubPublicKey.toBase58(),
        hubPost.toBase58(),
      )

      return {
        post: hubPostData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }

  /**
   * @function postUpdateViaHub
   * @description Creates a Post on a Hub.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @param {String} slug - The slug of the Post.
   * @param {String} uri - The URI of the Post.
   * @param {String=} referenceRelease - The public key of the Release referenced in the Post.
   * @param {String=} fromHub - The public key of the referenced Hub.
   * @example const post = await NinaClient.Hub.postInitViaHub(ninaClient, hubPublicKey, slug, uri);
   * @returns {Object} The updated Post.
   */

  async postUpdateViaHub(hubPublicKey, slug, uri) {
    try {
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey)
      const hub = await this.program.account.Hub.fetch(hubPublicKey)

      const [post] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
          hubPublicKey.toBuffer(),
          Buffer.from(anchor.utils.bytes.utf8.encode(slug)),
        ],
        this.program.programId,
      )

      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId,
      )

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId,
      )

      const tx = await this.program.methods
        .postUpdateViaHubPost(hub.handle, slug, uri)
        .accounts({
          author: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          post,
          hubPost,
          hubCollaborator,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)

      const hubPostData = await this.fetchHubPost(
        hubPublicKey.toBase58(),
        hubPost.toBase58(),
      )

      return {
        post: hubPostData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }
}
