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

const subscriptionSubscribe = async (subscribeToAccount, hubHandle, wallet, connection) => {
  try {
    const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'processed',
  })
  const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
  subscribeToAccount = new anchor.web3.PublicKey(subscribeToAccount)

const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
    provider.wallet.publicKey.toBuffer(),
    subscribeToAccount.toBuffer(),
  ],
  program.programId
)

const request = {
  accounts: {
    from: provider.wallet.publicKey,
    subscription,
    to: subscribeToAccount,
    systemProgram: anchor.web3.SystemProgram.programId,
  },
}

let txid
if (hubHandle) {
  txid = await program.rpc.subscriptionSubscribeHub(hubHandle, request)
} else {
  txid = await program.rpc.subscriptionSubscribeAccount(request)
}

await getConfirmTransaction(txid, provider.connection)
const subscriptionData = await fetch(subscription.toBase58(), txid)
return subscriptionData
  } catch (error) {
    console.warn(error)
    return false
  }
}

const subscriptionUnsubscribe = async (unsubscribeAccount, hubHandle, wallet, connection) => {
  try {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const program = await anchor.Program.at(NinaClient.ids.programs.nina, provider);
    unsubscribeAccount = new anchor.web3.PublicKey(unsubscribeAccount)

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        unsubscribeAccount.toBuffer(),
      ],
      program.programId
    )
    const txid = await program.rpc.subscriptionUnsubscribe({
      accounts: {
        from: provider.wallet.publicKey,
        subscription,
        to: unsubscribeAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    })
    await getConfirmTransaction(txid, provider.connection)

    const subscriptionData = await fetch(subscription.toBase58(), txid)
    return subscriptionData
  } 
  catch (error) {
    console.warn(error)
    return false
  }
}


export default {
  fetchAll,
  fetch,
  subscriptionSubscribe,
  subscriptionUnsubscribe
};
