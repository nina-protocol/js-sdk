import axios from 'axios';
import * as anchor from '@project-serum/anchor';
import _ from 'lodash';
import Nina from '.';

const MAX_U64 = '18446744073709551615';

export const NINA_CLIENT_IDS = {
  mainnet: {
    programs: {
      nina: 'ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4',
      metaplex: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      token: anchor.utils.token.TOKEN_PROGRAM_ID.toString(),
    },
    accounts: {
      vault: '53ueyguZx5bHjgHQdU1EcoLkcupAt97wVbcYeAi6iAYy',
      vaultUsdc: 'HDhJyie5Gpck7opvAbYi5H22WWofAR3ygKFghdzDkmLf',
      vaultWrappedSol: '5NnBrUiqHsx1QnGVSo73AprxgVtRjcfmGrgwJ6q1ADzs',
    },
    mints: {
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      wsol: 'So11111111111111111111111111111111111111112',
      publishingCredit: 'NpCbciSYfzrSk9aQ2gkr17TX2fjkm6XGRYhkZ811QDE',
      hubCredit: 'NpCbciSYfzrSk9aQ2gkr17TX2fjkm6XGRYhkZ811QDE',
    },
  },
  devnet: {
    programs: {
      nina: '77BKtqWTbTRxj5eZPuFbeXjx3qz4TTHoXRnpCejYWiQH',
      metaplex: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      token: anchor.utils.token.TOKEN_PROGRAM_ID.toString(),
    },
    accounts: {
      vault: 'AzhSWZCtvfRkzGzzAhPxzrvBcMBcYGKp2rwCh17hARhi',
      vaultUsdc: '2hyWtzYhwW4CSWs7TrrdhQ9DWRaKUVhSxsyVTzcyHRq6',
      vaultWrappedSol: 'H35oumnDdCu5VGXvp24puqYvUQ3Go1JXCGum7L2J3CSP',
    },
    mints: {
      usdc: 'J8Kvy9Kjot83DEgnnbK55BYbAK9pZuyYt4NBGkEJ9W1K',
      wsol: 'So11111111111111111111111111111111111111112',
      publishingCredit: 'NpCbciSYfzrSk9aQ2gkr17TX2fjkm6XGRYhkZ811QDE',
      hubCredit: 'NpCbciSYfzrSk9aQ2gkr17TX2fjkm6XGRYhkZ811QDE',
    },
  },
};
/** Class Representing the Nina Client */
class NinaClient {
  constructor() {
    this.provider = null;
    this.program = null;
    this.endpoint = null;
    this.cluster = null;
    this.programId = null;
    this.apiKey = null;
    this.ids = null;
  }

  /**
   * Initialize the Nina Client Class Object
   * @function init
   * @param {String} endpoint - API endpoint URL (https://api.ninaprotocol.com/v1/)
   * @param {String} cluster - Solana RPC URL (https://api.mainnet-beta.solana.com)
   * @param {String} programId - Nina Program Id (ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4)
   * @example Nina.client.init(endpoint, cluster, programId)
   */
  async init(endpoint, cluster, programId, apiKey = undefined) {
    console.log('INIT');

    this.apiKey = apiKey;
    this.endpoint = endpoint || 'https://api.ninaprotocol.com/v1/'; //NOTE: trailing slash should be removed
    this.cluster = cluster || 'https://api.mainnet-beta.solana.com';
    this.programId = programId || 'ninaN2tm9vUkxoanvGcNApEeWiidLMM2TdBX8HoJuL4';
    const connection = new anchor.web3.Connection(this.cluster);
    this.provider = new anchor.AnchorProvider(
      connection,
      {},
      {
        commitment: 'confirmed',
        preflightCommitment: 'processed',
      }
    );
    this.program = await anchor.Program.at(this.programId, this.provider);
    this.ids = NINA_CLIENT_IDS[process.env.REACT_APP_CLUSTER];
  }

