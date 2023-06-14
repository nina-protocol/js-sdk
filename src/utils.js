import * as anchor from '@project-serum/anchor'
import { createSyncNativeInstruction } from '@solana/spl-token'
import { Buffer, Uint8Array } from 'buffer'
import promiseRetry from 'promise-retry'
import { TextDecoder } from 'util'

const USDC_DECIMAL_AMOUNT = 6
const SOL_DECIMAL_AMOUNT = 9

export const MAX_U64 = '18446744073709551615'

export const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  anchor.utils.token.TOKEN_PROGRAM_ID.toString(),
)

const ASSOCIATED_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  anchor.utils.token.ASSOCIATED_PROGRAM_ID.toString(),
)

export const NINA_CLIENT_IDS = {
  mainnet: {
    programs: {
      metaplex: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    },
    mints: {
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      wsol: 'So11111111111111111111111111111111111111112',
    },
  },
  devnet: {
    programs: {
      metaplex: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    },
    mints: {
      usdc: 'J8Kvy9Kjot83DEgnnbK55BYbAK9pZuyYt4NBGkEJ9W1K',
      wsol: 'So11111111111111111111111111111111111111112',
    },
  },
}

export const isSol = (mint, cluster) => {
  if (typeof mint !== 'string') {
    return mint.toBase58() === NINA_CLIENT_IDS[cluster].mints.wsol
  }

  return mint === NINA_CLIENT_IDS[cluster].mints.wsol
}

export const isUsdc = (mint, cluster) => {
  if (typeof mint !== 'string') {
    return mint.toBase58() === NINA_CLIENT_IDS[cluster].mints.usdc
  }

  return mint === NINA_CLIENT_IDS[cluster].mints.usdc
}

export const findAssociatedTokenAddress = async (
  ownerAddress,
  tokenMintAddress,
) =>
  (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        ownerAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  )[0]

export const findOrCreateAssociatedTokenAccount = async (
  connection,
  payer,
  owner,
  systemProgramId,
  clockSysvarId,
  splTokenMintAddress,
  skipLookup = false,
) => {
  const associatedTokenAddress = await findAssociatedTokenAddress(
    owner,
    splTokenMintAddress,
  )

  let userAssociatedTokenAddress = null

  if (!skipLookup) {
    userAssociatedTokenAddress = await connection.getAccountInfo(
      associatedTokenAddress,
    )
  }

  if (!userAssociatedTokenAddress) {
    const keys = [
      {
        pubkey: payer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: associatedTokenAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: owner,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: splTokenMintAddress,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: systemProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ]

    const ix = new anchor.web3.TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from([]),
    })

    return [associatedTokenAddress, ix]
  }

  return [associatedTokenAddress, undefined]
}

export const getConfirmTransaction = async (txid, connection) => {
  const res = await promiseRetry(
    async (retry) => {
      const txResult = await connection.getTransaction(txid, {
        commitment: 'confirmed',
      })

      if (!txResult) {
        const error = new Error('unable_to_confirm_transaction')
        error.txid = txid

        retry(error)

        return
      }

      return txResult
    },
    {
      retries: 5,
      minTimeout: 500,
      maxTimeout: 1000,
    },
  )

  if (res.meta.err) {
    throw new Error('Transaction failed')
  }

  return txid
}

export const decimalsForMint = (mint, cluster) => {
  switch (typeof mint === 'string' ? mint : mint.toBase58()) {
    case NINA_CLIENT_IDS[cluster].mints.usdc:
      return USDC_DECIMAL_AMOUNT
    case NINA_CLIENT_IDS[cluster].mints.wsol:
      return SOL_DECIMAL_AMOUNT
    default:
      return undefined
  }
}

export const nativeToUi = (amount, mint, cluster) =>
  amount / Math.pow(10, decimalsForMint(mint, cluster))

export const uiToNative = (amount, mint, cluster) =>
  Math.round(amount * Math.pow(10, decimalsForMint(mint, cluster)))

export const decodeNonEncryptedByteArray = (byteArray) =>
  new TextDecoder().decode(new Uint8Array(byteArray)).replaceAll(/\\u0000/g, '')

export const createMintInstructions = async (
  provider,
  authority,
  mint,
  decimals,
) => {
  const tokenProgram = anchor.Spl.token(provider)
  const systemProgram = anchor.Native.system(provider)

  const mintSize = tokenProgram.coder.accounts.size(
    tokenProgram.idl.accounts[0],
  )

  const mintRentExemption =
    await provider.connection.getMinimumBalanceForRentExemption(mintSize)

  const instructions = [
    await systemProgram.methods
      .createAccount(
        new anchor.BN(mintRentExemption),
        new anchor.BN(mintSize),
        tokenProgram.programId,
      )
      .accounts({
        from: authority,
        to: mint,
      })
      .instruction(),
    await tokenProgram.methods
      .initializeMint(decimals, authority, null)
      .accounts({
        mint,
      })
      .instruction(),
  ]

  return instructions
}

export const nativeToUiString = (
  amount,
  mint,
  cluster,
  decimalOverride = false,
  showCurrency = true,
) => {
  let amountString = nativeToUi(amount, mint, cluster).toFixed(
    isUsdc(mint, cluster) || decimalOverride ? 2 : 3,
  )

  if (showCurrency) {
    amountString = `${isUsdc(mint, cluster) ? '$' : ''}${amountString} ${
      isUsdc(mint, cluster) ? 'USDC' : 'SOL'
    }`
  }

  return amountString
}

export const wrapSol = async (provider, amount, mint, publicKey) => {
  const wrappedSolInstructions = []

  const [wrappedSolAccount] = await findOrCreateAssociatedTokenAccount(
    provider.connection,
    new anchor.web3.PublicKey(publicKey),
    new anchor.web3.PublicKey(publicKey),
    anchor.web3.SystemProgram.programId,
    anchor.web3.SYSVAR_RENT_PUBKEY,
    mint,
  )

  const wrappedSolTransferIx = anchor.web3.SystemProgram.transfer({
    fromPubkey: new anchor.web3.PublicKey(publicKey),
    toPubkey: wrappedSolAccount,
    lamports: new anchor.BN(amount),
  })

  // sync wrapped SOL balance
  const syncNativeIx = createSyncNativeInstruction(wrappedSolAccount)
  wrappedSolInstructions.push(wrappedSolTransferIx, syncNativeIx)

  return [wrappedSolAccount, wrappedSolInstructions]
}

export default {
  NINA_CLIENT_IDS,
  decimalsForMint,
  nativeToUi,
  uiToNative,
  decodeNonEncryptedByteArray,
  createMintInstructions,
  isUsdc,
  isSol,
  nativeToUiString,
  MAX_U64,
  wrapSol,
}
