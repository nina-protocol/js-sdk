import * as anchor from '@project-serum/anchor'

export const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  anchor.utils.token.TOKEN_PROGRAM_ID.toString()
)

const ASSOCIATED_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  anchor.utils.token.ASSOCIATED_PROGRAM_ID.toString()
)

export const findOrCreateAssociatedTokenAccount = async (
  connection,
  payer,
  owner,
  systemProgramId,
  clockSysvarId,
  splTokenMintAddress,
  skipLookup = false
) => {
  const associatedTokenAddress = await findAssociatedTokenAddress(
    owner,
    splTokenMintAddress
  )

  let userAssociatedTokenAddress = null
  if (!skipLookup) {
    userAssociatedTokenAddress = await connection.getAccountInfo(
      associatedTokenAddress
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
  } else {
    return [associatedTokenAddress, undefined]
  }
}

export const findAssociatedTokenAddress = async (
  ownerAddress,
  tokenMintAddress
) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        ownerAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0]
}

export const getUsdcBalance = async (publicKey, connection) => {
  if (publicKey) {
    try {

      let [usdcTokenAccountPubkey] = await findOrCreateAssociatedTokenAccount(
        connection,
        publicKey,
        publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        new anchor.web3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      )

      if (usdcTokenAccountPubkey) {
        let usdcTokenAccount =
          await connection.getTokenAccountBalance(
            usdcTokenAccountPubkey
          )
        return usdcTokenAccount.value.uiAmount.toFixed(2)
      } else {
        return 0
      }
    } catch (error) {
      console.warn('error getting usdc balance: ', error)
      return 0
    }
  } else {
    return 0
  }
}