  async get(url, query = undefined, withAccountData = false) {
    if (this.apiKey) {
      if (query) {
        query.api_key = this.apiKey;
      } else {
        query = { api_key: this.apiKey };
      }
    }
    const queryString = query ? `?${new URLSearchParams(query).toString()}` : '';
    let response = await axios.get(`${this.endpoint}${url}${queryString}`);
    if (withAccountData) {
      response = this.getAccountData(url, response);
    } else {
      response = response.data;
    }
    return response;
  }

  async post(url, data, withAccountData = false) {
    const response = await axios.post(`${this.endpoint}${url}`, data);
    if (withAccountData) {
      response = this.getAccountData(url, response);
    } else {
      response = response.data;
    }
    return response;
  }

  async fetchAccountData(publicKey, accountType) {
    const account = await this.program.account[accountType].fetch(new anchor.web3.PublicKey(publicKey), 'confirmed');
    return account;
  }

  async fetchAccountDataMultiple(publicKeys, accountType) {
    const accounts = await this.program.account[accountType].fetchMultiple(
      publicKeys.map((publicKey) => new anchor.web3.PublicKey(publicKey)),
      'confirmed'
    );
    return accounts;
  }

  async getAccountData(url, response) {
    if (/^\/hubs\/((?!(\/)).)*$/.test(url)) {
      const hubPublicKey = response.data.hub.publicKey;
      const hub = await this.fetchAccountData(hubPublicKey, 'hub');
      response.data.hub.accountData = this.parseHubAccountData(hub);
      await this.processMultipleHubContentAccountDataWithHub(response.data.releases, hubPublicKey, 'release');
      await this.processMultipleHubContentAccountDataWithHub(response.data.posts, hubPublicKey, 'post');
      await this.processMultipleHubCollaboratorAccountDataWithHub(response.data.collaborators, hubPublicKey);
    } else if (/releases\/(.*?)\/hubs/.test(url)) {
      const releasePublicKey = url.split('/')[2];
      await this.processMulitpleHubAccountData(response.data.hubs);
      for await (let hub of response.data.hubs) {
        const accountData = await this.processHubReleaseAccountDataWithHub(releasePublicKey, hub.publicKey);
        hub.accountData = {
          ...hub.accountData,
          ...accountData,
        };
      }
    } else if (url === '/hubs') {
      await this.processMulitpleHubAccountData(response.data.hubs);
    } else if (/releases\/(.*?)\/revenueShareRecipients/.test(url)) {
      const releasePublicKey = url.split('/')[2];
      const release = await this.fetchAccountData(releasePublicKey, 'release');
      release = this.parseReleaseAccountData(release);
      response.data.revenueShareRecipients.forEach((recipient) => {
        recipient.accountData = {
          revenueShareRecipient: release.revenueShareRecipients.filter(
            (r) => r.recipientAuthority === recipient.publicKey
          )[0],
        };
      });
    } else if (/accounts\/(.*?)\/hubs/.test(url)) {
      const publicKey = url.split('/')[2];
      await this.processMulitpleHubAccountData(response.data.hubs);
      for await (let hub of response.data.hubs) {
        hub.accountData.collaborator = await this.processAndParseSingleHubCollaboratorAccountDataWithHub(
          publicKey,
          hub.publicKey
        );
      }
    } else if (
      url === '/releases' ||
      /accounts\/(.*?)\/published/.test(url) ||
      /accounts\/(.*?)\/collected/.test(url) ||
      /accounts\/(.*?)\/revenueShares/.test(url)
    ) {
      await this.processMultipleReleaseAccountData(
        response.data.releases || response.data.collected || response.data.published || response.data.revenueShares
      );
    } else if (/accounts\/(.*?)\/exchanges/.test(url)) {
      await this.processMultipleExchangeAccountData(response.data.exchanges);
    } else if (/^\/releases\/((?!(\/)).)*$/.test(url)) {
      let release = await this.fetchAccountData(response.data.release.publicKey, 'release');
      response.data.release.accountData = { release: this.parseReleaseAccountData(release) };
    } else if (/\/releases\/(.*?)\/exchanges/.test(url)) {
      await this.processMultipleExchangeAccountData(response.data.exchanges);
    } else if (/hubs\/(.*?)\/releases/.test(url)) {
      const hubPublicKey = response.data.publicKey;
      await this.processMultipleHubContentAccountDataWithHub(response.data.releases, hubPublicKey, 'release');
    } else if (url === '/posts' || /accounts\/(.*?)\/posts/.test(url)) {
    } else if (/hubs\/(.*?)\/posts/.test(url)) {
      const hubPublicKey = response.data.publicKey;
      await this.processMultipleHubContentAccountDataWithHub(response.data.posts, hubPublicKey, 'post');
    } else if (/^\/posts\/((?!(\/)).)*$/.test(url)) {
      let post = await this.fetchAccountData(response.data.post.publicKey, 'post');
      post = this.parsePostAccountData(post);
      let publishedThroughHub = await this.fetchAccountData(response.data.publishedThroughHub.publicKey, 'hub');
      publishedThroughHub = this.parseHubAccountData(publishedThroughHub);
      response.data.post.accountData = post;
      response.data.publishedThroughHub.accountData = publishedThroughHub;
    } else if (/^\/accounts\/((?!(\/)).)*$/.test(url)) {
      await this.processMulitpleHubAccountData(response.data.hubs);
      await this.processMultipleReleaseAccountData(response.data.published);
      await this.processMultipleReleaseAccountData(response.data.collected);
      await this.processMultiplePostAccountData(response.data.posts);
      await this.processMultipleExchangeAccountData(response.data.exchanges);
    } else if (url === '/search') {
      await this.processMulitpleHubAccountData(response.data.hubs);
      await this.processMultipleReleaseAccountData(response.data.releases);
    } else if (url === '/exchanges') {
      await this.processMultipleExchangeAccountData(response.data.exchanges);
    } else if (/^\/exchanges\/((?!(\/)).)*$/.test(url)) {
      const exchangePublicKey = response.data.exchange.publicKey;
      const exchange = await this.fetchAccountData(exchangePublicKey, 'exchange');
      response.data.exchange.accountData = this.parseExchangeAccountData(exchange);
    }
    return response.data;
  }

