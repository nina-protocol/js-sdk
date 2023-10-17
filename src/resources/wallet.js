import * as anchor from '@coral-xyz/anchor';
import { getAccount } from '@solana/spl-token'
import axios from 'axios'
import {
  NINA_CLIENT_IDS,
  findOrCreateAssociatedTokenAccount,
  getConfirmTransaction,
  uiToNative,
  nativeToUi,
} from '../utils'
import { createTransferInstruction } from '@solana/spl-token'

export default class Wallet {
  constructor({ provider, cluster }) {
    this.cluster = cluster
    this.provider = provider
  }

  async getSolPrice() {
    try {
      const priceResult = await axios.get(
        `https://price.jup.ag/v4/price?ids=SOL`,
      )

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
              usdcTokenAccountPubkey, 'finalized'
            )
            
          if (isNative) {
            usdc = Number(usdcTokenAccount.value.amount)
          } else {
            usdc = usdcTokenAccount.value.uiAmount
          }
        }
      } catch (error) {
        console.warn('error getting usdc balance')
        console.warn(error)
      }
    }

    return usdc
  }

  async getSolBalanceForPublicKey(publicKey, isNative=false) {
    const solBalanceResult = await this.provider.connection.getBalance(
      new anchor.web3.PublicKey(publicKey), {
        commitment: 'finalized'
      }

    )

    if (isNative) {
      return solBalanceResult
    } else {
      return nativeToUi(solBalanceResult, NINA_CLIENT_IDS[this.cluster].mints.wsol)
    }
  }

  async sendUsdc(amount, destination) {
    try {
      console.log('destination', destination)
      console.log('amount', amount)
      const destinationInfo = await this.provider.connection.getAccountInfo(
        new anchor.web3.PublicKey(destination),
      )
      console.log('this.provider.connection', this.provider.connection)
      console.log('destinationInfo', destinationInfo)
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

      if (!isSystemAccount) {
        if (
          destinationInfo &&
          destinationInfo.owner.toBase58() ===
          anchor.utils.token.TOKEN_PROGRAM_ID.toBase58()
        ) {
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
        }
      }

      if (!isSystemAccount && !isUsdcTokenAccount) {
        throw new Error(
          'Destination is not a valid Solana address or USDC account',
        )
      }
      console.log('we here')
      console.log('NINA_CLIENT_IDS[this.cluster].mints.usdc', NINA_CLIENT_IDS[this.cluster].mints.usdc)
      const [fromUsdcTokenAccount, fromUsdcTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
        )
        console.log('we here 2')

      if (isSystemAccount) {
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
      } else {
        toUsdcTokenAccount = new anchor.web3.PublicKey(destination)
      }
      console.log('we here 3')

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

      const tx = new anchor.web3.Transaction()
      for (const instruction of instructions) {
        tx.add(instruction)
      }
      tx.add(transferInstruction)
      
      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection,
      )

      await getConfirmTransaction(txid, this.provider.connection)

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
