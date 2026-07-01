import * as anchor from '@coral-xyz/anchor';
import MD5 from 'crypto-js/md5';
import { addPriorityFeeIx, calculatePriorityFee, decodeNonEncryptedByteArray, fetchWithRetry, getConfirmTransaction, getLatestBlockhashWithRetry, simulateWithRetry, sleep } from '../utils';
import Uploader from './uploader';
import UploaderNode from './uploaderNode'

/**
 * @module Post
 */
export default class Post {
  constructor({ http, provider, program, isNode, cluster }) {
    this.http = http
    this.provider = provider
    this.program = program
    this.isNode = isNode
    this.cluster = cluster
  }

  /**
   * @function fetchAll
   * @description Fetches all Posts.
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Post accounts.
   * @example const posts = await NinaClient.Post.fetchAll();
   * @returns {Array} an array of all of the Posts on Nina.
   */
  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination

    return this.http.get(
      '/posts',
      {
        limit: limit || 20,
        offset: offset || 0,
        sort: sort || 'desc',
        ...pagination,
      },
      withAccountData,
    )
  }

  /**
   * @function fetch
   * @description Fetches a Post.
   * @param {String} publicKey - The public key of the Post.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Post account.
   * @param {Object} [pagination = {limit, offset, sort}] Pagination options.
   * @example const post = await NinaClient.Post.fetch("K8XJr7LHWJeJJARTvnsFZViqxBzyDSjsfpS6iBuWhrV")
   * @returns {Object} an object containing the Post's data.
   */
  async fetch(publicKey, params = {}, withAccountData = false) {
    return this.http.get(`/posts/${publicKey}`, params, withAccountData)
  }

  // TODO: this method does not use the asTx pattern yet
  async postInit(
    authority,
    title,
    subhead,
    description,
    date,
    tags,
    blocks,
    imageMap,
    slug,
    heroImage,
    images,
    hubPublicKeyString,
    simulate=false
  ) {
    try {
      if (simulate) {
        const simulationResponse = await simulateWithRetry(this.simulatePostInit({
          authority,
          slug,
          hubPublicKeyString,
        }))

        if (simulationResponse?.value?.err) {
          console.log('simulationResponse', simulationResponse)
          throw new Error('Error while simulating Post Init')
        }
      }

      let ninaUploader

      if (this.isNode) {
        ninaUploader = new UploaderNode()
      } else {
        ninaUploader = new Uploader()
      }

      ninaUploader = await ninaUploader.init({
        provider: this.provider,
        endpoint: this.http.endpoint,
        cluster: this.cluster,
      });

      if (images?.length > 0) {
        if (!ninaUploader.hasBalanceForFiles([...images])) {
          throw new Error('Insufficient upload balance for files')
        }

        for (const image of [...images]) {
          if (!ninaUploader.isValidArtworkFile(image)) {
            throw new Error('Invalid image file')
          }
        }
      }

      let totalFiles = (images?.length || 0) + 1
      let heroImageTx = null

      if (heroImage) {
        totalFiles += 1
        heroImageTx = await ninaUploader.uploadFile(heroImage, 0, totalFiles)
      }

      const imageBlocks = []

      if (images?.length > 0) {
        for await (const image of images) {
          const imageTx = await ninaUploader.uploadFile(image, images?.length + 1, totalFiles)
          imageBlocks.push({
            index: imageMap[image.originalname].blockIndex,
            type: 'image',
            data: {
              caption: imageMap[image.originalname].caption,
              altText: imageMap[image.originalname].altText,
              image: `https://www.arweave.net/${imageTx}`
            }
          })
        }
      }

      const formattedBlocks = []
      blocks.forEach((block) => {
        if (block.type === 'image') {
          const blockForIndex = imageBlocks.find((imageBlock) => imageBlock.index === block.index)

          if (blockForIndex) {
            formattedBlocks.push(blockForIndex)
          }
        } else {
          formattedBlocks.push(block)
        }
      })

      const checkIfSlugIsValid = async (slug) => {
        try {
          const postForSlug = await this.http.get(`/posts/${slug}`)

          if (postForSlug) {
            slug = `${slug}-${Math.floor(Math.random() * 1000000)}`
          }

          const postForNewSlug = await this.http.get(`/posts/${slug}`)

          if (postForNewSlug) {
            await checkIfSlugIsValid(slug)
          }

          return slug
        } catch (error) {
          // console.log('error', error)
          return slug
        }
      }

      slug = await checkIfSlugIsValid(slug)

      const data = {
        title,
        heroImage: `https://www.arweave.net/${heroImageTx}`,
        slug,
        subhead,
        hub: hubPublicKeyString,
        description,
        date,
        tags,
        blocks: formattedBlocks,
      }
      console.log('data', data)
      const dataBuffer = await ninaUploader.convertMetadataJSONToBuffer(data)
      const dataTx = await ninaUploader.uploadFile(dataBuffer, totalFiles - 1, totalFiles, 'data.json')
      const hubPublicKey = new anchor.web3.PublicKey(hubPublicKeyString)
      const hub = await this.program.account.hub.fetch(hubPublicKey)
      const slugHash = MD5(slug).toString().slice(0, 32)

      const [post] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
          hubPublicKey.toBuffer(),
          Buffer.from(anchor.utils.bytes.utf8.encode(slugHash)),
        ],
        this.program.programId
      )

      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId
      )

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId
      )

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          new anchor.web3.PublicKey(authority).toBuffer(),
        ],
        this.program.programId
      )

      const priorityFee = await calculatePriorityFee(this.provider.connection)
      const priorityFeeIx = addPriorityFeeIx(priorityFee)
      const handle = decodeNonEncryptedByteArray(hub.handle)
      console.log('priorityFee', priorityFee)
      const request = {
        accounts: {
          payer: this.provider.wallet.publicKey,
          author: new anchor.web3.PublicKey(authority),
          hub: hubPublicKey,
          post,
          hubPost,
          hubContent,
          hubCollaborator,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        instructions: [priorityFeeIx],
      }
      console.log('request', request)
      const postInitIx = await this.program.methods.postInitViaHub(
          handle,
          slugHash,
          `https://arweave.net/${dataTx}`
        )
        .accounts(request.accounts)
        .instruction()
      const instructions = [priorityFeeIx, postInitIx]
      const latestBlockhash = await this.provider.connection.getLatestBlockhashAndContext()
      const lastValidBlockHeight = latestBlockhash.context.slot + 150

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
      const rawTx = signedTx.serialize()
      let blockheight = await this.provider.connection.getBlockHeight();

      let txid
      let attempts = 0
      while (blockheight < lastValidBlockHeight && !txid && attempts < 50) {
        try {
          attempts+=1
          const tx = await this.provider.connection.sendRawTransaction(rawTx);
          console.log('tx', tx)
          await getConfirmTransaction(tx, this.provider.connection)
          txid = tx
        } catch (error) {
          console.log('failed attempted to send post init tx: ', error)
          await sleep(500)
          blockheight = await this.provider.connection.getBlockHeight();
          console.log('failed attempted to send post init tx, retrying from blockheight: ', blockheight)
        }
      }
      await getConfirmTransaction(txid, this.provider.connection)
      await sleep(3000)
      await fetchWithRetry(this.fetch(post.toBase58(), { txid }))

      return {
        success: true,
        postPublicKey: post.toBase58(),
        msg: 'Post created.',
      }
    } catch (error) {
      console.error('postInit: ', error)

      return {
        success: false,
        error,
      }
    }
  }

  async simulatePostInit({
    authority,
    slug,
    hubPublicKeyString,
  }) {
    try {
      slug = slug
        .normalize('NFKD')
        .replace(/[\u0300-\u036F]/g, '') // remove accents and convert to closest ascii equivalent
        .toLowerCase() // convert to lowercase
        .replace('-', '') // remove hyphens
        .replace(/  +/g, ' ') // remove spaces
        .replace(/ /g, '-') // replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-]/g, '') // remove non-alphanumeric characters
        .replace(/--+/g, '') // remove spaces
        .replace(/-$/, '') // remove trailing hyphens

      const checkIfSlugIsValid = async (slug) => {
        try {
          const postForSlug = await this.http.get(`/posts/${slug}`)

          if (postForSlug) {
            slug = `${slug}-${Math.floor(Math.random() * 1000000)}`
          }

          const postForNewSlug = await this.http.get(`/posts/${slug}`)

          if (postForNewSlug) {
            await checkIfSlugIsValid(slug)
          }

          return slug
        } catch (error) {
          // console.log('error', error)
          return slug
        }
      }

      slug = await checkIfSlugIsValid(slug)

      const hubPublicKey = new anchor.web3.PublicKey(hubPublicKeyString)
      const hub = await this.program.account.hub.fetch(hubPublicKey)
      const slugHash = MD5(slug).toString().slice(0, 32)

      const [post] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-post')),
          hubPublicKey.toBuffer(),
          Buffer.from(anchor.utils.bytes.utf8.encode(slugHash)),
        ],
        this.program.programId
      )

      const [hubPost] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-post')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId
      )

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-content')),
          hubPublicKey.toBuffer(),
          post.toBuffer(),
        ],
        this.program.programId
      )

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
          hubPublicKey.toBuffer(),
          new anchor.web3.PublicKey(authority).toBuffer(),
        ],
        this.program.programId
      )

      const handle = decodeNonEncryptedByteArray(hub.handle)

      const request = {
        accounts: {
          payer: this.provider.wallet.publicKey,
          author: new anchor.web3.PublicKey(authority),
          hub: hubPublicKey,
          post,
          hubPost,
          hubContent,
          hubCollaborator,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }

      const tx = await this.program.methods.postInitViaHub(
          handle,
          slugHash,
          `https://arweave.net/simulated-data-tx`
        )
        .accounts(request.accounts)
        .transaction()

      const latestBlockhash = await getLatestBlockhashWithRetry(this.provider.connection)
      tx.recentBlockhash = latestBlockhash.blockhash
      tx.feePayer = this.provider.wallet.publicKey
      const signedTx = await this.provider.wallet.signTransaction(tx);
      const simulationResponse = await this.provider.connection.simulateTransaction(signedTx);

      return simulationResponse
    } catch (error) {
      console.error('simulatePostInit', error)

      return {
        error,
      }
    }
  }
}
