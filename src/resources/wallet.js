import * as anchor from '@coral-xyz/anchor';
import { getAccount } from '@solana/spl-token'
import axios from 'axios'
import {
  NINA_CLIENT_IDS,
  findOrCreateAssociatedTokenAccount,
  getConfirmTransaction,
  uiToNative,
  nativeToUi,
  sleep,
} from '../utils'
import { createTransferInstruction } from '@solana/spl-token'

export default class Wallet {
  constructor({ provider, cluster }) {
    this.cluster = cluster
    this.provider = provider
  }

  async getSolPrice(native=false) {
    try {
      const priceResult = await axios.get(
        `https://price.jup.ag/v4/price?ids=SOL`,
      )
      if (native) {
        return Math.trunc(uiToNative(priceResult.data.data.SOL.price, priceResult.data.data.SOL.id))
      }
      return priceResult.data.data.SOL.price
    } catch (error) {
      return error
    }
  }

  async getUsdcBalanceForPublicKey(publicKey, isNative=false) {
    let usdc = 0

    if (publicKey) {
      try {
        const [usdcTokenAccountPubkey] =
          await findOrCreateAssociatedTokenAccount(
            this.provider.connection,
            new anchor.web3.PublicKey(publicKey),
            new anchor.web3.PublicKey(publicKey),
            anchor.web3.SystemProgram.programId,
            new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
          )
        if (usdcTokenAccountPubkey) {
          const usdcTokenAccount =
            await this.provider.connection.getTokenAccountBalance(
              usdcTokenAccountPubkey, 'processed'
            )
            
          if (isNative) {
            usdc = Number(usdcTokenAccount.value.amount)
          } else {
            usdc = usdcTokenAccount.value.uiAmount
          }
        }
      } catch (error) {
        console.error('error getting usdc balance', error)
      }
    }

    return usdc
  }

  async getSolBalanceForPublicKey(publicKey, isNative=false) {
    const solBalanceResult = await this.provider.connection.getBalance(
      new anchor.web3.PublicKey(publicKey), 'processed'
    )

    if (isNative) {
      return solBalanceResult
    } else {
      return nativeToUi(solBalanceResult, NINA_CLIENT_IDS[this.cluster].mints.wsol)
    }
  }

  async sendSol(amount, destination, isNative=false) {
    try {
      const instructions = [anchor.web3.SystemProgram.transfer({
        fromPubkey: this.provider.wallet.publicKey,
        toPubkey: new anchor.web3.PublicKey(destination),
        lamports: new anchor.BN(
          isNative ? amount : uiToNative(amount, NINA_CLIENT_IDS[this.cluster].mints.wsol)
        ),
      })]

      const latestBlockhash = await this.provider.connection.getLatestBlockhashAndContext()

      const lookupTableAddress = this.cluster === 'mainnet' ? 'AGn3U5JJoN6QXaaojTow2b3x1p4ucPs8SbBpQZf6c1o9' : 'Bx9XmjHzZikpThnPSDTAN2sPGxhpf41pyUmEQ1h51QpH'
      const lookupTablePublicKey = new anchor.web3.PublicKey(lookupTableAddress)
      const lookupTableAccount = await this.provider.connection.getAddressLookupTable(lookupTablePublicKey);
      
      const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: this.provider.wallet.publicKey,
        recentBlockhash: latestBlockhash.value.blockhash,
        instructions: instructions,
      }).compileToV0Message([lookupTableAccount.value]);
      const tx = new anchor.web3.VersionedTransaction(messageV0)

      const signedTx = await this.provider.wallet.signTransaction(tx);
      let txid
      let attempts = 0
      let blockheight = await this.provider.connection.getBlockHeight();
      while (!txid && attempts < 50) {
        try {
          attempts+=1
          const tx = await this.provider.connection.sendTransaction(signedTx, {
            maxRetries: 5,
          });
          await getConfirmTransaction(tx, this.provider.connection)
          txid = tx
        } catch (error) {
          console.log('failed attempted to send usdc tx: ', error)
          await sleep(500)
          blockheight = await this.provider.connection.getBlockHeight();
          console.log('failed attempted to send usdc tx, retrying from blockheight: ', blockheight)
        }
      }

