import * as anchor from '@coral-xyz/anchor';
import axios from 'axios'
import _ from 'lodash'
import Formatter from './formatter'

export default class Http {
  constructor({ endpoint, program, programV2, apiKey = undefined, connection, cluster }) {
    this.endpoint = endpoint
    this.program = program
    this.programV2 = programV2
    this.apiKey = apiKey
    this.connection = connection
    this.cluster = cluster
  }

  async get(url, query = undefined, withAccountData = false) {
    if (this.apiKey) {
      if (query) {
        query.api_key = this.apiKey
      } else {
        query = { api_key: this.apiKey }
      }
    }

    const queryString = query ? `?${new URLSearchParams(query).toString()}` : ''
    let response = await axios.get(`${this.endpoint}${url}${queryString}`)

    if (withAccountData) {
      response = this.getAccountData(url, response)
    } else {
      response = response.data
    }

    return response
  }

  async post(url, data, withAccountData = false) {
    let response = await axios.post(`${this.endpoint}${url}`, data)

    if (withAccountData) {
      response = this.getAccountData(url, response)
    } else {
      response = response.data
    }

    return response
  }

  async fetchAccountData(publicKey, accountType, programId = this.program.programId) {
    const program = programId === this.programV2.programId.toBase58() ? this.programV2 : this.program
    accountType = accountType === 'release' && programId === this.programV2.programId.toBase58() ? 'releaseV2' : accountType
    const account = await program.account[accountType].fetch(
      new anchor.web3.PublicKey(publicKey),
      'processed',
    )

    return account
  }

  async fetchAccountDataMultiple(publicKeys, accountType, programIds = []) {
    if (publicKeys.length === 0) {
      return []
    }

    for (const publicKey of publicKeys) {
      if (typeof publicKey === 'object') {
        publicKey = publicKey.toBase58()
      }
      if (programIds.length === 0) {
        programIds.push(this.program.programId.toBase58())
      }
    }
    
    let publicKeysV1 = []
    let publicKeysV2 = []

    for await (const programId of programIds) {
      const i = programIds.indexOf(programId)
      if (programId === this.programV2.programId.toBase58()) {
        publicKeysV2.push(publicKeys[i])
      } else {
        publicKeysV1.push(publicKeys[i])
      }
    }

    const accountsV1 = await this.program.account[accountType].fetchMultiple(
      publicKeysV1.map((publicKey) => new anchor.web3.PublicKey(publicKey)),
      'processed',
    )

    const accountsV2 = await this.programV2.account['releaseV2'].fetchMultiple(
      publicKeysV2.map((publicKey) => new anchor.web3.PublicKey(publicKey)),
      'processed',
    )

    return [...accountsV1, ...accountsV2]
  }

