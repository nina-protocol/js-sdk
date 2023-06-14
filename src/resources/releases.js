import * as anchor from "@project-serum/anchor";
import {
  findOrCreateAssociatedTokenAccount,
  createMintInstructions,
  uiToNative,
  decodeNonEncryptedByteArray,
  getConfirmTransaction,
  TOKEN_PROGRAM_ID,
  wrapSol,
  isSol,
} from "../utils";
import axios from "axios";
const MAX_INT = "18446744073709551615";

/**
 * @module Release
 */

export default class Release {
  constructor({ program, provider, http, cluster }) {
    this.program = program;
    this.provider = provider;
    this.http = http;
    this.cluster = cluster;
  }
  /**
   * @function fetchAll
   * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
   * @param {Boolean} [withAccountData = false] Fetch full on-chain Release accounts.
   * @example const releases = await NinaClient.Release.fetchAll();
   * @returns {Array} an array of all of the Releases on Nina.
   */
  async fetchAll(pagination = {}, withAccountData = false) {
    const { limit, offset, sort } = pagination;

    return this.http.get(
      "/releases",
      {
        limit: limit || 20,
        offset: offset || 0,
        sort: sort || "desc",
      },
      withAccountData
    );
  }

  /**
   * @function fetch
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Release account and include in the response object.
   * @example const release = await NinaClient.Release.fetch("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Object} an object containing the Release data.
   */

  async fetch(publicKey, withAccountData = false) {
    return this.http.get(`/releases/${publicKey}`, undefined, withAccountData);
  }

  /**
   * @function fetchCollectors
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withCollection = false] - A boolean determining wether or not to fetch collectors' collections and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const collectors = await NinaClient.Release.fetchCollectors("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the collectors of a Release.
   */

  async fetchCollectors(publicKey, withCollection = false) {
    return this.http.get(
      `/releases/${publicKey}/collectors${
        withCollection ? "?withCollection=true" : ""
      }`
    );
  }

  /**
   * @function fetchHubs
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Hub account and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const hubs = await NinaClient.Release.fetchHubs("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Hubs that a Release belongs to.
   */

  async fetchHubs(publicKey, withAccountData = false) {
    return this.http.get(
      `/releases/${publicKey}/hubs`,
      undefined,
      withAccountData
    );
  }

  /**
   * @function fetchExchanges
   * @param {String} publicKey - The public key of the release.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Exchange account and include in the response object.
   * @example const exchanges = await NinaClient.Release.fetchExchanges("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Exchanges that belong to a Release.
   */

  async fetchExchanges(publicKey, pagination, withAccountData = false) {
    return this.http.get(
      `/releases/${publicKey}/exchanges`,
      pagination,
      withAccountData
    );
  }

  /**
   * @function fetchRevenueShareRecipients
   * @param {String} publicKey - The public key of the release.
   * @param {Boolean} [withAccountData = false] - A boolean determining wether or not to fetch the full on-chain data for the Release account and royalty recipients and include in the response object.
   * @param {Object} [pagination = {limit, offset, sort}] - Pagination options.
   * @example const revenueShareRecipients = await fetchRevenueShareRecipients("4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ");
   * @returns {Array} an array of all of the Revenue Share Recipients that belong to a Release.
   */

  async fetchRevenueShareRecipients(publicKey, withAccountData = false) {
    return this.http.get(
      `/releases/${publicKey}/revenueShareRecipients`,
      undefined,
      withAccountData
    );
  }

  /**
   *
   * @function purchaseViaHub
   * @description Purchases a Release from a Hub.
   * @param {String} releasePublicKey - The public key of the Release.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @example const transactionId = await purchaseViaHub(client, "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW", "2CMyS4k6HQvLVdA2DxB6em3izhNw7uq2hzX7E4f7UJ3f");
   * @returns {Object} the Release that was purchased.
   */