      return {
        success: true,
        txid,
      }
    } catch (error) {
      return {
        success: false,
        error,
      }
    }
  }

  async sendUsdc(amount, destination) {
    try {
      const destinationInfo = await this.provider.connection.getAccountInfo(
        new anchor.web3.PublicKey(destination),
      )
      console.log('destinationInfo', destinationInfo)
      console.log('destinationInfo.owner', destinationInfo.owner.toBase58())
      console.log('anchor.web3.SystemProgram.programId.toBase58()', anchor.web3.SystemProgram.programId.toBase58())
      let isSystemAccount = false
      let isUsdcTokenAccount = false
      let toUsdcTokenAccount = null
      let toUsdcTokenAccountIx = null
      
      if (
        destinationInfo &&
        destinationInfo.owner.toBase58() ===
        anchor.web3.SystemProgram.programId.toBase58()
      ) {
        isSystemAccount = true
      }

      try {
        console.log('destination', destination)
        const tokenAccount = await getAccount(
          this.provider.connection,
          new anchor.web3.PublicKey(destination),
        )

        if (
          tokenAccount.mint.toBase58() ===
          NINA_CLIENT_IDS[this.cluster].mints.usdc
        ) {
          isUsdcTokenAccount = true
        }
      } catch (error) {
        console.error('error getting token account', error)
      }
      
      const [fromUsdcTokenAccount, fromUsdcTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
        )

      if (isUsdcTokenAccount) {
        toUsdcTokenAccount = new anchor.web3.PublicKey(destination)
      } else {
        const [_toUsdcTokenAccount, _toUsdcTokenAccountIx] =
          await findOrCreateAssociatedTokenAccount(
            this.provider.connection,
            this.provider.wallet.publicKey,
            new anchor.web3.PublicKey(destination),
            anchor.web3.SystemProgram.programId,
            new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
          )

        toUsdcTokenAccount = _toUsdcTokenAccount
        toUsdcTokenAccountIx = _toUsdcTokenAccountIx
      }

      const instructions = []

      if (fromUsdcTokenAccountIx) {
        instructions.push(fromUsdcTokenAccountIx)
      }

      if (toUsdcTokenAccountIx) {
        instructions.push(toUsdcTokenAccountIx)
      }

      const transferInstruction = createTransferInstruction(
        fromUsdcTokenAccount,
        toUsdcTokenAccount,
        this.provider.wallet.publicKey,
        new anchor.BN(
          uiToNative(amount, NINA_CLIENT_IDS[this.cluster].mints.usdc),
        )
      )

      instructions.push(transferInstruction)

      const latestBlockhash = await this.provider.connection.getLatestBlockhashAndContext()

      const lookupTableAddress = this.cluster === 'mainnet' ? 'AGn3U5JJoN6QXaaojTow2b3x1p4ucPs8SbBpQZf6c1o9' : 'Bx9XmjHzZikpThnPSDTAN2sPGxhpf41pyUmEQ1h51QpH'
      const lookupTablePublicKey = new anchor.web3.PublicKey(lookupTableAddress)
      const lookupTableAccount = await this.provider.connection.getAddressLookupTable(lookupTablePublicKey);
      
      const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: this.provider.wallet.publicKey,
        recentBlockhash: latestBlockhash.value.blockhash,
        instructions: instructions,
      }).compileToV0Message([lookupTableAccount.value]);
      const tx = new anchor.web3.VersionedTransaction(messageV0)

      const signedTx = await this.provider.wallet.signTransaction(tx);
      let txid
      let attempts = 0
      let blockheight = await this.provider.connection.getBlockHeight();
      while (!txid && attempts < 50) {
        try {
          attempts+=1
          const tx = await this.provider.connection.sendTransaction(signedTx, {
            maxRetries: 5,
          });
          await getConfirmTransaction(tx, this.provider.connection)
          txid = tx
        } catch (error) {
          console.log('failed attempted to send usdc tx: ', error)
          await sleep(500)
          blockheight = await this.provider.connection.getBlockHeight();
          console.log('failed attempted to send usdc tx, retrying from blockheight: ', blockheight)
        }
      }

      return {
        success: true,
        txid,
      }
    } catch (error) {
      return {
        success: false,
        error,
      }
    }
  }

  async getAmountHeld(release, accountPublicKey) {
    let amount = 0

    const tokenAccounts =
      await this.provider.connection.getParsedTokenAccountsByOwner(
        new anchor.web3.PublicKey(accountPublicKey),
        { programId: anchor.utils.token.TOKEN_PROGRAM_ID.toBase58() },
      )

    tokenAccounts.value.forEach((value) => {
      const account = value.account.data.parsed.info

      if (account.mint === release.releaseMint) {
        amount = account.tokenAmount.uiAmount
      }
    })

    return amount
  }
}
