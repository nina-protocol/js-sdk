import AsyncRetry from "async-retry";
import BigNumber from "bignumber.js";
import { SystemProgram, PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";

import Utils from "@bundlr-network/client/build/cjs/common/utils";

export default class Fund {
    utils;
    provider;
    constructor(utils, provider) {
        this.utils = utils;
        this.provider = provider;
    }
    /**
     * Function to Fund (send funds to) a Bundlr node - inherits instance currency and node
     * @param amount - amount in base units to send
     * @param multiplier - network tx fee multiplier - only works for specific currencies
     * @returns  - funding receipt
     */
    async fund(amount, multiplier = 1.0) {
        const _amount = new BigNumber(amount);
        if (!_amount.isInteger()) {
            throw new Error("must use an integer for funding amount");
        }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        let fee;
        if (c.needsFee) {
            // winston's fee is actually for amount of data, not funds, so we have to 0 this.
            const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to);
            fee = BigNumber.isBigNumber(baseFee) ? baseFee.multipliedBy(multiplier).integerValue(BigNumber.ROUND_CEIL) : baseFee;
        }
        const tx = await this.createTx(_amount, to, fee);
        let nres;
        // eslint-disable-next-line no-useless-catch
        try {
            nres = await c.sendTx(tx.tx);
        }
        catch (e) {
            throw e;
        }
        tx.txId ??= nres;
        if (!tx.txId) {
            throw new Error(`Undefined transaction ID`);
        }
        Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        let confirmError = await this.utils.confirmationPoll(tx.txId);
        const bres = await this.submitTransaction(tx.txId).catch((e) => {
            confirmError = e;
            return undefined;
        });
        if (!bres) {
            throw new Error(`failed to post funding tx - ${tx.txId} - keep this id! \n ${confirmError ? ` - ${confirmError?.message ?? confirmError}` : ""}`);
        }
        return { reward: BigNumber.isBigNumber(fee) ? fee.toString() : JSON.stringify(fee), target: to, quantity: _amount.toString(), id: tx.txId };
    }

    async submitTransaction(transactionId) {
        return await AsyncRetry(async () => {
            const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: transactionId });
            Utils.checkAndThrow(bres, `Posting transaction ${transactionId} information to the bundler`, [202]);
            return bres;
        }, {
            retries: 5,
            maxTimeout: 1000,
            minTimeout: 100,
            randomize: true,
        });
    }
    async submitFundTransaction(transactionId) {
        return this.submitTransaction(transactionId);
    }

    async createTx(amount, to, _fee) {
      const latestBlockhash = await this.provider.connection.getLatestBlockhashAndContext()
      const transaction = new Transaction({ recentBlockhash: latestBlockhash.value.blockhash, feePayer: this.provider.wallet.publicKey });
      transaction.add(SystemProgram.transfer({
        fromPubkey: this.provider.wallet.publicKey,
        toPubkey: new PublicKey(to),
        lamports: amount.toNumber(),
      }));
      const transactionBuffer = transaction.serializeMessage();
      const keys = this.utils.currencyConfig.getKeyPair();
      const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
      transaction.addSignature(keys.publicKey, Buffer.from(signature));

      return { tx: transaction, txId: undefined };
  }

}
//# sourceMappingURL=fund.js.map