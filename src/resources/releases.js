import NinaClient from '../client';

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

export default {
  fetchAll,
  fetch,
  fetchCollectors,
  fetchHubs,
  fetchExchanges,
  fetchRevenueShareRecipients,
}