  async processMultiplePostAccountData(data) {
    const publicKeys = data.map((post) => post.publicKey);
    const posts = await this.fetchAccountDataMultiple(publicKeys, 'post');
    data.forEach((post, index) => {
      const parsedPost = this.parsePostAccountData(posts[index]);
      post.accountData = { post: parsedPost };
    });
  }

  async processMultipleExchangeAccountData(data) {
    const publicKeys = [];
    data.forEach((exchange) => {
      if (!exchange.cancelled && !exchange.completedBy) {
        publicKeys.push(exchange.publicKey);
      }
    });
    const exchanges = await this.fetchAccountDataMultiple(publicKeys, 'exchange');
    exchanges.forEach((exchange, i) => {
      if (exchange) {
        const publicKey = publicKeys[i];
        const parsedExchange = this.parseExchangeAccountData(exchange);
        data.filter((exchange) => exchange.publicKey === publicKey)[0].accountData = { exchange: parsedExchange };
      }
    });
  }

  async processMultipleReleaseAccountData(data) {
    const publicKeys = data.map((release) => release.publicKey);
    const releases = await this.fetchAccountDataMultiple(publicKeys, 'release');
    releases.forEach((release, i) => {
      const publicKey = publicKeys[i];
      const parsedRelease = this.parseReleaseAccountData(release);
      data.filter((release) => release.publicKey === publicKey)[0].accountData = { release: parsedRelease };
    });
  }

