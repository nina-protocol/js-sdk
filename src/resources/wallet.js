import * as anchor from '@project-serum/anchor';
import axios from 'axios';
import { NINA_CLIENT_IDS, findOrCreateAssociatedTokenAccount, uiToNative } from '../utils';

export default class Wallet {
  constructor({ provider }) {
    this.provider = provider;
  }

  async getSolPrice() {
    try {
      const priceResult = await axios.get(
        `https://price.jup.ag/v4/price?ids=SOL`
      )
      return priceResult.data.data.SOL.price
    } catch (error) {
      return error
    }
  }
  
  async getUsdcBalanceForPublicKey(publicKey) {
    let usdc = 0
    if (publicKey) {
      try {
        let [usdcTokenAccountPubkey] = await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          new anchor.web3.PublicKey(publicKey),
          new anchor.web3.PublicKey(publicKey),
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          new anchor.web3.PublicKey(ids.mints.usdc)
        )
        if (usdcTokenAccountPubkey) {
          let usdcTokenAccount =
            await this.provider.connection.getTokenAccountBalance(
              usdcTokenAccountPubkey
            )
          return usdcTokenAccount.value.uiAmount.toFixed(4)
        } else {
          return 0
        }
      } catch (error) {
        console.warn('error getting usdc balance')
      }
    } else {
      return 0
    }
    return usdc
  }
  
  async getSolBalanceForPublicKey(publicKey) {
    let solUsdcBalanceResult = await this.provider.connection.getBalance(
      new anchor.web3.PublicKey(publicKey)
    )
    return solUsdcBalanceResult
  }

  async sendUsdc(amount, destination) {
    try {
      const destinationInfo = await this.provider.connection.getAccountInfo(
        new anchor.web3.PublicKey(destination)
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
        if (destinationInfo.owner.toBase58() === anchor.utils.token.TOKEN_PROGRAM_ID.toBase58()) {
          const tokenAccount = await getAccount(
            provider.connection,
            new anchor.web3.PublicKey(destination)
          )
          if (tokenAccount.mint.toBase58() === ids.mints.usdc) {
            isUsdcTokenAccount = true
          }
        }
      }

      if (!isSystemAccount && !isUsdcTokenAccount) {
        throw new Error(
          'Destination is not a valid Solana address or USDC account'
        )
      }

      let [fromUsdcTokenAccount, fromUsdcTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          new anchor.web3.PublicKey(NINA_CLIENT_IDS[process.env.SOLANA_CLUSTER].mints.usdc)
        )

      isSystemAccount
        ? ([toUsdcTokenAccount, toUsdcTokenAccountIx] =
            await findOrCreateAssociatedTokenAccount(
              provider.connection,
              provider.wallet.publicKey,
              new anchor.web3.PublicKey(destination),
              anchor.web3.SystemProgram.programId,
              anchor.web3.SYSVAR_RENT_PUBKEY,
              new anchor.web3.PublicKey(NINA_CLIENT_IDS[process.env.SOLANA_CLUSTER].mints.usdc)
            ))
        : (toUsdcTokenAccount = new anchor.web3.PublicKey(destination))

      const tokenProgram = anchor.Spl.token({
        provider,
      })

      const instructions = []

      if (fromUsdcTokenAccountIx) {
        instructions.push(fromUsdcTokenAccountIx)
      }

      if (toUsdcTokenAccountIx) {
        instructions.push(toUsdcTokenAccountIx)
      }

      const tx = await tokenProgram.methods
        .transfer(new anchor.BN(uiToNative(amount, NINA_CLIENT_IDS[process.env.SOLANA_CLUSTER].mints.usdc)))
        .accounts({
          source: fromUsdcTokenAccount,
          destination: toUsdcTokenAccount,
          authority: provider.wallet.publicKey,
        })
        .preInstructions(instructions)
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey
    
      const txid = await this.provider.wallet.sendTransaction(
        tx,
        provider.connection
      )

      await getConfirmTransaction(txid, provider.connection)

      return {
        success: true,
        txid
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
    let tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        new anchor.web3.PublicKey(accountPublicKey),
        { programId: anchor.utils.token.TOKEN_PROGRAM_ID.toBase58() }
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
