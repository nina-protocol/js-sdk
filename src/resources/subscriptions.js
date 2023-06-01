import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import {findOrCreateAssociatedTokenAccount, getConfirmTransaction, decodeNonEncryptedByteArray, uiToNative} from '../utils';

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
 * @param {String} publicKey - The public key of the Subscription.
 * @param {String} Transaction - The transaction Id of an already existing Subscription.
 * @example const subscriptions = await NinaClient.Subscription.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV");
 */
const fetch = async (publicKey, withAccountData = false, transactionId = undefined) => {
  return NinaClient.get(`/subscriptions/${publicKey}`, transactionId ? { transactionId } : undefined);
};

/**
 * @function subscriptionSubscribe
 * @param {Object} client the NinaClient instance
 * @param {String} subscribeToAccount the account to subscribe to
 * @param {String} hubHandle the hub handle to subscribe to
 * @returns {Object} the subscription data
 */

const subscriptionSubscribe = async (client, subscribeToAccount, hubHandle) => {
  try {
  const {provider} = client
  const program = await client.useProgram()
  subscribeToAccount = new anchor.web3.PublicKey(subscribeToAccount)

const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
    provider.wallet.publicKey.toBuffer(),
    subscribeToAccount.toBuffer(),
  ],
  program.programId
)

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
    .transaction()
} else {
  tx = await program.methods.subscriptionSubscribeAccount()
  .accounts({
    payer: provider.wallet.publicKey,
    from: provider.wallet.publicKey,
    subscription,
    to: subscribeToAccount,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .transaction()
}

tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash

tx.feePayer = provider.wallet.publicKey

const txid = await provider.wallet.sendTransaction(tx, provider.connection)
await getConfirmTransaction(txid, provider.connection)
const subscriptionData = await fetch(subscription.toBase58(), txid)
return {
  subscriptionData: subscriptionData,
}
  } catch (error) {
    console.warn(error)
    return {
      error
    }
  }
}
/**
 * @function subscriptionUnsubscribe
 * @param {Object} client the NinaClient instance
 * @param {String} unsubscribeAccount the account to unsubscribe from
 * @returns {Object} the subscription data
 */

const subscriptionUnsubscribe = async (client, unsubscribeAccount) => {
  try {
    const {provider} = client
    const program = await client.useProgram()
    unsubscribeAccount = new anchor.web3.PublicKey(unsubscribeAccount)

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        unsubscribeAccount.toBuffer(),
      ],
      program.programId
    )
    const tx = await program.methods.subscriptionUnsubscribe()
    .accounts({
      payer: provider.wallet.publicKey,
      from: provider.wallet.publicKey,
      subscription,
      to: unsubscribeAccount,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .transaction()

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash
    tx.feePayer = provider.wallet.publicKey
    const txid = await provider.wallet.sendTransaction(tx, provider.connection)
    await getConfirmTransaction(txid, provider.connection)

    const subscriptionData = await fetch(subscription.toBase58(), txid)
    return {
      subscriptionData: subscriptionData,
    }
  }
  catch (error) {
    console.warn(error)
    return {
      error
    }
  }
}


export default {
  fetchAll,
  fetch,
  subscriptionSubscribe,
  subscriptionUnsubscribe
};
