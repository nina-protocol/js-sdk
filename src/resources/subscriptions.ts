import NinaClient from './client';
import * as anchor from '@project-serum/anchor';
import { getConfirmTransaction } from '../utils';
import { Axios, AxiosResponse } from 'axios';

/**
 * @module Subscription
 */

/**
 * @function fetchAll
 * @description Fetches all Subscriptionss.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @example const subscriptions = await NinaClient.Subscription.fetchAll();
 */

interface fetchAllParams {
  limit?: number;
  offset?: number;
  sort?: string;
  withAccountData?: boolean;
}

async function fetchAll(
  pagination: fetchAllParams = {},
  withAccountData: fetchAllParams
): Promise<AxiosResponse<any, any>> {
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
}

/**
 * @function fetch
 * @description Fetches a Post.
 * @param {String} publicKey - The public key of the Subscription.
 * @param {String} Transaction - The transaction Id of an already existing Subscription.
 * @example const subscriptions = await NinaClient.Subscription.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV");
 */

interface fetchParams {
  publicKey: string;
  withAccountData: boolean;
  transactionId: string;
}

async function fetch({ publicKey, withAccountData, transactionId }: fetchParams): Promise<AxiosResponse<any, any>> {
  return await NinaClient.get(
    `/subscriptions/${publicKey}`,
    withAccountData,
    transactionId ? { transactionId } : undefined
  );
}

// SUBSCRIPTIONS

interface subscriptionParams {
  client: NinaClient;
  account: string | anchor.web3.PublicKey;
  handle: string;
}

/**
 * @function subscriptionSubscribe
 * @param {Object} client the NinaClient instance
 * @param {String} account the account to subscribe to
 * @param {String} handle the hub handle to subscribe to
 * @returns {Object} the Subscription data
 */

async function subscriptionSubscribe({
  client,
  account,
  handle,
}: subscriptionParams): Promise<AxiosResponse | {} | undefined> {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    account = new anchor.web3.PublicKey(account);

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        account.toBuffer(),
      ],
      program.programId
    );

    let tx;
    if (handle) {
      tx = await program.methods
        .subscriptionSubscribeHub(handle)
        .accounts({
          payer: provider.wallet.publicKey,
          from: provider.wallet.publicKey,
          subscription,
          to: account,
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
          to: account,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
    }

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;

    tx.feePayer = provider.wallet.publicKey;

    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const subscriptionPublicKey = subscription.toBase58();
    const subscriptionData = await fetch({
      publicKey: subscriptionPublicKey,
      withAccountData: false,
      transactionId: txid,
    });
    return {
      subscription: subscriptionData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
}

/**
 * @function subscriptionUnsubscribe
 * @param {Object} client the NinaClient instance
 * @param {String} unsubscribeAccount the account to unsubscribe from
 * @returns {Object} the Subscription data
 */

async function subscriptionUnsubscribe({
  client,
  account,
}: subscriptionParams): Promise<AxiosResponse | {} | undefined> {
  try {
    const { provider } = client;
    const program = await client.useProgram();
    account = new anchor.web3.PublicKey(account);

    const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
        provider.wallet.publicKey.toBuffer(),
        account.toBuffer(),
      ],
      program.programId
    );
    const tx = await program.methods
      .subscriptionUnsubscribe()
      .accounts({
        payer: provider.wallet.publicKey,
        from: provider.wallet.publicKey,
        subscription,
        to: account,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    const txid = await provider.wallet.sendTransaction(tx, provider.connection);
    await getConfirmTransaction(txid, provider.connection);
    const subscriptionPublicKey = subscription.toBase58();
    const subscriptionData = await fetch({
      publicKey: subscriptionPublicKey,
      withAccountData: false,
      transactionId: txid,
    });
    return {
      subscription: subscriptionData,
    };
  } catch (error) {
    console.warn(error);
    return {
      error,
    };
  }
}

export default {
  fetchAll,
  fetch,
  subscriptionSubscribe,
  subscriptionUnsubscribe,
};
