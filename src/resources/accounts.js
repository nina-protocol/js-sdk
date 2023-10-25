/**
 * @module Account
 * */
export default class Account {
  constructor({ http }) {
    this.http = http
  }

  /**
   * @function fetchAll
   * @description Fetches all Accounts on Nina.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] - Pagination options.
   * @example const accounts = await NinaClient.Account.fetchAll();
   * @returns {Array} an array of all of the Accounts on Nina.
   */
  async fetchAll(pagination = {}) {
    const { limit, offset, sort } = pagination

    return this.http.get('/accounts', {
      limit: limit || 20,
      offset: offset || 0,
      sort: sort || 'desc',
      ...pagination,
    })
  }

  /**
   * @function fetch
   * @description Fetches Releases Published, Releases Collected, Hubs collaborated on, Posts published,
   *              Exchanges made (open, completed, cancelled), and Releases with Revenue Share for an Account.
   * @param {String} publicKeyOrHandle - The public key or handle of the Account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain accounts (Release, Hub, Post, Exchange).
   * @example const account = await NinaClient.Account.fetch("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Object} an object containing the Account's data.
   */
  async fetch(publicKey, withAccountData = false) {
    return this.http.get(`/accounts/${publicKey}`, undefined, withAccountData)
  }

  /**
   * @function fetchHubs
   * @description Fetches the Hubs that an Account is a collaborator or authority of.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} withAccountData - Include full on-chain Hub accounts.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const hubs = await NinaClient.Account.fetchHubs("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ";
   * @returns {Array} an array of Hubs that an Account is a collaborator or authority on.
   */
  async fetchHubs(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/hubs`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchCollected
   * @description Fetches the Releases collected by an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] - Include full on-chain Release accounts.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const collection = await NinaClient.Account.fetchCollected("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Releases collected by an Account.
   */
  async fetchCollected(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/collected`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchPublished
   * @description Fetches the Releases that an Account has published.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Release accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const published = await NinaClient.Account.fetchPublished("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Releases published by an Account.
   * */
  async fetchPublished(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/published`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchPosts
   * @description Fetches the Posts published by an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Post accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const posts = await NinaClient.Account.fetchPosts("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Posts published by an Account.
   * */
  async fetchPosts(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/posts`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchExchanges
   * @description Fetches the open, cancelled and completed Exchanges for an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Exchange accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const exchanges = await NinaClient.Account.fetchExchanges("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Exchanges belonging to an Account.
   * */
  async fetchExchanges(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/exchanges`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchRevenueShares
   * @description Fetches the Releases that an Account has Revenue Share on.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Release accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const revenueShares = await NinaClient.Account.fetchRevenueShares("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Releases that an Account is a royalty recipient of.
   * */
  async fetchRevenueShares(
    publicKey,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/accounts/${publicKey}/revenueShares`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchSubscriptions
   * @description Fetches the Subcriptions for an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Subscription accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const subscriptions = await NinaClient.Account.fetchSubscriptions("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Accounts or Hubs that an Account is subscribed to.
   *  */
  async fetchSubscriptions(
    publicKey,
    pagination = {},
    withAccountData = false,
  ) {
    return this.http.get(
      `/accounts/${publicKey}/subscriptions`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchVerifications
   * @description Fetches the Verifications for an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const verifications = await NinaClient.Account.fetchVerifications("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Verifications for an Account.
   * */
  async fetchVerifications(publicKey, pagination = {}) {
    return this.http.get(`/accounts/${publicKey}/verifications`, pagination)
  }

  /**
   * @function fetchFollowers
   * @description Fetches the Accounts that follow an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Account accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const followers = await NinaClient.Account.fetchFollowers("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Accounts that follow an Account.
   */
  async fetchFollowers(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/followers`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchFollowing
   * @description Fetches the Accounts that an Account follows.
   * @param {String} publicKey - The public key of the Account.
   * @param {Boolean} [withAccountData = false] Include full on-chain Account accounts.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const following = await NinaClient.Account.fetchFollowing("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Array} an array of all of the Accounts that an Account follows.
   * */
  async fetchFollowing(publicKey, pagination = {}, withAccountData = false) {
    return this.http.get(
      `/accounts/${publicKey}/following`,
      pagination,
      withAccountData,
    )
  }

  /**
   * @function fetchAllContentNodes
   * @description Fetches the Releases, Posts, Hubs, and Collection for an Account.
   * @param {String} publicKey - The public key of the Account.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const contentNodes = await NinaClient.Account.fetchAllContentNodes("52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ");
   * @returns {Object} an object containing the Releases, Posts, Hubs, and Collection for an Account.
   * 
   * */
  async fetchAllContentNodes(publicKey, pagination = {}) {
    return this.http.get(
      `/accounts/${publicKey}/all`,
      pagination,
    )
  }
}

