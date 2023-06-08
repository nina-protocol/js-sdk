import NinaClient from '../client';

/**
 * @module Post
 */

/**
 * @function fetchAll
 * @description Fetches all Posts.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Post accounts.
 * @example const posts = await NinaClient.Post.fetchAll();
 * @returns {Array} an array of all of the Posts on Nina.
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
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
const fetch = async (publicKey, withAccountData = false, pagination) => {
  return await NinaClient.get(`/posts/${publicKey}`, pagination, withAccountData);
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
      error,
    };
  }
};

export default {
  fetchAll,
  fetch,
  postInitViaHub,
  postUpdateViaHub,
}