  async purchaseViaHub(releasePublicKey, hubPublicKey) {
    try {
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

      const release = await this.program.account.release.fetch(
        releasePublicKey
      );

      const [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        this.provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        release.paymentMint
      );

      const [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          this.provider.connection,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          release.releaseMint
        );

      const hub = await this.program.account.hub.fetch(hubPublicKey);

      const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-release")),
          hubPublicKey.toBuffer(),
          releasePublicKey.toBuffer(),
        ],
        this.program.programId
      );

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-content")),
          hubPublicKey.toBuffer(),
          releasePublicKey.toBuffer(),
        ],
        this.program.programId
      );

      const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-signer")),
          hubPublicKey.toBuffer(),
        ],
        this.program.programId
      );

      const [hubWallet] = await findOrCreateAssociatedTokenAccount(
        this.provider.connection,
        this.provider.wallet.publicKey,
        hubSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        release.paymentMint
      );

      const instructions = [];

      if (receiverReleaseTokenAccountIx) {
        instructions.push(receiverReleaseTokenAccountIx);
      }

      const tx = await this.program.methods
        .releasePurchaseViaHub(
          release.price,
          decodeNonEncryptedByteArray(hub.handle)
        )
        .accounts({
          payer: this.provider.wallet.publicKey,
          receiver: this.provider.wallet.publicKey,
          release: releasePublicKey,
          releaseSigner: release.releaseSigner,
          payerTokenAccount,
          receiverReleaseTokenAccount,
          royaltyTokenAccount: release.royaltyTokenAccount,
          releaseMint: release.releaseMint,
          hub: hubPublicKey,
          hubRelease,
          hubContent,
          hubSigner,
          hubWallet,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions)
        .transaction();

      tx.recentBlockhash = (
        await this.provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = this.provider.wallet.publicKey;

      const txid = await this.provider.wallet.sendTransaction(
        tx,
        this.provider.connection
      );

      await getConfirmTransaction(txid, this.provider.connection);
      await axios.get(
        `${
          this.http.endpoint
        }/accounts/${this.provider.wallet.publicKey.toBase58()}/collected?txId=${txid}`
      );
      const newRelease = await fetch(releasePublicKey.toBase58(), true);

      return {
        release: newRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   *
   * @function releasePurchase
   * @description Purchases a Release outside of a Hub.
   * @param {Object} client - The Nina Client instance.
   * @param {String} releasePublicKey - The public key of the Release being purchased.
   * @example await NinaClient.Releases.releasePurchase(ninaClient, "DDiezQSSNWF1XxKfhJv4YqB2y4xGYzCDVvVYU46wHhKW");
   * @returns {String} the Release that was Purchased.
   */

  async releasePurchase(releasePublicKey) {
    try {
      const { provider } = this.client;
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);

      const release = await this.program.account.release.fetch(
        releasePublicKey
      );

      // if (release.price.toNumber === 0) {
      //   const message = new TextEncoder().encode(releasePublicKey.toBase58());
      //   const messageBase64 = encodeBase64(message);
      //   const signature = await provider.wallet.sign(message);
      //   const signatureBase64 = encodeBase64(signature);

      //   const response = await axios.get(
      //     `${
      //       process.env.NINA_IDENTITY_ENDPOINT
      //     }/collect/${releasePublicKey.toBase58()}?message=${encodeURIComponent(
      //       messageBase64
      //     )}&signature=${encodeURIComponent(
      //       signatureBase64
      //     )}&publicKey=${encodeURIComponent(
      //       provider.wallet.publicKey.toBase58()
      //     )}`
      //   );

      //   return response.data.txid;
      // }

      let [payerTokenAccount] = await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        release.paymentMint
      );

      const [receiverReleaseTokenAccount, receiverReleaseTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          release.releaseMint
        );

      const instructions = [];

      if (receiverReleaseTokenAccountIx) {
        instructions.push({
          instructions: [receiverReleaseTokenAccountIx],
          cleanupInstructions: [],
          signers: [],
        });
      }

      if (isSol(release.paymentMint, this.cluster)) {
        const [wrappedSolAccount, wrappedSolInstructions] = await wrapSol(
          provider,
          release.price,
          release.paymentMint
        );

        instructions.push(...wrappedSolInstructions);
        payerTokenAccount = wrappedSolAccount;
      }

      const tx = await this.program.methods
        .releasePurchase(release.price)
        .accounts({
          payer: provider.wallet.publicKey,
          receiver: provider.wallet.publicKey,
          release: releasePublicKey,
          releaseSigner: release.releaseSigner,
          payerTokenAccount,
          receiverReleaseTokenAccount,
          royaltyTokenAccount: release.royaltyTokenAccount,
          releaseMint: release.releaseMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions || [])
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      await axios.get(
        `${
          this.http.endpoint
        }/accounts/${provider.wallet.publicKey.toBase58()}/collected?txId=${txid}`
      );
      const newRelease = await fetch(releasePublicKey.toBase58(), true);

      return {
        release: newRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   *
   * @function releaseInitViaHub
   * @description Initializes and creates a Release via a Hub. Once a Release is created, it will surface to the Hub that it was initalized to and can be listened to or purchased.
   * @param {Object} client - The Nina Client instance.
   * @param {String} hubPublicKey - The public key of the Hub that the Release will belong to.
   * @param {Number} retailPrice - The retail price of the Release.
   * @param {Number} amount - The number of editions available for a Release.
   * @param {Number} resalePercentage - The resale percentage of the Release. When a Release is resold on an Exchange, the authority of the Release receives this percentage of the resale price.
   * @param {String} artist - The name of the artist for the Release.
   * @param {String} title - The title of the Release.
   * @param {String} catalogNumber - The catalog number of the Release. Similar to the categorical system that record labels use i.e. NINA001.
   * @param {String} metadataUri - The Arweave URI of the Release.
   * @param {Boolean} isUsdc - A boolean determining wether the Release priced in USDC or not.
   * @param {String} release - The initialization of the Release via initializeReleaseAndMint().
   * @param {String} releaseBump - The Release bump of the Release.
   * @param {String} releaseMint - The Release mint of the Release.
   * @param {Boolean} isOpen - A boolean determining if the Release is open or not. If a Release is open, the Release will have an unlimited number of editions.
   * @example const release = await NinaClient.Releases.releaseInitViaHub(ninaClient, 'H2BdseAHX3tEjxXKtLREEsJsf8Y2zZxz8679MBGNPEC4', 10, 100, 20, "dBridge", "Pantheon", "TRUETO004", "https://arweave.net/797hCskMy6lndMc4rN7ovp7NfNsDCJhNdKaCSrl_G0U", true, release, releaseBump, releaseMint, false);
   * @returns {Object} the created Release.
   */

  async releaseInitViaHub(
    hubPublicKey,
    retailPrice,
    amount,
    resalePercentage,
    metadataUri,
    artist,
    title,
    catalogNumber,
    release,
    releaseBump,
    releaseMint,
    isOpen,
    isUsdc = true
  ) {
    try {
      const { provider } = this.client;
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);
      const hub = await this.program.account.hub.fetch(hubPublicKey);

      const paymentMint = new anchor.web3.PublicKey(
        isUsdc ? this.ids.mints.usdc : this.ids.mints.wsol
      );

      const [releaseSigner, releaseSignerBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [release.toBuffer()],
          this.program.programId
        );

      const releaseMintIx = await createMintInstructions(
        provider,
        provider.wallet.publicKey,
        releaseMint.publicKey,
        0
      );

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          paymentMint
        );

      const [royaltyTokenAccount, royaltyTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          releaseSigner,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          paymentMint,
          true
        );

      const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-collaborator")),
          hubPublicKey.toBuffer(),
          provider.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );

      const [hubSigner] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-signer")),
          hubPublicKey.toBuffer(),
        ],
        this.program.programId
      );

      const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-release")),
          hubPublicKey.toBuffer(),
          release.toBuffer(),
        ],
        this.program.programId
      );

      const [hubContent] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-content")),
          hubPublicKey.toBuffer(),
          release.toBuffer(),
        ],
        this.program.programId
      );

      const [hubWallet] = await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        hubSigner,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        paymentMint
      );

      const instructions = [...releaseMintIx, royaltyTokenAccountIx];

      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx);
      }

      const editionAmount = isOpen ? MAX_INT : amount;

      const config = {
        amountTotalSupply: new anchor.BN(editionAmount),
        amountToArtistTokenAccount: new anchor.BN(0),
        amountToVaultTokenAccount: new anchor.BN(0),
        resalePercentage: new anchor.BN(resalePercentage * 10000),
        price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
        releaseDatetime: new anchor.BN(Date.now() / 1000),
      };

      const bumps = {
        release: releaseBump,
        signer: releaseSignerBump,
      };

      const metadataProgram = new anchor.web3.PublicKey(
        this.ids.programs.metaplex
      );

      const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          metadataProgram.toBuffer(),
          releaseMint.publicKey.toBuffer(),
        ],
        metadataProgram
      );

      const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32));
      const nameBufString = nameBuf.slice(0, 32).toString();
      const symbolBuf = Buffer.from(catalogNumber.substring(0, 10));
      const symbolBufString = symbolBuf.slice(0, 10).toString();

      const metadataData = {
        name: nameBufString,
        symbol: symbolBufString,
        uri: metadataUri,
        sellerFeeBasisPoints: resalePercentage * 100,
      };

      const tx = await this.program.methods
        .releaseInitViaHub(
          config,
          bumps,
          metadataData,
          decodeNonEncryptedByteArray(hub.handle)
        )
        .accounts({
          authority: provider.wallet.publicKey,
          release,
          releaseSigner,
          hubCollaborator,
          hub: hubPublicKey,
          hubRelease,
          hubContent,
          hubSigner,
          hubWallet,
          releaseMint: releaseMint.publicKey,
          authorityTokenAccount,
          paymentMint,
          royaltyTokenAccount,
          tokenProgram: new anchor.web3.PublicKey(
            anchor.utils.token.TOKEN_PROGRAM_ID
          ),
          metadata,
          metadataProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .preInstructions(instructions)
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;
      tx.partialSign(releaseMint);

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      const createdRelease = await fetch(release);

      return {
        release: createdRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   * @function initializeReleaseAndMint
   * @description Initializes a release and mints the first edition.
   * @param {Object} client - The Nina Client instance.
   * @param {String} hubPublicKey - The public key of the Hub that the Release will be initialized to, if applicable.
   * @example await NinaClient.Releases.initializeReleaseAndMint(ninaClient, "2CMyS4k6HQvLVdA2DxB6em3izhNw7uq2hzX7E4f7UJ3f");
   * @returns {Object} the Release, Release bump, Release mint, and Hub Release.
   */

  async initializeReleaseAndMint(hubPublicKey) {
    try {
      const releaseMint = anchor.web3.Keypair.generate();

      const [release, releaseBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode("nina-release")),
            releaseMint.publicKey.toBuffer(),
          ],
          this.program.programId
        );

      let hubRelease;

      if (hubPublicKey) {
        const [_hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-release")),
            new anchor.web3.PublicKey(hubPublicKey).toBuffer(),
            release.toBuffer(),
          ],
          this.program.programId
        );

        hubRelease = _hubRelease;
      }

      return {
        release,
        releaseBump,
        releaseMint,
        hubRelease,
      };
    } catch (error) {
      console.warn(error);

      return false;
    }
  }

  /**
   *
   * @function releaseInit
   * @description Initializes and creates a Release without a Hub. Once a Release is created, it can be listened to or purchased.
   * @param {Number} retailPrice - The retail price of the Release.
   * @param {Number} amount - The number of editions available for a Release.
   * @param {Number} resalePercentage - The resale percentage of the Release. When a Release is resold on an Exchange, the authority of the Release receives this percentage of the resale price.
   * @param {String} artist - The name of the artist for the Release.
   * @param {String} title - The title of the Release.
   * @param {String} catalogNumber - The catalog number of the Release. Similar to the categorical system that record labels use i.e. NINA001.
   * @param {String} metadataUri - The Arweave URI of the Metadata JSON for the Release.
   * @param {Boolean} isUsdc - A boolean determining wether the Release priced in USDC or not.
   * @param {String} release - The PDA derived from releaseMint that will become the Release Account via initializeReleaseAndMint().
   * @param {String} releaseBump - The Release bump from Release PDA.
   * @param {String} releaseMint - The Release mint of the Release.
   * @param {Boolean} isOpen - A boolean determining if the Release is open or not. If a Release is open, the Release will have an unlimited number of editions.
   * @example const release = await NinaClient.Releases.releaseInit(ninaClient, 10, 100, 20, "dBridge", "Pantheon", "TRUETO004", "https://arweave.net/797hCskMy6lndMc4rN7ovp7NfNsDCJhNdKaCSrl_G0U", true, release, releaseBump, releaseMint, false);
   * @returns {Object} the created Release.
   */

  async releaseInit(
    retailPrice,
    amount,
    resalePercentage,
    artist,
    title,
    catalogNumber,
    metadataUri,
    release,
    releaseBump,
    releaseMint,
    isOpen,
    isUsdc = true
  ) {
    try {
      const { provider } = this.client;

      const paymentMint = new anchor.web3.PublicKey(
        isUsdc ? this.ids.mints.usdc : this.ids.mints.wsol
      );

      const [releaseSigner, releaseSignerBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [release.toBuffer()],
          this.program.programId
        );

      const releaseMintIx = await createMintInstructions(
        provider,
        provider.wallet.publicKey,
        releaseMint.publicKey,
        0
      );

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          paymentMint
        );

      const [royaltyTokenAccount, royaltyTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          releaseSigner,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          paymentMint,
          true
        );

      const instructions = [...releaseMintIx, royaltyTokenAccountIx];

      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx);
      }

      const now = new Date();
      const editionAmount = isOpen ? MAX_INT : amount;

      const config = {
        amountTotalSupply: new anchor.BN(editionAmount),
        amountToArtistTokenAccount: new anchor.BN(0),
        amountToVaultTokenAccount: new anchor.BN(0),
        resalePercentage: new anchor.BN(resalePercentage * 10000),
        price: new anchor.BN(uiToNative(retailPrice, paymentMint)),
        releaseDatetime: new anchor.BN(now.getTime() / 1000),
      };

      const metadataProgram = new anchor.web3.PublicKey(
        this.ids.programs.metaplex
      );

      const [metadata] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          metadataProgram.toBuffer(),
          releaseMint.publicKey.toBuffer(),
        ],
        metadataProgram
      );

      const nameBuf = Buffer.from(`${artist} - ${title}`.substring(0, 32));
      const nameBufString = nameBuf.slice(0, 32).toString();
      const symbolBuf = Buffer.from(catalogNumber.substring(0, 10));
      const symbolBufString = symbolBuf.slice(0, 10).toString();

      const metadataData = {
        name: nameBufString,
        symbol: symbolBufString,
        uri: metadataUri,
        sellerFeeBasisPoints: resalePercentage * 100,
      };

      const bumps = {
        release: releaseBump,
        signer: releaseSignerBump,
      };

      const tx = await this.program.methods
        .releaseInit(config, bumps, metadataData)
        .accounts({
          release,
          releaseSigner,
          releaseMint: releaseMint.publicKey,
          payer: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          authorityTokenAccount,
          paymentMint,
          royaltyTokenAccount,
          metadata,
          metadataProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .preInstructions(instructions)
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;
      tx.partialSign(releaseMint);

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);

      const createdRelease = await fetch(release.toBase58());

      return {
        release: createdRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   * @function closeRelease
   * @description Sets the remaining amount of a Release to 0. After this is called, the Release is no longer for sale.
   * @param {String} releasePublicKey - The public key of the Release being closed.
   * @example await NinaClient.Releases.closeRelease(ninaClient, "f9mMsu26rtMtH55zR31rHABZkkeRwTLuGhKMXZdwG9z");
   * @returns {Object} The data of the closed Release.
   */

  async closeRelease(releasePublicKey) {
    try {
      const { provider } = this.client;

      const release = await this.program.account.release.fetch(
        new anchor.web3.PublicKey(releasePublicKey)
      );

      const tx = await this.program.methods
        .releaseCloseEdition()
        .accounts({
          authority: provider.wallet.publicKey,
          release: new anchor.web3.PublicKey(releasePublicKey),
          releaseSigner: release.releaseSigner,
          releaseMint: release.releaseMint,
        })
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      const closedRelease = await fetch(releasePublicKey);

      return {
        release: closedRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   * @function collectRoyaltyForRelease
   * @description Collects the royalty for a Release. Royalties can be in the form of sales on a Release page, or from a Release being resold on an Exchange.
   * @param {String} recipient - The public key of the recipient receiving the royalty.
   * @param {String} releasePublicKey - The public key of the Release.
   * @example collectRoyaltyForRelease(ninaClient, "52xYtQzDaxeTGcz3WD37mAJgqVFAzR72EnGYaSHab5DQ", "HYCQ2Nk1CuMSLyusY7yYrQ3Zp221S3UnzNwSuXYmUWy7")
   * @returns {Object} the Release with Account data.
   */

  async collectRoyaltyForRelease(recipient, releasePublicKey) {
    if (!releasePublicKey || !recipient) {
      return;
    }

    try {
      const { provider } = this.client;

      const release = await this.program.account.release.fetch(
        new anchor.web3.PublicKey(releasePublicKey)
      );

      release.paymentMint = new anchor.web3.PublicKey(release.paymentMint);

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          release.paymentMint
        );

      let instructions;

      if (authorityTokenAccountIx) {
        instructions = [authorityTokenAccountIx];
      }

      const tx = await this.program.methods
        .releaseRevenueShareCollect()
        .accounts({
          authority: provider.wallet.publicKey,
          authorityTokenAccount,
          release: new anchor.web3.PublicKey(releasePublicKey),
          releaseMint: release.releaseMint,
          releaseSigner: release.releaseSigner,
          royaltyTokenAccount: release.royaltyTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .preInstructions(instructions || [])
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      const collectedRelease = await fetch(releasePublicKey, true);

      return {
        release: collectedRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   * @function collectRoyaltyForReleaseViaHub
   * @description Collects royalties on a release via Hub Dashboard.
   * @param {Object} client - The Nina Client.
   * @param {String} releasePublicKey - The public key of the Release.
   * @param {String} hubPublicKey - The public key of the Hub.
   * @example const royalty = await NinaClient.Hub.collectRoyaltyForReleaseViaHub(ninaClient, releasePublicKey, hubPublicKey);
   * @returns { Object } the Hub Release.
   */

  async collectRoyaltyForReleaseViaHub(client, releasePublicKey, hubPublicKey) {
    try {
      const { provider } = client;
      const program = await client.useProgram();
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);
      hubPublicKey = new anchor.web3.PublicKey(hubPublicKey);

      const hub = await program.account.hub.fetch(hubPublicKey);
      const release = await program.account.release.fetch(releasePublicKey);
      const hubMetadata = await fetch(hubPublicKey);

      const [hubWallet] = await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        new anchor.web3.PublicKey(hub.hubSigner),
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        release.paymentMint
      );

      const [hubRelease] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("nina-hub-release")),
          hubPublicKey.toBuffer(),
          releasePublicKey.toBuffer(),
        ],
        program.programId
      );

      const tx = await program.methods
        .releaseRevenueShareCollectViaHub(hubMetadata.hub.handle)
        .accounts({
          authority: provider.wallet.publicKey,
          royaltyTokenAccount: release.royaltyTokenAccount,
          release: releasePublicKey,
          releaseSigner: release.releaseSigner,
          releaseMint: release.releaseMint,
          hub: hubPublicKey,
          hubRelease,
          hubSigner: hub.hubSigner,
          hubWallet,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      // fetchHubRelease not returning account data so using Release.fetch for now
      const releaseAccount = await fetch(releasePublicKey.toBase58(), true);

      return {
        release: releaseAccount,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }

  /**
   * @function addRoyaltyRecipient
   * @description Adds a royalty recipient to a Release. Royalty recipients are paid out their percentage when a Release is purchased or resold on an Exchange.
   * @param {String} recipientAddress - The public key of the royalty recipient.
   * @param {Number} percentShare - The percentage of the royalties of a Release that the recipient will receive. For example, if the percentage is 50, the recipient will receive 50% of the royalties from the sale of a Release or Exchange.
   * @param {String} releasePublicKey - The public key of the Release.
   * @example await NinaClient.Releases.addRoyaltyRecipient(ninaClient, "8sFiVz6kemckYUKRr9CRLuM8Pvkq4Lpvkx2mH3jPgGRX", 50, "HYCQ2Nk1CuMSLyusY7yYrQ3Zp221S3UnzNwSuXYmUWy7")
   * @returns {Object} the Release with Account data.
   */

  async addRoyaltyRecipient(recipientAddress, percentShare, releasePublicKey) {
    try {
      const { provider } = this.client;
      releasePublicKey = new anchor.web3.PublicKey(releasePublicKey);

      const release = await this.programprogram.account.release.fetch(
        releasePublicKey
      );

      const recipientPublicKey = new anchor.web3.PublicKey(recipientAddress);
      const updateAmount = percentShare * 10000;
      const instructions = [];

      const [
        newRoyaltyRecipientTokenAccount,
        newRoyaltyRecipientTokenAccountIx,
      ] = await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        recipientPublicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        new anchor.web3.PublicKey(release.paymentMint)
      );

      const [authorityTokenAccount, authorityTokenAccountIx] =
        await findOrCreateAssociatedTokenAccount(
          provider.connection,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          anchor.web3.SystemProgram.programId,
          anchor.web3.SYSVAR_RENT_PUBKEY,
          new anchor.web3.PublicKey(release.paymentMint)
        );

      if (newRoyaltyRecipientTokenAccountIx) {
        instructions.push(newRoyaltyRecipientTokenAccountIx);
      }

      if (authorityTokenAccountIx) {
        instructions.push(authorityTokenAccountIx);
      }

      const tx = await this.program.methods
        .releaseRevenueShareTransfer(new anchor.BN(updateAmount))
        .accounts({
          authority: provider.wallet.publicKey,
          authorityTokenAccount,
          release: releasePublicKey,
          releaseMint: new anchor.web3.PublicKey(release.releaseMint),
          releaseSigner: new anchor.web3.PublicKey(release.releaseSigner),
          royaltyTokenAccount: release.royaltyTokenAccount,
          newRoyaltyRecipient: recipientPublicKey,
          newRoyaltyRecipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .preInstructions(instructions)
        .transaction();

      tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash()
      ).blockhash;
      tx.feePayer = provider.wallet.publicKey;

      const txid = await provider.wallet.sendTransaction(
        tx,
        provider.connection
      );

      await getConfirmTransaction(txid, provider.connection);
      const updatedRelease = await fetch(releasePublicKey, true);

      return {
        release: updatedRelease,
      };
    } catch (error) {
      console.warn(error);

      return {
        error,
      };
    }
  }
}
