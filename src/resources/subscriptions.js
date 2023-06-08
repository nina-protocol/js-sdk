import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import { getConfirmTransaction } from '../utils';

/**
 * @module Subscription
 */

/**
 * @function fetchAll
 * @description Fetches all Subscriptions.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @example const subscriptions = await subscription.fetchAll();
 * @returns {Array} an array of all of the Subscriptions on Nina.
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
 * @description Fetches a subscription.
 * @param {String} publicKey - The public key of the Subscription.
 * @param {String} Transaction - The transaction Id of an already existing Subscription.
 * @example const subscription = await subscription.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV");
 * @returns {Object} an object containing the Subscription's data.
 */
const fetch = async (publicKey, withAccountData = false, transactionId = undefined) => {
  return NinaClient.get(`/subscriptions/${publicKey}`, transactionId ? { transactionId } : undefined);
};

/**
 * @function subscriptionSubscribe
 * @description Subscribes to, or "follows" an Account.
 * @param {Object} client - The Nina Client.
 * @param {String} subscribeToAccount - The public key of the Account to be subscribed to.
 * @param {String} hubHandle - If present, the Hub handle being subscribed to.
 * @example await subscriptionSubscribe(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX")
 * @returns {Object} the Subscription data.
 */

const subscriptionSubscribe = async (client, subscribeToAccount, hubHandle) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    subscribeToAccount = new anchor.web3.PublicKey(subscribeToAccount);

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        subscribeToAccount.toBuffer(),
      ],
      program.programId
    );

    let tx;
    if (hubHandle) {
      tx = await program.methods
        .subscriptionSubscribeHub(hubHandle)
        .accounts({
          payer: provider.wallet.publicKey,
          from: provider.wallet.publicKey,
          subscription,
          to: subscribeToAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    } else {
      tx = await program.methods
        .subscriptionSubscribeAccount()
        .accounts({
          payer: provider.wallet.publicKey,
          from: provider.wallet.publicKey,
          subscription,
          to: subscribeToAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    }

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;

    tx.feePayer = provider.wallet.publicKey;

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const subscriptionData = await fetch(subscription.toBase58(), txid);
    return {
      subscription: subscriptionData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};
/**
 * @function subscriptionUnsubscribe
 * @description Unsubscribes from, or "unfollows" an Account.
 * @param {Object} client - The Nina Client.
 * @param {String} unsubscribeAccount - The public key of the Account to unsubscribe from.
 * @example await subscriptionUnsubscribe(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX")
 * @returns {Object} the Subscription data.
 */

const subscriptionUnsubscribe = async (client, unsubscribeAccount) => {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    unsubscribeAccount = new anchor.web3.PublicKey(unsubscribeAccount);

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        unsubscribeAccount.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .subscriptionUnsubscribe()
      .accounts({
        payer: provider.wallet.publicKey,
        from: provider.wallet.publicKey,
        subscription,
        to: unsubscribeAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);

    const subscriptionData = await fetch(subscription.toBase58(), txid);
    return {
      subscription: subscriptionData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
};

export default {
  fetchAll,
  fetch,
  subscriptionSubscribe,
  subscriptionUnsubscribe,
}