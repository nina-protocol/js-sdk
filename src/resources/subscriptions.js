import * as anchor from '@coral-xyz/anchor';
import { getConfirmTransaction } from '../utils'

/**
 * @module Subscription
 */
export default class Subscription {
  constructor({ http, program, provider }) {
    this.http = http
    this.program = program
    this.provider = provider
  }

  /**
   * @function fetchAll
   * @description Fetches all Subscriptions.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
   * @example const subscriptions = await subscription.fetchAll();
   * @returns {Array} an array of all of the Subscriptions on Nina.
   */
  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination

    return this.http.get(
      '/subscriptions',
      {
        limit: limit || 20,
        offset: offset || 0,
        sort: sort || 'desc',
      },
      withAccountData,
    )
  }

  /**
   * @function fetch
   * @description Fetches a subscription.
   * @param {String} publicKey - The public key of the Subscription.
   * @param {String} transactionId - The transaction Id of an already existing Subscription.
   * @example const subscription = await subscription.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV");
   * @returns {Object} an object containing the Subscription's data.
   */
  async fetch(publicKey, withAccountData = false, transactionId = undefined) {
    return this.http.get(
      `/subscriptions/${publicKey}`,
      transactionId ? { transactionId } : undefined,
      withAccountData,
    )
  }

  /**
   * @function subscriptionSubscribe
   * @description Subscribes to, or "follows" an Account.
   * @param {String} subscribeToAccount - The public key of the Account to be subscribed to.
   * @param {String} hubHandle - If present, the Hub handle being subscribed to.
   * @example await subscriptionSubscribe(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX")
   * @returns {Object} the Subscription data.
   */

  async subscriptionSubscribe(subscribeToAccount, hubHandle) {
    try {
      subscribeToAccount = new anchor.web3.PublicKey(subscribeToAccount)

      const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
          this.provider.wallet.publicKey.toBuffer(),
          subscribeToAccount.toBuffer(),
        ],
        this.program.programId,
      )

      let tx

      if (hubHandle) {
        tx = await this.program.methods
          .subscriptionSubscribeHub(hubHandle)
          .accounts({
            payer: this.provider.wallet.publicKey,
            from: this.provider.wallet.publicKey,
            subscription,
            to: subscribeToAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction()
      } else {
        tx = await this.program.methods
          .subscriptionSubscribeAccount()
          .accounts({
            payer: this.provider.wallet.publicKey,
            from: this.provider.wallet.publicKey,
            subscription,
            to: subscribeToAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction()
      }

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash

      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)
      const subscriptionData = await fetch(subscription.toBase58(), txid)

      return {
        subscription: subscriptionData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }
  /**
   * @function subscriptionUnsubscribe
   * @description Unsubscribes from, or "unfollows" an Account.
   * @param {String} unsubscribeAccount - The public key of the Account to unsubscribe from.
   * @example await subscriptionUnsubscribe(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX")
   * @returns {Object} the Subscription data.
   */

  async subscriptionUnsubscribe(unsubscribeAccount) {
    try {
      unsubscribeAccount = new anchor.web3.PublicKey(unsubscribeAccount)

      const [subscription] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-subscription')),
          this.provider.wallet.publicKey.toBuffer(),
          unsubscribeAccount.toBuffer(),
        ],
        this.program.programId,
      )

      const tx = await this.program.methods
        .subscriptionUnsubscribe()
        .accounts({
          payer: this.provider.wallet.publicKey,
          from: this.provider.wallet.publicKey,
          subscription,
          to: unsubscribeAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)

      const subscriptionData = await fetch(subscription.toBase58(), txid)

      return {
        subscription: subscriptionData,
      }
    } catch (error) {
      console.warn(error)

      return {
        error,
      }
    }
  }
}
