import * as anchor from '@coral-xyz/anchor';
import { getAccount } from '@solana/spl-token'
import axios from 'axios'
import {
  NINA_CLIENT_IDS,
  findOrCreateAssociatedTokenAccount,
  getConfirmTransaction,
  uiToNative,
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

  async getUsdcBalanceForPublicKey(publicKey) {
    const usdc = 0

    if (publicKey) {
      try {
        const [usdcTokenAccountPubkey] =
          await findOrCreateAssociatedTokenAccount(
            this.provider.connection,
            new anchor.web3.PublicKey(publicKey),
            new anchor.web3.PublicKey(publicKey),
            anchor.web3.SystemProgram.programId,
            anchor.web3.SYSVAR_RENT_PUBKEY,
            new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
          )

        if (usdcTokenAccountPubkey) {
          const usdcTokenAccount =
            await this.provider.connection.getTokenAccountBalance(
              usdcTokenAccountPubkey,
            )

          return usdcTokenAccount.value.uiAmount.toFixed(4)
        }

        return 0
      } catch (error) {
        console.warn('error getting usdc balance')
      }
    } else {
      return 0
    }

    return usdc
  }

  async getSolBalanceForPublicKey(publicKey) {
    const solUsdcBalanceResult = await this.provider.connection.getBalance(
      new anchor.web3.PublicKey(publicKey),
    )

    return solUsdcBalanceResult
  }

  async sendUsdc(amount, destination) {
    try {
      const destinationInfo = await this.provider.connection.getAccountInfo(
        new anchor.web3.PublicKey(destination),
      )

      let isSystemAccount = false
      let isUsdcTokenAccount = false
      let toUsdcTokenAccount = null
      let toUsdcTokenAccountIx = null

      if (
        destinationInfo.owner.toBase58() ===
        anchor.web3.SystemProgram.programId.toBase58()
      ) {
        isSystemAccount = true
      }

      if (!isSystemAccount) {
        if (
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

      const [fromUsdcTokenAccount, fromUsdcTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
        )

      if (isSystemAccount) {
        const [_toUsdcTokenAccount, _toUsdcTokenAccountIx] =
          await findOrCreateAssociatedTokenAccount(
            this.provider.connection,
            this.provider.wallet.publicKey,
            new anchor.web3.PublicKey(destination),
            anchor.web3.SystemProgram.programId,
            anchor.web3.SYSVAR_RENT_PUBKEY,
            new anchor.web3.PublicKey(NINA_CLIENT_IDS[this.cluster].mints.usdc),
          )

        toUsdcTokenAccount = _toUsdcTokenAccount
        toUsdcTokenAccountIx = _toUsdcTokenAccountIx
      } else {
        toUsdcTokenAccount = new anchor.web3.PublicKey(destination)
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
