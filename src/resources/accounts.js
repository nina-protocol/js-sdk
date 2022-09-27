import NinaClient from '../client';

/**
 * @module Account
 * */

/**
 * @function fetchAll
 * @description Fetches all accounts.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @example const accounts = await NinaClient.Account.fetchAll();
 */
const fetchAll = async (pagination = {}) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get('/accounts', {
    limit: limit || 20,
    offset: offset || 0,
    sort: sort || 'desc',
  });
};

/**
 * @function fetch
 * @description Fetches Releases Published, Releases Collected, Hubs collaborated on, Posts published, 
 *              Exchanges made (open, completed, cancelled), and Releases with Revenue Share for an Account.
 * @param {String} publicKeyOrHandle
 * @param {Boolean} [withAccountData = false] Include full on-chain accounts (Release, Hub, Post, Exchange).
 * @example const account = await NinaClient.Account.fetch("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 */
const fetch = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}`, undefined, withAccountData);
};

/**
 * @function fetchHubs
 * @description Fetches the Hubs that an Account is a collaborator on.
 * @param {String} publicKey 
 * @param {Boolean} withAccountData Include full on-chain Hub accounts.
 * @example const hubs = await NinaClient.Account.fetchHubs("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ";
 */
const fetchHubs = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}/hubs`, undefined, withAccountData);
};

/**
 * @function fetchCollected
 * @description Fetches the Releases collected by an Account.
 * @param {String} publicKey
 * @param {Boolean} [withAccountData = false] Include full on-chain Release accounts.
 * @example const collection = await NinaClient.Account.fetchCollection("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 */
const fetchCollected = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}/collected`, undefined, withAccountData);
};

/**
 * @function fetchPublished
 * @description Fetches the Releases that an Account has published.
 * @param {String} publicKey
 * @param {Boolean} [withAccountData = false] Include full on-chain Release accounts.
 * @example const published = await NinaClient.Account.fetchPublished("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 * */
const fetchPublished = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}/published`, undefined, withAccountData);
};

/**
 * @function fetchPosts
 * @description Fetches the Posts published by an Account.
 * @param {String} publicKey
 * @param {Boolean} [withAccountData = false] Include full on-chain Post accounts.
 * @example const posts = await NinaClient.Account.fetchPosts("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 * */
const fetchPosts = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}/posts`, undefined, withAccountData);
};

/**
 * @function fetchExchanges
 * @description Fetches the open, cancelled and completed Exchanges for an Account.
 * @param {String} publicKey
 * @param {Boolean} [withAccountData = false] Include full on-chain Exchange accounts.
 * @example const exchanges = await NinaClient.Account.fetchExchanges("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 * */
const fetchExchanges = async (publicKey, withAccountData = false) => {
  return await NinaClient.get(`/accounts/${publicKey}/exchanges`, undefined, withAccountData);
};

/**
 * @function fetchRevenueShares
 * @description Fetches the Releases that an Account has Revenue Share on.
 * @param {String} publicKey
 * @param {Boolean} [withAccountData = false] Include full on-chain Release accounts.
 * @example const revenueShares = await NinaClient.Account.fetchRevenueShares("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
 * */
const fetchRevenueShares = async (publicKey, withAccountData=false) => {
  return await NinaClient.get(`/accounts/${publicKey}/revenueShares`, undefined, withAccountData);
}

export default {
  fetchAll,
  fetch,
  fetchHubs,
  fetchCollected,
  fetchPublished,
  fetchPosts,
  fetchExchanges,
  fetchRevenueShares,
}