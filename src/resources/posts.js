/**
 * @module Post
 */
export default class Post {
  constructor({ http, provider, program }) {
    this.http = http;
    this.provider = provider;
    this.program = program;
  }

  /**
   * @function fetchAll
   * @description Fetches all Posts.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Post accounts.
   * @example const posts = await NinaClient.Post.fetchAll();
   * @returns {Array} an array of all of the Posts on Nina.
   */
  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination;
    return await this.http.get(
      '/posts',
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
   * @description Fetches a Post.
   * @param {String} publicKey - The public key of the Post.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Post account.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const post = await NinaClient.Post.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV")
   * @returns {Object} an object containing the Post's data.
   */
  async fetch(publicKey, withAccountData = false, pagination) {
    return await this.http.get(`/posts/${publicKey}`, pagination, withAccountData);
  };
  
  /**
   * @function postInitViaHub
   * @description Creates a Post on a Hub.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @param {String} slug - The slug of the Post.
   * @param {String} uri - The URI of the Post.
   * @param {String} referenceRelease - The public key of the Release referenced in the post.
   * @param {String} fromHub - The public key of the referenced Hub.
   * @example const post = await NinaClient.Hub.postInitViaHub(ninaClient, hubPublicKey, slug, uri);
   * @returns {Object} The created Post.
   */
  
  async postInitViaHub(hubPublicKey, slug, uri, referenceRelease = undefined, fromHub) {
    try {
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
        this.program.programId
      );
      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')), hubPublicKey.toBuffer(), post.toBuffer()],
        this.program.programId
      );
      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')), hubPublicKey.toBuffer(), post.toBuffer()],
        this.program.programId
      );
      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );
      let tx;
      const params = [hub.handle, slugHash, uri];
  
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
        request.accounts.referenceRelease = referenceRelease;
  
        let [_referenceReleaseHubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-release')),
            hubPublicKey.toBuffer(),
            referenceRelease.toBuffer(),
          ],
          this.program.programId
        );
        request.accounts.referenceReleaseHubRelease = _referenceReleaseHubRelease;
        const [referenceReleaseHubContent] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
            hubPublicKey.toBuffer(),
            referenceRelease.toBuffer(),
          ],
          this.program.programId
        );
        request.accounts.referenceReleaseHubContent = referenceReleaseHubContent;
        tx = await this.program.methods
          .postInitViaHubWithReferenceRelease(...params)
          .accounts(request.accounts)
          .transaction();
      } else {
        tx = await this.program.methods
          .postInitViaHub(...params)
          .accounts(request.accounts)
          .transaction();
      }
      tx.recentBlockhash = (await this.provider.connection.getRecentBlockhash()).blockhash;
      tx.feePayer = this.provider.wallet.publicKey;
      const txid = await this.provider.wallet.sendTransaction(tx, this.provider.connection);
      await getConfirmTransaction(txid, this.provider.connection);
      const hubPostData = await fetchHubPost(hubPublicKey.toBase58(), hubPost.toBase58());
      return {
        post: hubPostData,
      };
    } catch (error) {
      console.warn(error);
      return {
        error,
      };
    }
  };
  
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
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
  
      const [post] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
          hubPublicKey.toBuffer(),
          Buffer.from(anchor.utils.bytes.utf8.encode(slug)),
        ],
        this.program.programId
      );
  
      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')), hubPublicKey.toBuffer(), post.toBuffer()],
        this.program.programId
      );
  
      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          this.provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );
  
      const tx = await this.program.methods
        .postUpdateViaHubPost(hub.handle, slug, uri)
        .accounts({
          author: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          post,
          hubPost,
          hubCollaborator,
        })
        .transaction();
  
      tx.recentBlockhash = (await this.provider.connection.getRecentBlockhash()).blockhash;
      tx.feePayer = this.provider.wallet.publicKey;
      const txid = await this.provider.wallet.sendTransaction(tx, this.provider.connection);
      await getConfirmTransaction(txid, this.provider.connection);
      const hubPostData = await fetchHubPost(hubPublicKey.toBase58(), hubPost.toBase58());
  
      return {
        post: hubPostData,
      };
    } catch (error) {
      console.warn(error);
      return {
        error,
      };
    }
  };
}
