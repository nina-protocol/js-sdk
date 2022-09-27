import NinaClient from '../client'

/**
 * @module Exchange
 */


/**
 * @function fetchAll
 * @description Fetches all exchanges.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Include full on-chain Exchange accounts.
 * @example const exchanges = await NinaClient.Exchange.fetchAll();
 */
const fetchAll = async (pagination={}, withAccountData=false) => {
  const {limit, offset, sort} = pagination;
  return await NinaClient.get('/exchanges', {
    limit: limit || 20,
    offset: offset || 0,
    sort: sort || 'desc',
  }, withAccountData);
}

/** 
 * @function fetch
 * @description Fetches an exchange.
 * @param {String} publicKey The Public key of an Exchange account.
 * @param {Boolean} [withAccountData = false] Include full on-chain Exchange account.
 * @param {String} [transactionId = undefined] A transaction id from an interaction with an account - 
 *        cancelling and completing Exchanges closes their on-chain accounts - by fetching a transaction
 *        we can have more context around interactions with an Exchange - useful for indexing.
 * @example const exchange = await NinaClient.Exchange.fetch('Fxv2G4cQQAeEXN2WkaSAusbNV7E1ouV9W6XHXf3DEfQ8');
 */
const fetch = async (publicKey, withAccountData=false, transactionId=undefined) => {
  return NinaClient.get(`/exchanges/${publicKey}`, transactionId ? { transactionId } : undefined, withAccountData)
}

export default {
  fetchAll,
  fetch,
}