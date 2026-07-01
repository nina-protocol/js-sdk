/**
 * @module Search
 * */

/**
 * @function search
 * @description Searches for Artist Accounts, Hubs, Posts and Releases.
 * @param {String} query - The search query.
 * @param {Boolean} [withAccountData = false] Fetch full on-chain Hub, Post, and Release accounts.
 * @example const results = await NinaClient.Search.withQuery('nina');
 * @returns {Object} an object containing the fetched search results.
 */

export default class Search {
  constructor({ http }) {
    this.http = http
  }

  async withQuery(query, withAccountData = false) {
    return this.http.post('/search', { query }, withAccountData)
  }
}