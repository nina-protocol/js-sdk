import NinaClient from '../client';

/**
 * @module Search
 * */

/**
 * @function search
 * @description Searches for Artist Accounts, Hubs, Posts and Releases.
 * @param {String} query - The search query.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Hub, Post, and Release accounts.
 * @example const results = await NinaClient.Search.withQuery('nina');
 */

const withQuery = async (query, withAccountData = false) => {
  return await NinaClient.post(
    '/search',
    {
      query,
    },
    withAccountData
  );
};

export default {
  withQuery,
};