  async fetchHubContentAndChildAccountData(
    publicKey,
    hubPublicKey,
    accountType,
  ) {
    const [childPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-${accountType}`)),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(publicKey).toBuffer(),
      ],
      this.program.programId,
    )

    const childAccount = await this.fetchAccountData(
      childPublicKey,
      `hub${_.capitalize(accountType)}`,
    )

    let parsedChild

    if (accountType === 'post') {
      parsedChild = Formatter.parseHubPostAccountData(childAccount, publicKey)
    } else {
      parsedChild = Formatter.parseHubReleaseAccountData(
        childAccount,
        publicKey,
      )
    }

    const [hubContentPublicKey] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
        ],
        this.program.programId,
      )

    const hubContent = await this.fetchAccountData(
      hubContentPublicKey,
      'hubContent',
    )

    const parsedHubContentAccount = Formatter.parseHubContentAccountData(
      hubContent,
      hubContentPublicKey,
    )

    return [parsedChild, parsedHubContentAccount]
  }

  async getAccountData(url, response) {
    if (/^\/hubs\/((?!(\/)).)*$/.test(url)) {
      const hubPublicKey = response.data.hub.publicKey
      const hub = await this.fetchAccountData(hubPublicKey, 'hub')
      response.data.hub.accountData = Formatter.parseHubAccountData(hub)
      await this.processMultipleHubContentAccountDataWithHub(
        response.data.releases,
        hubPublicKey,
        'release',
      )
      await this.processMultipleHubContentAccountDataWithHub(
        response.data.posts,
        hubPublicKey,
        'post',
      )
      await this.processMultipleHubCollaboratorAccountDataWithHub(
        response.data.collaborators,
        hubPublicKey,
      )
    } else if (/releases\/(.*?)\/hubs/.test(url)) {
      const releasePublicKey = url.split('/')[2]
      await this.processMulitpleHubAccountData(response.data.hubs)
      await this.processMultipleHubReleasesAccountDataWithHub(
        response.data.hubs,
        releasePublicKey,
      )
    } else if (url === '/hubs') {
      await this.processMulitpleHubAccountData(response.data.hubs)
    } else if (/releases\/(.*?)\/revenueShareRecipients/.test(url)) {
      const releasePublicKey = url.split('/')[2]
      let release = await this.fetchAccountData(
        releasePublicKey,
        'release',
        response.data.release.programId,
      )
      release = await Formatter.parseReleaseAccountData(release, response.data.release.programId, this.connection)
      response.data.revenueShareRecipients.forEach((recipient) => {
        recipient.accountData = {
          revenueShareRecipient: release.revenueShareRecipients.filter(
            (r) => r.recipientAuthority === recipient.publicKey,
          )[0],
        }
      })
    } else if (/accounts\/(.*?)\/hubs/.test(url)) {
      const publicKey = url.split('/')[2]
      await this.processMulitpleHubAccountData(response.data.hubs)
      await this.processMultipleHubCollaboratorAccountDataWithHubs(
        response.data.hubs,
        publicKey,
      )
    } else if (
      url === '/releases' ||
      /accounts\/(.*?)\/published/.test(url) ||
      /accounts\/(.*?)\/collected/.test(url) ||
      /accounts\/(.*?)\/revenueShares/.test(url)
    ) {
      await this.processMultipleReleaseAccountData(
        response.data.releases ||
          response.data.collected ||
          response.data.published ||
          response.data.revenueShares,
      )
    } else if (/accounts\/(.*?)\/exchanges/.test(url)) {
      await this.processMultipleExchangeAccountData(response.data.exchanges)
    } else if (/^\/releases\/((?!(\/)).)*$/.test(url)) {
      // NEVER LOOK UP ACCOUNT DATA FOR RELEASES WITH UUIDS AS PUBLIC KEYS (AKA LIVE RELEASES NOT YET ON CHAIN)
      if (!response.data.release.publicKey.includes('-')) {
        const release = await this.fetchAccountData(
          response.data.release.publicKey,
          'release',
          response.data.release.programId,
        )
        const formattedRelease = await Formatter.parseReleaseAccountData(release, response.data.release.programId, this.connection)
        response.data.release.accountData = {
          release: formattedRelease,
        }
      } else {
        const accountData = await Formatter.parseLiveReleaseMetadataAsAccountData(response.data.release.metadata, this.cluster)
        response.data.release.accountData = {
          release: accountData,
        }
      }
    } else if (/\/releases\/(.*?)\/exchanges/.test(url)) {
      await this.processMultipleExchangeAccountData(response.data.exchanges)
    } else if (/hubs\/(.*?)\/releases/.test(url)) {
      const hubPublicKey = response.data.publicKey
      await this.processMultipleHubContentAccountDataWithHub(
        response.data.releases,
        hubPublicKey,
        'release',
      )
      // } else if (url === "/posts" || /accounts\/(.*?)\/posts/.test(url)) {
    } else if (/hubs\/(.*?)\/posts/.test(url)) {
      const hubPublicKey = response.data.publicKey
      await this.processMultipleHubContentAccountDataWithHub(
        response.data.posts,
        hubPublicKey,
        'post',
      )
    } else if (/^\/posts\/((?!(\/)).)*$/.test(url)) {
      let post = await this.fetchAccountData(
        response.data.post.publicKey,
        'post',
      )
      post = Formatter.parsePostAccountData(post)
      let publishedThroughHub = await this.fetchAccountData(
        response.data.publishedThroughHub.publicKey,
        'hub',
      )
      publishedThroughHub = Formatter.parseHubAccountData(publishedThroughHub)
      response.data.post.accountData = post
      response.data.publishedThroughHub.accountData = publishedThroughHub
    } else if (/^\/accounts\/((?!(\/)).)*$/.test(url)) {
      await this.processMulitpleHubAccountData(response.data.hubs)
      await this.processMultipleReleaseAccountData(response.data.published)
      await this.processMultipleReleaseAccountData(response.data.collected)
      await this.processMultiplePostAccountData(response.data.posts)
      await this.processMultipleExchangeAccountData(response.data.exchanges)
    } else if (url === '/search') {
      await this.processMulitpleHubAccountData(response.data.hubs)
      await this.processMultipleReleaseAccountData(response.data.releases)
    } else if (url === '/exchanges') {
      await this.processMultipleExchangeAccountData(response.data.exchanges)
    } else if (/^\/exchanges\/((?!(\/)).)*$/.test(url)) {
      const exchangePublicKey = response.data.exchange.publicKey

      const exchange = await this.fetchAccountData(
        exchangePublicKey,
        'exchange',
      )

      response.data.exchange.accountData =
        Formatter.parseExchangeAccountData(exchange)
    }

    return response.data
  }

  async processMultiplePostAccountData(data) {
    const publicKeys = data.map((post) => post.publicKey)
    const posts = await this.fetchAccountDataMultiple(publicKeys, 'post')
    data.forEach((post, index) => {
      const parsedPost = Formatter.parsePostAccountData(posts[index])
      post.accountData = { post: parsedPost }
    })
  }

  async processMultipleExchangeAccountData(data) {
    const publicKeys = []
    data.forEach((exchange) => {
      if (!exchange.cancelled && !exchange.completedBy) {
        publicKeys.push(exchange.publicKey)
      }
    })

    const exchanges = await this.fetchAccountDataMultiple(
      publicKeys,
      'exchange',
    )

    exchanges.forEach((exchange, i) => {
      if (exchange) {
        const publicKey = publicKeys[i]
        const parsedExchange = Formatter.parseExchangeAccountData(exchange)
        data.filter(
          (exchangeData) => exchangeData.publicKey === publicKey,
        )[0].accountData = { exchange: parsedExchange }
      }
    })
  }

  async processMultipleReleaseAccountData(data) {
    const publicKeys = data.map((release) => release.publicKey)
    const programIds = data.map((release) => release.programId)
    const releases = await this.fetchAccountDataMultiple(publicKeys, 'release', programIds)
    
    let i = 0
    for await (let release of releases) {
      const publicKey = publicKeys[i]
      const formattedRelease = await Formatter.parseReleaseAccountData(release, data[i].programId, this.connection)
      const parsedRelease = formattedRelease
      data.filter(
        (releaseData) => releaseData.publicKey === publicKey,
      )[0].accountData = { release: parsedRelease }
      i++
    }
  }

  async processMultipleReleaseAccountDataWithHub(data, hubPublicKey) {
    const publicKeys = data.map((release) => release.publicKey)
    const releases = await this.fetchAccountDataMultiple(publicKeys, 'release')
    let i = 0
    for await (const release of releases) {
      const publicKey = publicKeys[i]
      const parsedRelease = await Formatter.parseReleaseAccountData(release, data[i].programId, this.connection)

      const [parsedHubReleaseAccount, parsedHubContentAccount] =
        await this.fetchHubContentAndChildAccountData(
          publicKey,
          hubPublicKey,
          'release',
        )

      data.filter(
        (releaseData) => releaseData.publicKey === publicKey,
      )[0].accountData = {
        release: parsedRelease,
        hubRelease: parsedHubReleaseAccount,
        hubContent: parsedHubContentAccount,
      }
      i++
    }
  }

  async processMultipleHubCollaboratorAccountDataWithHub(data, hubPublicKey) {
    const publicKeys = data.map((collaborator) => collaborator.publicKey)
    const hubCollaboratorPublicKeys = []
    for await (const publicKey of publicKeys) {
      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
        ],
        new anchor.web3.PublicKey(this.program.programId),
      )

      hubCollaboratorPublicKeys.push(hubCollaborator.toBase58())
    }

    const collaborators = await this.fetchAccountDataMultiple(
      hubCollaboratorPublicKeys,
      'hubCollaborator',
    )

    let i = 0
    for await (const collaborator of collaborators) {
      const publicKey = publicKeys[i]
      const hubCollaboratorPublicKey = hubCollaboratorPublicKeys[i]

      const parsedCollaborator = Formatter.parseHubCollaboratorAccountData(
        collaborator,
        hubCollaboratorPublicKey,
      )

      data.filter(
        (collaboratorData) => collaboratorData.publicKey === publicKey,
      )[0].accountData = {
        collaborator: parsedCollaborator,
      }
      i++
    }
  }

  async processMultipleHubCollaboratorAccountDataWithHubs(
    data,
    collaboratorPublicKey,
  ) {
    const publicKeys = data.map((hub) => hub.publicKey)
    const hubCollaboratorPublicKeys = []
    for await (const publicKey of publicKeys) {
      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          new anchor.web3.PublicKey(publicKey).toBuffer(),
          new anchor.web3.PublicKey(collaboratorPublicKey).toBuffer(),
        ],
        new anchor.web3.PublicKey(this.program.programId),
      )

      hubCollaboratorPublicKeys.push(hubCollaborator.toBase58())
    }

    const collaborators = await this.fetchAccountDataMultiple(
      hubCollaboratorPublicKeys,
      'hubCollaborator',
    )

    let i = 0
    for await (const collaborator of collaborators) {
      const hubCollaboratorPublicKey = hubCollaboratorPublicKeys[i]

      const parsedCollaborator = Formatter.parseHubCollaboratorAccountData(
        collaborator,
        hubCollaboratorPublicKey,
      )

      data[i].accountData.collaborator = parsedCollaborator
      i++
    }
  }

  async processAndParseSingleHubCollaboratorAccountDataWithHub(
    publicKey,
    hubPublicKey,
  ) {
    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
        new anchor.web3.PublicKey(publicKey).toBuffer(),
      ],
      new anchor.web3.PublicKey(this.program.programId),
    )

    const hubCollaboratorPublicKey = hubCollaborator.toBase58()

    const collaborator = await this.fetchAccountData(
      hubCollaboratorPublicKey,
      'hubCollaborator',
    )

    const parsedCollaborator = Formatter.parseHubCollaboratorAccountData(
      collaborator,
      hubCollaboratorPublicKey,
    )

    return parsedCollaborator
  }

  async processMultipleHubReleasesAccountDataWithHub(data, releasePublicKey) {
    const hubReleasePublicKeys = []
    const hubContentPublicKeys = []
    for await (const hub of data) {
      const [hubReleasePublicKey] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-release`)),
            new anchor.web3.PublicKey(hub.publicKey).toBuffer(),
            new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
          ],
          this.program.programId,
        )

      hubReleasePublicKeys.push(hubReleasePublicKey)

      const [hubContentPublicKey] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-content`)),
            new anchor.web3.PublicKey(hub.publicKey).toBuffer(),
            new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
          ],
          this.program.programId,
        )

      hubContentPublicKeys.push(hubContentPublicKey)
    }

    const hubReleases = await this.fetchAccountDataMultiple(
      hubReleasePublicKeys,
      'hubRelease',
    )

    const hubContent = await this.fetchAccountDataMultiple(
      hubContentPublicKeys,
      'hubContent',
    )

    let i = 0
    for await (const hub of data) {
      const parsedHubRelease = Formatter.parseHubReleaseAccountData(
        hubReleases[i],
        hubReleasePublicKeys[i],
      )

      const parsedHubContent = Formatter.parseHubContentAccountData(
        hubContent[i],
        hubContentPublicKeys[i],
      )

      hub.accountData = {
        hub,
        hubRelease: parsedHubRelease,
        hubContent: parsedHubContent,
      }
      i++
    }
  }

  async processHubReleaseAccountDataWithHub(releasePublicKey, hubPublicKey) {
    const release = await this.fetchAccountData(releasePublicKey, 'release')

    const [hubReleasePublicKey] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-release`)),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
        ],
        this.program.programId,
      )

    const [hubContentPublicKey] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-content`)),
          new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
          new anchor.web3.PublicKey(releasePublicKey).toBuffer(),
        ],
        this.program.programId,
      )

    const hubRelease = await this.fetchAccountData(
      hubReleasePublicKey,
      'hubRelease',
    )

    const hubContent = await this.fetchAccountData(
      hubContentPublicKey,
      'hubContent',
    )

    const parsedHubRelease = Formatter.parseHubReleaseAccountData(
      hubRelease,
      hubReleasePublicKey,
    )

    const parsedHubContent = Formatter.parseHubContentAccountData(
      hubContent,
      hubContentPublicKey,
    )

    const parsedRelease = await Formatter.parseReleaseAccountData(release, this.program.programId, this.connection)

    return {
      release: parsedRelease,
      hubRelease: parsedHubRelease,
      hubContent: parsedHubContent,
    }
  }

  async processMultipleHubContentAccountDataWithHub(
    data,
    hubPublicKey,
    accountType,
  ) {
    const publicKeys = data.map((account) => account.publicKey)

    const accounts = await this.fetchAccountDataMultiple(
      publicKeys,
      accountType,
    )

    const hubChildrenPublicKeys = []
    const hubContentPublicKeys = []
    for await (const publicKey of publicKeys) {
      const [hubChildPublicKey] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(
              anchor.utils.bytes.utf8.encode(`nina-hub-${accountType}`),
            ),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            new anchor.web3.PublicKey(publicKey).toBuffer(),
          ],
          this.program.programId,
        )

      hubChildrenPublicKeys.push(hubChildPublicKey)

      const [hubContentPublicKey] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode(`nina-hub-content`)),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            new anchor.web3.PublicKey(publicKey).toBuffer(),
          ],
          this.program.programId,
        )

      hubContentPublicKeys.push(hubContentPublicKey)
    }
    const hubChildString = `hub${_.capitalize(accountType)}`

    const hubChildren = await this.fetchAccountDataMultiple(
      hubChildrenPublicKeys,
      hubChildString,
    )

    const hubContent = await this.fetchAccountDataMultiple(
      hubContentPublicKeys,
      'hubContent',
    )

    let i = 0
    for await (const account of accounts) {
      const publicKey = publicKeys[i]
      let parsedAccount
      let parsedChild

      if (accountType === 'release') {
        parsedAccount = await Formatter.parseReleaseAccountData(account, this.program.programId.toBase58(), this.connection)
        parsedChild = Formatter.parseHubReleaseAccountData(
          hubChildren[i],
          hubChildrenPublicKeys[i],
        )
      } else if (accountType === 'post') {
        parsedAccount = Formatter.parsePostAccountData(account)
        parsedChild = Formatter.parseHubPostAccountData(
          hubChildren[i],
          hubChildrenPublicKeys[i],
        )
      }

      const parsedHubContent = Formatter.parseHubContentAccountData(
        hubContent[i],
        publicKey,
      )

      data.filter(
        (accountData) => accountData.publicKey === publicKey,
      )[0].accountData = {
        [accountType]: parsedAccount,
        [hubChildString]: parsedChild,
        hubContent: parsedHubContent,
      }
      i++
    }
  }

  async processMulitpleHubAccountData(data) {
    const publicKeys = data.map((account) => account.publicKey)
    const hubs = await this.fetchAccountDataMultiple(publicKeys, 'hub')
    hubs.forEach((hub, i) => {
      const publicKey = publicKeys[i]
      const parsedHub = Formatter.parseHubAccountData(hub)
      parsedHub.publicKey = publicKey
      data.filter((hubData) => hubData.publicKey === publicKey)[0].accountData =
        {
          hub: parsedHub,
        }
    })
  }
}