  async processMultipleReleaseAccountDataWithHub(data, hubPublicKey) {
    const publicKeys = data.map((release) => release.publicKey);
    const releases = await this.fetchAccountDataMultiple(publicKeys, 'release');
    let i = 0;
    for await (let release of releases) {
      const publicKey = publicKeys[i];
      const parsedRelease = this.parseReleaseAccountData(release);
      const [parsedHubReleaseAccount, parsedHubContentAccount] = await this.fetchHubContentAndChildAccountData(
        publicKey,
        hubPublicKey,
        'release'
      );
      data.filter((release) => release.publicKey === publicKey)[0].accountData = {
        release: parsedRelease,
        hubRelease: parsedHubReleaseAccount,
        hubContent: parsedHubContentAccount,
      };
      i++;
    }
  }

  async processMultipleHubCollaboratorAccountDataWithHub(data, hubPublicKey) {
    const publicKeys = data.map((collaborator) => collaborator.publicKey);
    const hubCollaboratorPublicKeys = [];
    for await (let publicKey of publicKeys) {
      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
        ],
        new anchor.web3.PublicKey(this.programId)
      );
      hubCollaboratorPublicKeys.push(hubCollaborator.toBase58());
    }

    const collaborators = await this.fetchAccountDataMultiple(hubCollaboratorPublicKeys, 'hubCollaborator');
    let i = 0;
    for await (let collaborator of collaborators) {
      const publicKey = publicKeys[i];
      const hubCollaboratorPublicKey = hubCollaboratorPublicKeys[i];
      const parsedCollaborator = this.parseHubCollaboratorAccountData(collaborator, hubCollaboratorPublicKey);
      data.filter((collaborator) => collaborator.publicKey === publicKey)[0].accountData = {
        collaborator: parsedCollaborator,
      };
      i++;
    }
  }

  async processAndParseSingleHubCollaboratorAccountDataWithHub(publicKey, hubPublicKey) {
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(publicKey).toBuffer(),
      ],
      new anchor.web3.PublicKey(this.programId)
    );
    const hubCollaboratorPublicKey = hubCollaborator.toBase58();
    const collaborator = await this.fetchAccountData(hubCollaboratorPublicKey, 'hubCollaborator');
    const parsedCollaborator = this.parseHubCollaboratorAccountData(collaborator, hubCollaboratorPublicKey);
    return parsedCollaborator;
  }

  async processHubReleaseAccountDataWithHub(releasePublicKey, hubPublicKey) {
    const release = await this.fetchAccountData(releasePublicKey, 'release');
    const [hubReleasePublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-release`)),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
      ],
      this.program.programId
    );
    const [hubContentPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-content`)),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
      ],
      this.program.programId
    );
    const hubRelease = await this.fetchAccountData(hubReleasePublicKey, 'hubRelease');
    const hubContent = await this.fetchAccountData(hubContentPublicKey, 'hubContent');

    const parsedHubRelease = this.parseHubReleaseAccountData(hubRelease, hubReleasePublicKey);
    const parsedHubContent = this.parseHubContentAccountData(hubContent, hubContentPublicKey);
    const parsedRelease = this.parseReleaseAccountData(release);

    return {
      release: parsedRelease,
      hubRelease: parsedHubRelease,
      hubContent: parsedHubContent,
    };
  }

  async processMultipleHubContentAccountDataWithHub(data, hubPublicKey, accountType) {
    const publicKeys = data.map((account) => account.publicKey);
    const accounts = await this.fetchAccountDataMultiple(publicKeys, accountType);
    const hubChildrenPublicKeys = [];
    const hubContentPublicKeys = [];
    for await (let publicKey of publicKeys) {
      const [hubChildPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-${accountType}`)),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
        ],
        this.program.programId
      );
      hubChildrenPublicKeys.push(hubChildPublicKey);
      const [hubContentPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-content`)),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
        ],
        this.program.programId
      );
      hubContentPublicKeys.push(hubContentPublicKey);
    }
    const hubChildString = 'hub' + _.capitalize(accountType);
    const hubChildren = await this.fetchAccountDataMultiple(hubChildrenPublicKeys, hubChildString);
    const hubContent = await this.fetchAccountDataMultiple(hubContentPublicKeys, 'hubContent');

    let i = 0;
    for await (let account of accounts) {
      const publicKey = publicKeys[i];
      let parsedAccount;
      let parsedChild;
      if (accountType === 'release') {
        parsedAccount = this.parseReleaseAccountData(account);
        parsedChild = this.parseHubReleaseAccountData(hubChildren[i], hubChildrenPublicKeys[i]);
      } else if (accountType === 'post') {
        parsedAccount = this.parsePostAccountData(account);
        parsedChild = this.parseHubPostAccountData(hubChildren[i], hubChildrenPublicKeys[i]);
      }
      const parsedHubContent = this.parseHubContentAccountData(hubContent[i], publicKey);
      data.filter((account) => account.publicKey === publicKey)[0].accountData = {
        [accountType]: parsedAccount,
        [hubChildString]: parsedChild,
        hubContent: parsedHubContent,
      };
      i++;
    }
  }

  async fetchHubContentAndChildAccountData(publicKey, hubPublicKey, accountType) {
    const [childPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-${accountType}`)),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(publicKey).toBuffer(),
      ],
      this.program.programId
    );
    const childAccount = await this.fetchAccountData(childPublicKey, 'hub' + _.capitalize(accountType));
    let parsedChild;
    if (accountType === 'post') {
      parsedChild = this.parseHubPostAccountData(childAccount, publicKey);
    } else {
      parsedChild = this.parseHubReleaseAccountData(childAccount, publicKey);
    }
    const [hubContentPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(publicKey).toBuffer(),
      ],
      this.program.programId
    );
    const hubContent = await this.fetchAccountData(hubContentPublicKey, 'hubContent');
    const parsedHubContentAccount = this.parseHubContentAccountData(hubContent, hubContentPublicKey);
    return [parsedChild, parsedHubContentAccount];
  }

  async processMulitpleHubAccountData(data) {
    const publicKeys = data.map((account) => account.publicKey);
    const hubs = await this.fetchAccountDataMultiple(publicKeys, 'hub');
    hubs.forEach((hub, i) => {
      const publicKey = publicKeys[i];
      const parsedHub = this.parseHubAccountData(hub);
      parsedHub.publicKey = publicKey;
      data.filter((hub) => hub.publicKey === publicKey)[0].accountData = { hub: parsedHub };
    });
  }

  parseHubPostAccountData(hubPost, publicKey) {
    hubPost.publicKey = publicKey.toBase58();
    hubPost.hub = hubPost.hub.toBase58();
    hubPost.post = hubPost.post.toBase58();
    hubPost.referenceContent = hubPost.referenceContent?.toBase58() || undefined;
    hubPost.referenceContentType = Object.keys(hubPost.referenceContentType)[0];
    hubPost.versionUri = this.decode(hubPost.versionUri);
    return hubPost;
  }

  parseHubReleaseAccountData(hubRelease, publicKey) {
    hubRelease.publicKey = publicKey.toBase58();
    hubRelease.hub = hubRelease.hub.toBase58();
    hubRelease.release = hubRelease.release.toBase58();
    hubRelease.sales = hubRelease.sales.toNumber();
    return hubRelease;
  }

  parseHubContentAccountData(hubContent, publicKey) {
    hubContent.publicKey = typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
    hubContent.hub = hubContent.hub.toBase58();
    hubContent.addedBy = hubContent.addedBy.toBase58();
    hubContent.child = hubContent.child.toBase58();
    hubContent.contentType = Object.keys(hubContent.contentType)[0];
    hubContent.datetime = hubContent.datetime.toNumber() * 1000;
    hubContent.repostedFromHub = hubContent.repostedFromHub.toBase58();
    return hubContent;
  }

  parseHubCollaboratorAccountData(hubCollaborator, publicKey) {
    hubCollaborator.publicKey = publicKey;
    hubCollaborator.hub = hubCollaborator.hub.toBase58();
    hubCollaborator.collaborator = hubCollaborator.collaborator.toBase58();
    hubCollaborator.addedBy = hubCollaborator.addedBy.toBase58();
    hubCollaborator.datetime = hubCollaborator.datetime.toNumber() * 1000;
    return hubCollaborator;
  }

  parsePostAccountData(post) {
    post.author = post.author.toBase58();
    post.createdAt = post.createdAt * 1000;
    post.slug = this.decode(post.slug);
    post.updatedAt = post.updatedAt * 1000;
    post.uri = this.decode(post.uri);
    return post;
  }

  parseExchangeAccountData(exchange) {
    exchange.initializer = exchange.initializer.toBase58();
    exchange.release = exchange.release.toBase58();
    exchange.releaseMint = exchange.releaseMint.toBase58();
    exchange.initializerExpectedTokenAccount = exchange.initializerExpectedTokenAccount.toBase58();
    exchange.initializerSendingTokenAccount = exchange.initializerSendingTokenAccount.toBase58();
    exchange.initializerSendingMint = exchange.initializerSendingMint.toBase58();
    exchange.initializerExpectedMint = exchange.initializerExpectedMint.toBase58();
    exchange.exchangeSigner = exchange.exchangeSigner.toBase58();
    exchange.exchangeEscrowTokenAccount = exchange.exchangeEscrowTokenAccount.toBase58();
    exchange.expectedAmount = exchange.expectedAmount.toNumber();
    exchange.initializerAmount = exchange.initializerAmount.toNumber();
    exchange.isSelling = exchange.isSelling;
    exchange.bump = exchange.bump;
    return exchange;
  }

  parseHubAccountData(hub) {
    hub.authority = hub.authority.toBase58();
    hub.datetime = hub.datetime.toNumber() * 1000;
    hub.handle = this.decode(hub.handle);
    hub.hubSigner = hub.hubSigner.toBase58();
    hub.publishFee = hub.publishFee.toNumber();
    hub.referralFee = hub.referralFee.toNumber();
    hub.totalFeesEarned = hub.totalFeesEarned.toNumber();
    hub.uri = this.decode(hub.uri);
    return hub;
  }

  parseReleaseAccountData(release) {
    release.authority = release.authority.toBase58();
    release.exchangeSaleCounter = release.exchangeSaleCounter.toNumber();
    release.exchangeSaleTotal = release.exchangeSaleTotal.toNumber();
    release.payer = release.payer.toBase58();
    release.paymentMint = release.paymentMint.toBase58();
    release.price = release.price.toNumber();
    release.releaseMint = release.releaseMint.toBase58();
    release.authorityTokenAccount = release.authorityTokenAccount?.toBase58() || null;
    release.releaseSigner = release.releaseSigner.toBase58();
    release.resalePercentage = release.resalePercentage.toNumber();
    release.releaseDatetime = release.releaseDatetime.toNumber() * 1000;
    release.revenueShareRecipients = release.royaltyRecipients.map((recipient) => {
      recipient.collected = recipient.collected.toNumber();
      recipient.owed = recipient.owed.toNumber();
      recipient.percentShare = recipient.percentShare.toNumber();
      recipient.recipientAuthority = recipient.recipientAuthority.toBase58();
      recipient.recipientTokenAccount = recipient.recipientTokenAccount.toBase58();
      return recipient;
    });
    delete release.royaltyRecipients;
    release.royaltyTokenAccount = release.royaltyTokenAccount.toBase58();
    release.saleCounter = release.saleCounter.toNumber();
    release.saleTotal = release.saleTotal.toNumber();
    if (release.totalSupply.toString() === MAX_U64) {
      release.editionType = 'open';
      release.remainingSupply = -1;
      release.totalSupply = -1;
    } else {
      release.editionType = 'limited';
      release.remainingSupply = release.remainingSupply.toNumber();
      release.totalSupply = release.totalSupply.toNumber();
    }
    release.totalCollected = release.totalCollected.toNumber();
    release.head = release.head.toNumber();
    release.tail = release.tail.toNumber();

    return release;
  }

  decode(byteArray) {
    return new TextDecoder().decode(new Uint8Array(byteArray)).replaceAll(/\u0000/g, '');
  }
}
export default new NinaClient();
