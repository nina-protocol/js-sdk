import { decodeNonEncryptedByteArray, MAX_U64 } from "./utils";

export default class Formatter {
  static parseHubPostAccountData(hubPost, publicKey) {
    hubPost.publicKey = publicKey.toBase58();
    hubPost.hub = hubPost.hub.toBase58();
    hubPost.post = hubPost.post.toBase58();
    hubPost.referenceContent = hubPost.referenceContent?.toBase58() || undefined;
    hubPost.referenceContentType = Object.keys(hubPost.referenceContentType)[0];
    hubPost.versionUri = decodeNonEncryptedByteArray(hubPost.versionUri);
    return hubPost;
  }

  static parseHubReleaseAccountData(hubRelease, publicKey) {
    hubRelease.publicKey = publicKey.toBase58();
    hubRelease.hub = hubRelease.hub.toBase58();
    hubRelease.release = hubRelease.release.toBase58();
    hubRelease.sales = hubRelease.sales.toNumber();
    return hubRelease;
  }

  static parseHubContentAccountData(hubContent, publicKey) {
    hubContent.publicKey = typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
    hubContent.hub = hubContent.hub.toBase58();
    hubContent.addedBy = hubContent.addedBy.toBase58();
    hubContent.child = hubContent.child.toBase58();
    hubContent.contentType = Object.keys(hubContent.contentType)[0];
    hubContent.datetime = hubContent.datetime.toNumber() * 1000;
    hubContent.repostedFromHub = hubContent.repostedFromHub.toBase58();
    return hubContent;
  }

  static parseHubCollaboratorAccountData(hubCollaborator, publicKey) {
    hubCollaborator.publicKey = publicKey;
    hubCollaborator.hub = hubCollaborator.hub.toBase58();
    hubCollaborator.collaborator = hubCollaborator.collaborator.toBase58();
    hubCollaborator.addedBy = hubCollaborator.addedBy.toBase58();
    hubCollaborator.datetime = hubCollaborator.datetime.toNumber() * 1000;
    return hubCollaborator;
  }

  static parsePostAccountData(post) {
    post.author = post.author.toBase58();
    post.createdAt = post.createdAt * 1000;
    post.slug = decodeNonEncryptedByteArray(post.slug);
    post.updatedAt = post.updatedAt * 1000;
    post.uri = decodeNonEncryptedByteArray(post.uri);
    return post;
  }

  static parseExchangeAccountData(exchange) {
    exchange.initializer = exchange.initializer.toBase58();
    exchange.release = exchange.release.toBase58();
    exchange.releaseMint = exchange.releaseMint.toBase58();
    exchange.initializerExpectedTokenAccount = exchange.initializerExpectedTokenAccount.toBase58();
    exchange.initializerSendingTokenAccount = exchange.initializerSendingTokenAccount.toBase58();
    exchange.initializerSendingMint = exchange.initializerSendingMint.toBase58();
    exchange.initializerExpectedMint = exchange.initializerExpectedMint.toBase58();
    exchange.exchangeSigner = exchange.exchangeSigner.toBase58();
    exchange.exchangeEscrowTokenAccount = exchange.exchangeEscrowTokenAccount.toBase58();
    exchange.expectedAmount = exchange.expectedAmount.toNumber();
    exchange.initializerAmount = exchange.initializerAmount.toNumber();
    exchange.isSelling = exchange.isSelling;
    exchange.bump = exchange.bump;
    return exchange;
  }

  static parseHubAccountData(hub) {
    hub.authority = hub.authority.toBase58();
    hub.datetime = hub.datetime.toNumber() * 1000;
    hub.handle = decodeNonEncryptedByteArray(hub.handle);
    hub.hubSigner = hub.hubSigner.toBase58();
    hub.publishFee = hub.publishFee.toNumber();
    hub.referralFee = hub.referralFee.toNumber();
    hub.totalFeesEarned = hub.totalFeesEarned.toNumber();
    hub.uri = decodeNonEncryptedByteArray(hub.uri);
    return hub;
  }

  static parseReleaseAccountData(release) {
    release.authority = release.authority.toBase58();
    release.exchangeSaleCounter = release.exchangeSaleCounter.toNumber();
    release.exchangeSaleTotal = release.exchangeSaleTotal.toNumber();
    release.payer = release.payer.toBase58();
    release.paymentMint = release.paymentMint.toBase58();
    release.price = release.price.toNumber();
    release.releaseMint = release.releaseMint.toBase58();
    release.authorityTokenAccount = release.authorityTokenAccount?.toBase58() || null;
    release.releaseSigner = release.releaseSigner.toBase58();
    release.resalePercentage = release.resalePercentage.toNumber();
    release.releaseDatetime = release.releaseDatetime.toNumber() * 1000;
    release.revenueShareRecipients = release.royaltyRecipients.map((recipient) => {
      recipient.collected = recipient.collected.toNumber();
      recipient.owed = recipient.owed.toNumber();
      recipient.percentShare = recipient.percentShare.toNumber();
      recipient.recipientAuthority = recipient.recipientAuthority.toBase58();
      recipient.recipientTokenAccount = recipient.recipientTokenAccount.toBase58();
      return recipient;
    });
    delete release.royaltyRecipients;
    release.royaltyTokenAccount = release.royaltyTokenAccount.toBase58();
    release.saleCounter = release.saleCounter.toNumber();
    release.saleTotal = release.saleTotal.toNumber();
    if (release.totalSupply.toString() === MAX_U64) {
      release.editionType = 'open';
      release.remainingSupply = -1;
      release.totalSupply = -1;
    } else {
      release.editionType = 'limited';
      release.remainingSupply = release.remainingSupply.toNumber();
      release.totalSupply = release.totalSupply.toNumber();
    }
    release.totalCollected = release.totalCollected.toNumber();
    release.head = release.head.toNumber();
    release.tail = release.tail.toNumber();

    return release;
  }
}