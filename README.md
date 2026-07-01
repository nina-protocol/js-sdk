# @nina-protocol/js-sdk

A Javascript client for interacting with the [Nina Protocol](https://ninaprotocol.com) via the [Nina API](https://github.com/nina-protocol/nina-indexer).

Nina Protocol is a digitally-native ecosystem for music built on Solana and Arweave.

`@nina-protocol/js-sdk` provides a convenient way to fetch and query both cached and on-chain data relevant to activity on the Nina Protocol. This includes:

- Accounts (any Solana wallet that interacts with the Nina Program including Artists and Collectors)
- Releases
- Hubs
- Exchanges
- Posts

## Installation

```
yarn add @nina-protocol/js-sdk
```

or

```
npm install @nina-protocol/js-sdk
```

## Usage

```
import Nina from '@nina-protocol/js-sdk';
Nina.client.init();

//Fetch All Nina Releases
const { releases } = await Nina.Release.fetchAll()

//Fetch a single Release and its Account Data
const { release } = await Nina.Release.fetch('BgVfERhoGVrRPJqGbDxhRbrxRhK3buTcbrrsZYEcwbNw', true)

//Fetch Collectors for a Release and include their collections
const { release } = await Nina.Release.fetchCollectors('BgVfERhoGVrRPJqGbDxhRbrxRhK3buTcbrrsZYEcwbNw', true)

//Fetch a Hub by Handle
const { hub, releases, collaborators, posts } = await Nina.Hub.fetch('ninas-picks')

//Search
const { artists, releases, hubs } = await Nina.Search.withQuery('techno')

```

## Demo

Visit the [Api Explorer](https://dev.ninaprotocol.com) for an example of the `@nina-protocol/js-sdk` in use.

## Documentation

Full documentation is available [here](http://sdk.docs.ninaprotocol.com)

## Future

Currently the SDK only provides interfaces for fetching data. In the future we will add support for interacting with the Nina Program (purchase Releases, publish Releases, repost Releases to Hub, etc).

---

## Developing

```
git clone git@github.com:nina-protocol/js-sdk.git
yarn
yarn watch
```

---

## Contributors welcome!

Need help? Ask a question in our [Discord](https://discord.gg/ePkqJqSBgj) or open an issue.
