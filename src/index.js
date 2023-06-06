import Account from './resources/accounts';
import Exchange from './resources/exchanges';
import Hub from './resources/hubs';
import Post from './resources/posts';
import Release from './resources/releases';
import Search from './resources/search';
import Subscription from './resources/subscriptions';
import client from './client';
import utils from './utils';

const Nina = {
  Account,
  Exchange,
  Hub,
  Post,
  Release,
  Search,
  Subscription,
  client,
  utils
};

export default Nina;
