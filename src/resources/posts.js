import {
  decodeNonEncryptedByteArray,
  getConfirmTransaction,
} from '../utils'
import UploaderNode from './uploaderNode';
import Uploader from './uploader';
import * as anchor from '@project-serum/anchor'
import MD5 from 'crypto-js/md5'

/**
 * @module Post
 */
export default class Post {
  constructor({ http, provider, program }) {
    this.http = http
    this.provider = provider
    this.program = program
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
  async fetch(publicKey, withAccountData = false) {
    return this.http.get(`/posts/${publicKey}`, undefined, withAccountData)
  }

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
  ) {
    try {
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
      
      if (!ninaUploader.hasBalanceForFiles([...images])) {
        throw new Error('Insufficient upload balance for files')
      }

      for (const image of [...images]) {
        console.log('image', image.file)
        if (!ninaUploader.isValidArtworkFile(image)) {
          throw new Error('Invalid image file')
        }
      }

      const totalFiles = images.length + 1
      // const heroImageTx = await ninaUploader.uploadFile(heroImage, 0, totalFiles)
      const imageBlocks = []
      for await (const image of images) {
        const imageTx = await ninaUploader.uploadFile(image, images.length + 1, totalFiles)
        imageBlocks.push({
          index: imageMap[image.name].index,
          type: 'image',
          data: {
            caption: imageMap[image.name].caption,
            altText: imageMap[image.name].altText,
            image: `https://www.arweave.net/${imageTx}`
          }
        })
      }

      const formattedBlocks = []

      blocks.forEach(block => {
        if (block.type === 'image') {
          const blockForIndex = imageBlocks.find(imageBlock => imageBlock.index === block.index)
          if (blockForIndex) {
            formattedBlocks.push(blockForIndex)
          }
        } else {
          formattedBlocks.push(block)
        }
      })

        
      const data = {
        title,
        heroImage: `https://www.arweave.net/heroImageTx`,
        subhead,
        hub: hubPublicKeyString,
        description,
        date,
        tags,
        blocks: formattedBlocks,
      }

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

      const handle = decodeNonEncryptedByteArray(hub.handle)
      const params = [handle, slugHash, `https://arweave.net/${dataTx}}`]
      const request = {
        accounts: {
          author: new anchor.web3.PublicKey(authority),
          payer: this.provider.wallet.publicKey,
          hub: hubPublicKey,
          post,
          hubPost,
          hubContent,
          hubCollaborator,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
      console.log('params', params)
      console.log('request', request)
      let tx = await this.program.methods.postInitViaHub(
          handle,
          slugHash,
          `https://arweave.net/${dataTx}}`
        )
        .accounts(request.accounts)
        .transaction()

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash
      tx.feePayer = this.provider.wallet.publicKey
      console.log('tx', tx)
      const signedTx = await this.provider.wallet.signTransaction(tx);
      const txid = await this.provider.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      });
      console.log('txid', txid)
      await getConfirmTransaction(txid, this.provider.connection)
      return {
        success: true,
        post: post.toBase58(),
        msg: 'Post created.',
      }
    } catch (error) {
      return {
        success: false,
        error,
      }
    }
  }
}
