import NinaClient from '../client';

/**
 * @module Hub
 */

/**
 * @function fetchAll
 * @description Fetches all hubs.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub accounts.
 * @example const hubs = await NinaClient.Hub.fetchAll();
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/hubs',
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
 * @description Fetches a Hub along with it's Releases, Collaborators, and Posts.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub, HubRelease, HubPost, HubContent, HubCollaborator, Release, and Post accounts.
 * @example const hub = await NinaClient.Hub.fetch('ninas-picks');
 */
const fetch = async (publicKeyOrHandle, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}`, undefined, withAccountData);
}

/**
 * @function fetchCollaborators
 * @description Fetches the Collaborators of a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubCollaborator accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 */
const fetchCollaborators = async (publicKeyOrHandle, pagination=undefined) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators`, pagination);
}

/**
 * @function fetchReleases
 * @description Fetches Releases for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubRelease, HubContent, and Release accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const releases = await NinaClient.Hub.fetchReleases('ninas-picks');
 */
const fetchReleases = async (publicKeyOrHandle, withAccountData=false, pagination=undefined) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/releases`, pagination, withAccountData);
}

/**
 * @function fetchPosts
 * @description Fetches Posts for a hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const posts = await NinaClient.Hub.fetchPosts('ninas-picks');
 */
const fetchPosts = async (publicKeyOrHandle, withAccountData=false, pagination=undefined) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/posts`, pagination, withAccountData);
}

/**
 * @function fetchHubRelease
 * @description Fetches a Release for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubReleasePublicKey The public key of the HubRelease.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubRelease = await NinaClient.Hub.fetchHubRelease('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ);
 */  
const fetchHubRelease = async (publicKeyOrHandle, hubReleasePublicKey, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubReleases/${hubReleasePublicKey}`, undefined, withAccountData);
}

/**
 * @function fetchHubPost
 * @description Fetches a hubPost
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubPostPublicKey The public key of the HubPost.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubPost = await NinaClient.Hub.fetchHubPost('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ');
 */
const fetchHubPost = async (publicKeyOrHandle, hubPostPublicKey, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubPosts/${hubPostPublicKey}`, undefined, withAccountData);
}

/**
 * @function fetchSubscriptions
 * @description Fetches the subscriptions for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
 * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
 */

const fetchSubscriptions = async (publicKeyOrHandle, withAccountData=false, pagination=undefined) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/subscriptions`, pagination, withAccountData);
}

export default {
  fetchAll,
  fetch,
  fetchCollaborators,
  fetchReleases,   
  fetchPosts,
  fetchHubRelease,
  fetchHubPost,
  fetchSubscriptions,
}
