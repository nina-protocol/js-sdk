import NinaClient from '../client';

/**
 * @module Subscription
 */

/**
 * @function fetchAll
 * @description Fetches all Subscriptionss.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @example const subscriptions = await NinaClient.Subscription.fetchAll();
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/subscriptions',
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
 * @param {String} Transaction - The transaction Id of an already existing Subscription.
 * @example const subscriptions = await NinaClient.Subscription.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV");
 */
const fetch = async (publicKey, withAccountData = false, transactionId = undefined) => {
  return NinaClient.get(`/subscriptions/${publicKey}`, transactionId ? { transactionId } : undefined);
};


export default {
  fetchAll,
  fetch,
};
