import * as anchor from '@coral-xyz/anchor';
import { createSyncNativeInstruction } from '@solana/spl-token'
import { Buffer } from 'buffer'
import promiseRetry from 'promise-retry'

const USDC_DECIMAL_AMOUNT = 6
const SOL_DECIMAL_AMOUNT = 9

export const MAX_U64 = '18446744073709551615'
const PRIORITY_SWAP_FEE = 7500

export const NinaProgramAction = {
  HUB_ADD_COLLABORATOR: 'HUB_ADD_COLLABORATOR',
  HUB_ADD_RELEASE: 'HUB_ADD_RELEASE',
  HUB_INIT_WITH_CREDIT: 'HUB_INIT_WITH_CREDIT',
  HUB_UPDATE: 'HUB_UPDATE',
  POST_INIT_VIA_HUB_WITH_REFERENCE_RELEASE:
    'POST_INIT_VIA_HUB_WITH_REFERENCE_RELEASE',
  POST_INIT_VIA_HUB: 'POST_INIT_VIA_HUB',
  RELEASE_INIT_VIA_HUB: 'RELEASE_INIT_VIA_HUB',
  RELEASE_INIT_WITH_CREDIT: 'RELEASE_INIT_WITH_CREDIT',
  RELEASE_PURCHASE: 'RELEASE_PURCHASE',
  RELEASE_PURCHASE_VIA_HUB: 'RELEASE_PURCHASE_VIA_HUB',
  EXCHANGE_INIT: 'EXCHANGE_INIT',
  EXCHANGE_ACCEPT: 'EXCHANGE_ACCEPT',
  CONNECTION_CREATE: 'CONNECTION_CREATE',
  SUBSCRIPTION_SUBSCRIBE_HUB: 'SUBSCRIPTION_SUBSCRIBE_HUB',
  SUBSCRIPTION_SUBSCRIBE_ACCOUNT: 'SUBSCRIPTION_SUBSCRIBE_ACCOUNT',
}

export const NinaProgramActionCost = {
  HUB_ADD_COLLABORATOR: 0.001919,
  HUB_ADD_RELEASE: 0.00368684,
  HUB_INIT: 0.00923396,
  HUB_INIT_WITH_CREDIT: 0.00923396,
  HUB_UPDATE: 0.000005,
  POST_INIT_VIA_HUB_WITH_REFERENCE_RELEASE: 0.01140548,
  POST_INIT_VIA_HUB: 0.00772364,
  RELEASE_INIT_VIA_HUB: 0.03212192,
  RELEASE_INIT: 0.03047936,
  RELEASE_INIT_WITH_CREDIT: 0.03047936,
  RELEASE_PURCHASE: 0.00204428,
  RELEASE_PURCHASE_VIA_HUB: 0.00204428,
  EXCHANGE_INIT: 0.0051256,
  EXCHANGE_ACCEPT: 0.00377536,
  CONNECTION_CREATE: 0.009535238,
  SUBSCRIPTION_SUBSCRIBE_HUB: 0.00173804,
  SUBSCRIPTION_SUBSCRIBE_ACCOUNT: 0.00168236,
}

export const hasBalanceForAction = (action, balance) => {
  const cost = NinaProgramActionCost[action]

  return balance >= cost
}

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

  return mint === NINA_CLIENT_IDS[cluster || 'mainnet'].mints.wsol
}

export const isUsdc = (mint, cluster) => {
  if (typeof mint !== 'string') {
    return mint.toBase58() === NINA_CLIENT_IDS[cluster || 'mainnet'].mints.usdc
  }

  return mint === NINA_CLIENT_IDS[cluster || 'mainnet'].mints.usdc
}

export const findAssociatedTokenAddress = async (
  ownerAddress,
  tokenMintAddress,
) =>
  (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        ownerAddress.toBuffer(),
        anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    )
  )[0]

export const findOrCreateAssociatedTokenAccount = async (
  connection,
  payer,
  owner,
  systemProgramId,
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
        pubkey: anchor.utils.token.TOKEN_PROGRAM_ID,
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
      programId: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      data: Buffer.from([]),
    })

    return [associatedTokenAddress, ix]
  }

  return [associatedTokenAddress, undefined]
}

export const getLatestBlockhashWithRetry = async (connection) => {
  const res = await promiseRetry(
    async (retry) => {
      const latestBlockhash = await connection.getLatestBlockhashAndContext('finalized')
      if (!latestBlockhash) {
        const error = new Error('Failed to get recent blockhash')

        retry(error)

        return
      }

      return latestBlockhash
    },
    {
      retries: 10,
      minTimeout: 500,
      maxTimeout: 1000,
    },
  )
  if (!res?.value?.blockhash) {
    throw new Error('Failed to get recent blockhash')
  }

  return res.value
}

export const simulateWithRetry = async (simulateFunction) => {
  let attempts = 0
  const res = await promiseRetry(
    async (retry) => {
      attempts += 1
      const result = await simulateFunction
      if (!result || result.value?.err) {
        const error = new Error('Failed to simulate')

        retry(error)

        return
      }

      return result
    }, {
      retries: 10,
      minTimeout: 500,
      maxTimeout: 1000,
    }
  )
  if (!res) {
    throw new Error('Failed to simulate')
  }

  return res
}

export const fetchWithRetry = async (fetchFunction) => {
  let attempts = 0
  const res = await promiseRetry(
    async (retry) => {
      attempts += 1
      const result = await fetchFunction
      if (!result || result.message?.includes('not found')) {
        const error = new Error('Failed to fetch')

        retry(error)

        return
      }

      return result
    }, {
      retries: 10,
      minTimeout: 500,
      maxTimeout: 1000,
    }
  )
  if (!res) {
    throw new Error('Failed to fetch')
  }

  return res
}


export const getConfirmTransaction = async (txid, connection) => {
  const res = await promiseRetry(
    async (retry) => {
      const txResult = await connection.getTransaction(txid, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
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
      retries: 10,
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
    case NINA_CLIENT_IDS[cluster || 'mainnet'].mints.usdc:
      return USDC_DECIMAL_AMOUNT
    case NINA_CLIENT_IDS[cluster || 'mainnet'].mints.wsol:
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

export const wrapSol = async (connection, publicKey, amount, mint) => {
  const wrappedSolInstructions = []

  const [wrappedSolAccount, wrappedSolAccountIx] =
    await findOrCreateAssociatedTokenAccount(
      connection,
      new anchor.web3.PublicKey(publicKey),
      new anchor.web3.PublicKey(publicKey),
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      mint,
    )

  if (wrappedSolAccountIx) {
    wrappedSolInstructions.push(wrappedSolAccountIx)
  }

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

export const readFileChunked = (file, chunkCallback, endCallback) => {
  const chunkSize = 1024 * 1024 * 10 // 10MB
  const fileSize = file.size
  let offset = 0

  const reader = new FileReader()

  const readNext = () => {
    const slice = file.slice(offset, offset + chunkSize)
    reader.readAsBinaryString(slice)
  }

  reader.onload = () => {
    if (reader.error) {
      console.warn(reader.error)
      endCallback(reader.error || {})

      return
    }

    offset += reader.result.length
    chunkCallback(reader.result, offset, fileSize)

    if (offset >= fileSize) {
      endCallback()

      return
    }

    readNext()
  }

  reader.onerror = (err) => {
    console.warn(err)
    endCallback(err || {})
  }

  readNext()
}

export const addPriorityFeeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice(
  {
    microLamports: PRIORITY_SWAP_FEE,
  },
)
